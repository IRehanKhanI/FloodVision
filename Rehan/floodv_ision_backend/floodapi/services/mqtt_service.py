"""
MQTT Service - Sensor Data Ingestion.

Connects to an MQTT broker and subscribes to sensor data topics.
Parses incoming JSON payloads, stores SensorReading records, and
creates FloodAlerts when water levels exceed thresholds.
"""

from __future__ import annotations

import json
import logging
import os
import threading
import time
from typing import Any

logger = logging.getLogger(__name__)

# Water level thresholds (centimeters)
CRITICAL_WATER_LEVEL_CM = 100
WARNING_WATER_LEVEL_CM = 60


class MQTTService:
    """
    MQTT client service for ingesting sensor data.

    Subscribes to 'floodvision/sensors/+/data' and processes
    incoming readings from IoT sensor nodes.
    """

    def __init__(self) -> None:
        self._client = None
        self._thread: threading.Thread | None = None
        self._running = False
        self._broker_host = os.environ.get('MQTT_BROKER_HOST', 'localhost')
        self._broker_port = int(os.environ.get('MQTT_BROKER_PORT', '1883'))

    def _on_connect(self, client: Any, userdata: Any, flags: Any, rc: int, properties: Any = None) -> None:
        """Handle MQTT connection established."""
        if rc == 0:
            logger.info(f"Connected to MQTT broker at {self._broker_host}:{self._broker_port}")
            client.subscribe('floodvision/sensors/+/data')
            logger.info("Subscribed to floodvision/sensors/+/data")
        else:
            logger.error(f"MQTT connection failed with code {rc}")

    def _on_disconnect(self, client: Any, userdata: Any, rc: int, properties: Any = None) -> None:
        """Handle MQTT disconnection."""
        if rc != 0:
            logger.warning(f"Unexpected MQTT disconnection (code {rc})")

    def _on_message(self, client: Any, userdata: Any, msg: Any) -> None:
        """Process incoming MQTT message from a sensor."""
        try:
            payload = json.loads(msg.payload.decode('utf-8'))
            self._process_sensor_data(payload)
        except json.JSONDecodeError:
            logger.error(f"Invalid JSON in MQTT message on {msg.topic}")
        except Exception as e:
            logger.error(f"Error processing MQTT message: {e}")

    def _process_sensor_data(self, data: dict[str, Any]) -> None:
        """
        Store sensor reading and create alerts if thresholds are exceeded.

        Expected payload format:
        {
            "node_id": "SN-402",
            "water_level_cm": 45.2,
            "temperature": 28.5,
            "rssi": -67
        }
        """
        import django
        django.setup()
        from django.utils import timezone
        from floodapi.models import FloodAlert, SensorNode, SensorReading

        node_id = data.get('node_id')
        water_level = data.get('water_level_cm')

        if not node_id or water_level is None:
            logger.warning(f"Missing required fields in sensor data: {data}")
            return

        # Get or register sensor
        try:
            sensor = SensorNode.objects.get(node_id=node_id)
        except SensorNode.DoesNotExist:
            lat = data.get('lat') or data.get('latitude')
            lng = data.get('lng') or data.get('longitude')
            if lat is None or lng is None:
                logger.warning(f"Unknown sensor node without coordinates: {node_id}")
                return

            sensor = SensorNode.objects.create(
                node_id=node_id,
                name=data.get('name', node_id),
                location=data.get('location', ''),
                lat=float(lat),
                lng=float(lng),
                is_active=True,
                last_seen=timezone.now(),
            )
            logger.info(f"Registered new sensor node: {node_id}")

        # Update sensor last_seen
        sensor.last_seen = timezone.now()
        sensor.is_active = True
        sensor.save(update_fields=['last_seen', 'is_active'])

        # Create reading
        reading = SensorReading.objects.create(
            sensor=sensor,
            water_level_cm=water_level,
            temperature=data.get('temperature'),
            rssi=data.get('rssi'),
            flow_rate=data.get('flow_rate'),
        )
        logger.info(f"Stored reading from {node_id}: {water_level}cm")

        # Check thresholds and create alerts
        if water_level >= CRITICAL_WATER_LEVEL_CM:
            FloodAlert.objects.create(
                sensor=sensor,
                severity='critical',
                message=(
                    f"CRITICAL: Water level at {node_id} ({sensor.name}) has reached "
                    f"{water_level}cm - exceeds critical threshold of {CRITICAL_WATER_LEVEL_CM}cm. "
                    f"Immediate action required."
                ),
            )
            logger.warning(f"CRITICAL alert created for {node_id}: {water_level}cm")

            # Send WebSocket notification
            self._broadcast_alert(sensor, water_level, 'critical')

        elif water_level >= WARNING_WATER_LEVEL_CM:
            FloodAlert.objects.create(
                sensor=sensor,
                severity='warning',
                message=(
                    f"WARNING: Water level at {node_id} ({sensor.name}) has reached "
                    f"{water_level}cm - exceeds warning threshold of {WARNING_WATER_LEVEL_CM}cm. "
                    f"Monitor closely."
                ),
            )
            logger.info(f"Warning alert created for {node_id}: {water_level}cm")
            self._broadcast_alert(sensor, water_level, 'warning')

        # Broadcast sensor data to WebSocket clients
        self._broadcast_sensor_update(sensor, reading)

    def _broadcast_sensor_update(self, sensor: Any, reading: Any) -> None:
        """Send sensor update to WebSocket group."""
        try:
            from asgiref.sync import async_to_sync
            from channels.layers import get_channel_layer

            channel_layer = get_channel_layer()
            if channel_layer:
                async_to_sync(channel_layer.group_send)(
                    'sensor_updates',
                    {
                        'type': 'sensor.update',
                        'data': {
                            'node_id': sensor.node_id,
                            'name': sensor.name,
                            'water_level_cm': reading.water_level_cm,
                            'temperature': reading.temperature,
                            'rssi': reading.rssi,
                            'timestamp': reading.timestamp.isoformat(),
                        },
                    },
                )
        except Exception as e:
            logger.debug(f"WebSocket broadcast skipped: {e}")

    def _broadcast_alert(self, sensor: Any, water_level: float, severity: str) -> None:
        """Send alert to WebSocket group."""
        try:
            from asgiref.sync import async_to_sync
            from channels.layers import get_channel_layer

            channel_layer = get_channel_layer()
            if channel_layer:
                async_to_sync(channel_layer.group_send)(
                    'alert_updates',
                    {
                        'type': 'alert.new',
                        'data': {
                            'node_id': sensor.node_id,
                            'name': sensor.name,
                            'water_level_cm': water_level,
                            'severity': severity,
                        },
                    },
                )
        except Exception as e:
            logger.debug(f"WebSocket alert broadcast skipped: {e}")

    def start(self) -> None:
        """Start the MQTT client in a background thread."""
        if self._running:
            logger.info("MQTT service is already running")
            return

        try:
            import paho.mqtt.client as mqtt

            self._client = mqtt.Client(
                mqtt.CallbackAPIVersion.VERSION2,
                client_id='floodvision-backend',
            )
            self._client.on_connect = self._on_connect
            self._client.on_disconnect = self._on_disconnect
            self._client.on_message = self._on_message

            # Try connecting a few times before giving up (configurable via env)
            retries = int(os.environ.get('MQTT_CONNECT_RETRIES', '3'))
            delay = float(os.environ.get('MQTT_CONNECT_RETRY_DELAY', '2'))
            connected = False
            last_exc = None
            for attempt in range(1, retries + 1):
                try:
                    self._client.connect(self._broker_host, self._broker_port, keepalive=60)
                    connected = True
                    break
                except Exception as exc:
                    last_exc = exc
                    logger.warning(f"MQTT connection attempt {attempt}/{retries} failed: {exc}")
                    time.sleep(delay)

            if not connected:
                logger.warning(f"Could not connect to MQTT broker after {retries} attempts: {last_exc}")
                self._running = False
                return

            self._running = True
            self._client.loop_start()
            logger.info("MQTT service started")

        except ImportError:
            logger.warning("paho-mqtt not installed, MQTT service disabled")
        except Exception as e:
            logger.warning(f"Could not connect to MQTT broker: {e}")
            self._running = False

    def stop(self) -> None:
        """Stop the MQTT client gracefully."""
        if self._client and self._running:
            self._running = False
            self._client.loop_stop()
            self._client.disconnect()
            logger.info("MQTT service stopped")


# Module-level singleton
_mqtt_service: MQTTService | None = None


def get_mqtt_service() -> MQTTService:
    """Get or create the singleton MQTT service instance."""
    global _mqtt_service
    if _mqtt_service is None:
        _mqtt_service = MQTTService()
    return _mqtt_service
