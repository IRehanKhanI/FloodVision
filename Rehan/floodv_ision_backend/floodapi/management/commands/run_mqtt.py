"""Run the MQTT listener for ESP32 sensor data."""

import os
import time

from django.core.management.base import BaseCommand

from floodapi.services.mqtt_service import get_mqtt_service


class Command(BaseCommand):
    help = 'Run the FloodVision MQTT listener (Ctrl+C to stop)'

    def handle(self, *args, **options):
        service = get_mqtt_service()
        service.start()

        # If the service failed to start (e.g., no broker reachable), show a helpful error.
        if not getattr(service, '_running', False):
            host = os.environ.get('MQTT_BROKER_HOST', 'localhost')
            port = os.environ.get('MQTT_BROKER_PORT', '1883')
            self.stdout.write(self.style.ERROR(
                f"MQTT service failed to start. Could not connect to broker at {host}:{port}.\n"
                "Start a local MQTT broker (e.g., Mosquitto) or set MQTT_BROKER_HOST/MQTT_BROKER_PORT to a reachable broker."
            ))
            return

        self.stdout.write(self.style.SUCCESS('MQTT service started. Listening for sensor data...'))

        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            self.stdout.write('\nStopping MQTT service...')
            service.stop()
            self.stdout.write(self.style.SUCCESS('MQTT service stopped.'))
