"""
Django Channels WebSocket consumers for real-time data.

SensorDataConsumer: streams sensor readings to connected clients.
AlertConsumer: streams flood alerts to connected clients.
"""

from __future__ import annotations

import json
import logging
from typing import Any

from channels.generic.websocket import AsyncWebSocketConsumer

logger = logging.getLogger(__name__)


class SensorDataConsumer(AsyncWebSocketConsumer):
    """
    WebSocket consumer for real-time sensor data updates.

    Clients connect to ws/sensors/ to receive live sensor readings.
    Clients can also send messages to request data for a specific sensor.
    """

    async def connect(self) -> None:
        """Accept connection and add to sensor_updates group."""
        self.group_name = 'sensor_updates'
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        logger.info(f"WebSocket client connected to sensor updates: {self.channel_name}")

    async def disconnect(self, close_code: int) -> None:
        """Remove from sensor_updates group on disconnect."""
        await self.channel_layer.group_discard(self.group_name, self.channel_name)
        logger.info(f"WebSocket client disconnected from sensor updates: {self.channel_name}")

    async def receive(self, text_data: str = '', bytes_data: bytes = b'') -> None:
        """
        Handle incoming messages from clients.

        Clients can send {"action": "get_sensor", "node_id": "SN-402"}
        to request current data for a specific sensor.
        """
        if not text_data:
            return

        try:
            data = json.loads(text_data)
            action = data.get('action')

            if action == 'get_sensor':
                node_id = data.get('node_id')
                if node_id:
                    await self._send_sensor_data(node_id)
            elif action == 'ping':
                await self.send(text_data=json.dumps({'type': 'pong'}))

        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid JSON',
            }))

    async def _send_sensor_data(self, node_id: str) -> None:
        """Fetch and send current data for a specific sensor."""
        from channels.db import database_sync_to_async
        from floodapi.models import SensorNode

        @database_sync_to_async
        def get_sensor_data(nid: str) -> dict | None:
            try:
                sensor = SensorNode.objects.get(node_id=nid)
                reading = sensor.readings.order_by('-timestamp').first()
                result: dict[str, Any] = {
                    'node_id': sensor.node_id,
                    'name': sensor.name,
                    'location': sensor.location,
                    'is_active': sensor.is_active,
                    'lat': sensor.lat,
                    'lng': sensor.lng,
                }
                if reading:
                    result['latest_reading'] = {
                        'water_level_cm': reading.water_level_cm,
                        'temperature': reading.temperature,
                        'rssi': reading.rssi,
                        'timestamp': reading.timestamp.isoformat(),
                    }
                return result
            except SensorNode.DoesNotExist:
                return None

        sensor_data = await get_sensor_data(node_id)
        if sensor_data:
            await self.send(text_data=json.dumps({
                'type': 'sensor_data',
                'data': sensor_data,
            }))
        else:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': f'Sensor {node_id} not found',
            }))

    async def sensor_update(self, event: dict) -> None:
        """Handle sensor.update messages from the channel layer (broadcast)."""
        await self.send(text_data=json.dumps({
            'type': 'sensor_update',
            'data': event.get('data', {}),
        }))


class AlertConsumer(AsyncWebSocketConsumer):
    """
    WebSocket consumer for real-time flood alert notifications.

    Clients connect to ws/alerts/ to receive live alert updates.
    """

    async def connect(self) -> None:
        """Accept connection and add to alert_updates group."""
        self.group_name = 'alert_updates'
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        logger.info(f"WebSocket client connected to alert updates: {self.channel_name}")

        # Send current active alerts on connect
        await self._send_active_alerts()

    async def disconnect(self, close_code: int) -> None:
        """Remove from alert_updates group on disconnect."""
        await self.channel_layer.group_discard(self.group_name, self.channel_name)
        logger.info(f"WebSocket client disconnected from alert updates: {self.channel_name}")

    async def receive(self, text_data: str = '', bytes_data: bytes = b'') -> None:
        """Handle incoming messages from clients."""
        if not text_data:
            return

        try:
            data = json.loads(text_data)
            action = data.get('action')

            if action == 'get_active':
                await self._send_active_alerts()
            elif action == 'ping':
                await self.send(text_data=json.dumps({'type': 'pong'}))

        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid JSON',
            }))

    async def _send_active_alerts(self) -> None:
        """Fetch and send all active alerts."""
        from channels.db import database_sync_to_async
        from floodapi.models import FloodAlert

        @database_sync_to_async
        def get_active_alerts() -> list[dict]:
            alerts = FloodAlert.objects.filter(is_active=True)[:20]
            return [
                {
                    'id': alert.id,
                    'severity': alert.severity,
                    'message': alert.message,
                    'sensor_id': alert.sensor.node_id if alert.sensor else None,
                    'created_at': alert.created_at.isoformat(),
                }
                for alert in alerts
            ]

        alerts = await get_active_alerts()
        await self.send(text_data=json.dumps({
            'type': 'active_alerts',
            'data': alerts,
        }))

    async def alert_new(self, event: dict) -> None:
        """Handle alert.new messages from the channel layer (broadcast)."""
        await self.send(text_data=json.dumps({
            'type': 'new_alert',
            'data': event.get('data', {}),
        }))
