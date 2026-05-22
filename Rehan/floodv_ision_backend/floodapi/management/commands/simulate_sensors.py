"""Django management command to simulate sensor MQTT messages.

Usage:
  python manage.py simulate_sensors --broker <host> --port <port> --interval 5

Reads default broker/port from environment variables `MQTT_BROKER_HOST`/`MQTT_BROKER_PORT` if not passed.
"""

from django.core.management.base import BaseCommand
import json
import random
import time
import os

try:
    import paho.mqtt.client as mqtt
except Exception:  # pragma: no cover - conditional import
    mqtt = None


SENSORS = [
    {"node_id": "SN-402", "name": "Hindmata Underpass", "lat": 19.0330, "lng": 72.8438, "base_level": 45},
    {"node_id": "SN-219", "name": "Milan Subway", "lat": 19.0895, "lng": 72.8656, "base_level": 22},
    {"node_id": "SN-105", "name": "Andheri Subway", "lat": 19.1136, "lng": 72.8697, "base_level": 12},
    {"node_id": "SN-490", "name": "Bandra Skywalk", "lat": 19.0596, "lng": 72.8295, "base_level": 5},
]


class Command(BaseCommand):
    help = 'Simulate IoT sensor nodes and publish MQTT messages to a broker.'

    def add_arguments(self, parser):
        parser.add_argument('--broker', type=str, help='MQTT broker host', default=os.environ.get('MQTT_BROKER_HOST', 'localhost'))
        parser.add_argument('--port', type=int, help='MQTT broker port', default=int(os.environ.get('MQTT_BROKER_PORT', '1883')))
        parser.add_argument('--interval', type=float, help='Publish interval in seconds', default=5.0)

    def handle(self, *args, **options):
        if mqtt is None:
            self.stderr.write(self.style.ERROR('paho-mqtt is not installed. Install it into your environment to use this command.'))
            return

        broker = options['broker']
        port = options['port']
        interval = options['interval']

        client = mqtt.Client()

        try:
            client.connect(broker, port, 60)
        except Exception as exc:
            self.stderr.write(self.style.ERROR(f'Error connecting to broker {broker}:{port} - {exc}'))
            return

        client.loop_start()

        self.stdout.write(self.style.SUCCESS(f'Connected to MQTT broker at {broker}:{port}. Publishing every {interval}s'))

        current_levels = {s['node_id']: s['base_level'] for s in SENSORS}

        topic_template = os.environ.get('SIM_TOPIC_TEMPLATE', 'floodvision/sensors/{node_id}/data')

        try:
            while True:
                for sensor in SENSORS:
                    node_id = sensor['node_id']
                    change = random.uniform(-1, 2)
                    current_levels[node_id] = max(0, current_levels[node_id] + change)

                    payload = {
                        'node_id': node_id,
                        'name': sensor['name'],
                        'water_level_cm': round(current_levels[node_id], 1),
                        'temperature': round(random.uniform(26, 32), 1),
                        'rssi': random.randint(-85, -45),
                        'lat': sensor['lat'],
                        'lng': sensor['lng'],
                    }

                    topic = topic_template.format(node_id=node_id)
                    client.publish(topic, json.dumps(payload))
                    self.stdout.write(f'Published to {topic}: {payload["water_level_cm"]} cm')

                time.sleep(interval)
        except KeyboardInterrupt:
            self.stdout.write('\nStopping simulation...')
        finally:
            client.loop_stop()
            client.disconnect()
