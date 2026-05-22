"""
Management command to seed the database with sample data.

Creates sample FloodZones (Mumbai area), SensorNodes matching frontend
data, SensorReadings, WeatherData, FloodAlerts, and AIAnalysis records.
"""

import random
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from floodapi.models import (
    AIAnalysis,
    FloodAlert,
    FloodZone,
    RouteQuery,
    SensorNode,
    SensorReading,
    WeatherData,
)


class Command(BaseCommand):
    help = 'Seed the database with sample FloodVision data'

    def success(self, msg: str) -> None:
        self.stdout.write(self.style.SUCCESS(f'  ✓ {msg}'))

    def info(self, msg: str) -> None:
        self.stdout.write(self.style.HTTP_INFO(f'  → {msg}'))

    def handle(self, *args, **options) -> None:
        self.stdout.write(self.style.HTTP_INFO('\n🌊 FloodVision Data Seeder'))
        self.stdout.write(self.style.HTTP_INFO('=' * 40))

        self._seed_flood_zones()
        self._seed_sensors()
        self._seed_readings()
        self._seed_weather()
        self._seed_alerts()
        self._seed_ai_analyses()

        self.stdout.write(self.style.SUCCESS('\n✅ Database seeded successfully!\n'))

    def _seed_flood_zones(self) -> None:
        self.info('Creating Flood Zones (Mumbai area)...')

        zones_data = [
            {'lat': 19.0760, 'lng': 72.8777, 'risk_level': 75, 'risk_category': 'red',
             'address': 'Churchgate, Mumbai'},
            {'lat': 19.0178, 'lng': 72.8478, 'risk_level': 85, 'risk_category': 'red',
             'address': 'Dadar, Mumbai'},
            {'lat': 19.0596, 'lng': 72.8295, 'risk_level': 45, 'risk_category': 'yellow',
             'address': 'Bandra West, Mumbai'},
            {'lat': 19.1136, 'lng': 72.8697, 'risk_level': 60, 'risk_category': 'yellow',
             'address': 'Andheri East, Mumbai'},
            {'lat': 19.0330, 'lng': 72.8438, 'risk_level': 90, 'risk_category': 'red',
             'address': 'Hindmata Junction, Mumbai'},
            {'lat': 19.0895, 'lng': 72.8656, 'risk_level': 30, 'risk_category': 'green',
             'address': 'Santacruz, Mumbai'},
            {'lat': 19.1726, 'lng': 72.9425, 'risk_level': 20, 'risk_category': 'green',
             'address': 'Powai, Mumbai'},
            {'lat': 19.0440, 'lng': 72.8200, 'risk_level': 55, 'risk_category': 'yellow',
             'address': 'Mahim, Mumbai'},
            {'lat': 19.1380, 'lng': 72.8345, 'risk_level': 70, 'risk_category': 'red',
             'address': 'Jogeshwari, Mumbai'},
            {'lat': 19.2183, 'lng': 72.9781, 'risk_level': 15, 'risk_category': 'green',
             'address': 'Thane West, Mumbai'},
        ]

        for zone_data in zones_data:
            zone, created = FloodZone.objects.get_or_create(
                lat=zone_data['lat'],
                lng=zone_data['lng'],
                defaults={
                    'risk_level': zone_data['risk_level'],
                    'risk_category': zone_data['risk_category'],
                    'address': zone_data['address'],
                    'analysis_data': {
                        'source': 'seed_data',
                        'confidence': random.uniform(0.7, 0.95),
                    },
                    'last_analyzed': timezone.now() - timedelta(hours=random.randint(1, 48)),
                },
            )
            action = 'Created' if created else 'Exists'
            self.success(f'{action}: {zone_data["address"]} (risk: {zone_data["risk_level"]}%)')

    def _seed_sensors(self) -> None:
        self.info('Creating Sensor Nodes...')

        sensors_data = [
            {
                'node_id': 'SN-402',
                'name': 'Hindmata Underpass',
                'location': 'Hindmata Junction, Dadar',
                'lat': 19.0330,
                'lng': 72.8438,
            },
            {
                'node_id': 'SN-219',
                'name': 'Milan Subway',
                'location': 'Milan Subway, Santacruz',
                'lat': 19.0895,
                'lng': 72.8656,
            },
            {
                'node_id': 'SN-105',
                'name': 'Andheri Subway',
                'location': 'Andheri Subway, Andheri',
                'lat': 19.1136,
                'lng': 72.8697,
            },
            {
                'node_id': 'SN-490',
                'name': 'Bandra Skywalk',
                'location': 'Bandra Station Area',
                'lat': 19.0596,
                'lng': 72.8295,
            },
        ]

        for sensor_data in sensors_data:
            sensor, created = SensorNode.objects.get_or_create(
                node_id=sensor_data['node_id'],
                defaults={
                    'name': sensor_data['name'],
                    'location': sensor_data['location'],
                    'lat': sensor_data['lat'],
                    'lng': sensor_data['lng'],
                    'is_active': True,
                    'last_seen': timezone.now() - timedelta(minutes=random.randint(1, 30)),
                },
            )
            action = 'Created' if created else 'Exists'
            self.success(f'{action}: {sensor_data["node_id"]} - {sensor_data["name"]}')

    def _seed_readings(self) -> None:
        self.info('Creating Sensor Readings (last 24 hours)...')

        sensors = SensorNode.objects.all()
        now = timezone.now()
        total_created = 0

        for sensor in sensors:
            # Skip if sensor already has readings
            if sensor.readings.count() > 10:
                self.success(f'Skipped {sensor.node_id} - already has readings')
                continue

            # Generate readings every 30 minutes for 24 hours
            for i in range(48):
                ts = now - timedelta(minutes=30 * i)
                base_level = random.uniform(10, 50)

                # Add some variation and occasional spikes
                if random.random() < 0.1:
                    base_level = random.uniform(60, 120)  # Occasional high reading

                reading = SensorReading(
                    sensor=sensor,
                    water_level_cm=round(base_level, 1),
                    temperature=round(random.uniform(24, 34), 1),
                    rssi=random.randint(-90, -40),
                    flow_rate=round(random.uniform(0, 15), 2),
                )
                reading.save()
                # Override auto timestamp
                SensorReading.objects.filter(pk=reading.pk).update(timestamp=ts)
                total_created += 1

        self.success(f'Created {total_created} sensor readings')

    def _seed_weather(self) -> None:
        self.info('Creating Weather Data...')

        weather_data = [
            {
                'lat': 19.07, 'lng': 72.88,
                'temperature': 31.2, 'humidity': 82.0,
                'rainfall_mm': 12.5, 'wind_speed': 18.0,
                'condition': 'Moderate rain',
            },
            {
                'lat': 19.11, 'lng': 72.87,
                'temperature': 30.8, 'humidity': 78.0,
                'rainfall_mm': 5.2, 'wind_speed': 15.0,
                'condition': 'Slight rain',
            },
            {
                'lat': 19.03, 'lng': 72.84,
                'temperature': 29.5, 'humidity': 91.0,
                'rainfall_mm': 28.0, 'wind_speed': 22.0,
                'condition': 'Heavy rain',
            },
        ]

        for wd in weather_data:
            obj, created = WeatherData.objects.get_or_create(
                lat=wd['lat'],
                lng=wd['lng'],
                defaults=wd,
            )
            action = 'Created' if created else 'Exists'
            self.success(f'{action}: Weather at ({wd["lat"]}, {wd["lng"]}) - {wd["condition"]}')

    def _seed_alerts(self) -> None:
        self.info('Creating Flood Alerts...')

        alerts_data = [
            {
                'severity': 'critical',
                'message': (
                    'CRITICAL: Water level at SN-402 (Hindmata Underpass) has reached 105cm - '
                    'exceeds critical threshold of 100cm. Road is submerged. '
                    'Avoid Hindmata Junction area. Emergency services notified.'
                ),
                'sensor_node_id': 'SN-402',
            },
            {
                'severity': 'warning',
                'message': (
                    'WARNING: Water level at SN-105 (Andheri Subway) has reached 72cm - '
                    'approaching critical levels. Water rising at 3cm/hour. '
                    'Use alternate routes.'
                ),
                'sensor_node_id': 'SN-105',
            },
            {
                'severity': 'info',
                'message': (
                    'Heavy rainfall forecast for next 6 hours in Mumbai metropolitan area. '
                    'Expected accumulation: 45-60mm. Low-lying areas may experience waterlogging. '
                    'Stay alert and monitor updates.'
                ),
                'sensor_node_id': None,
            },
        ]

        for alert_data in alerts_data:
            sensor = None
            if alert_data['sensor_node_id']:
                sensor = SensorNode.objects.filter(
                    node_id=alert_data['sensor_node_id']
                ).first()

            # Find associated zone if sensor exists
            zone = None
            if sensor:
                zone = FloodZone.objects.filter(
                    lat__gte=sensor.lat - 0.01,
                    lat__lte=sensor.lat + 0.01,
                    lng__gte=sensor.lng - 0.01,
                    lng__lte=sensor.lng + 0.01,
                ).first()

            alert, created = FloodAlert.objects.get_or_create(
                severity=alert_data['severity'],
                message=alert_data['message'],
                defaults={
                    'sensor': sensor,
                    'zone': zone,
                    'is_active': True,
                },
            )
            action = 'Created' if created else 'Exists'
            self.success(f'{action}: [{alert_data["severity"].upper()}] {alert_data["message"][:50]}...')

    def _seed_ai_analyses(self) -> None:
        self.info('Creating AI Analysis records...')

        analyses_data = [
            {
                'lat': 19.0330, 'lng': 72.8438,
                'risk_percentage': 78,
                'road_condition': 'poor',
                'drain_status': 'blocked',
                'pothole_count': 5,
                'elevation_risk': 'depression',
                'analysis_text': (
                    'The Hindmata Junction area shows significant flood vulnerability. '
                    'Multiple potholes detected on the road surface, with blocked drainage '
                    'channels visible. The area sits in a natural depression, making it '
                    'highly susceptible to water accumulation during heavy rainfall. '
                    'Road surface shows extensive damage from previous flooding events. '
                    'Nearby Mithi River adds additional flood risk during monsoon season.'
                ),
            },
            {
                'lat': 19.0596, 'lng': 72.8295,
                'risk_percentage': 35,
                'road_condition': 'fair',
                'drain_status': 'partial',
                'pothole_count': 2,
                'elevation_risk': 'slight_slope',
                'analysis_text': (
                    'The Bandra area shows moderate flood preparedness. Roads are in fair '
                    'condition with minor surface irregularities. Drainage systems are '
                    'partially functional - some channels show debris accumulation. '
                    'The slight slope provides natural water runoff but may direct flow '
                    'toward lower areas. Regular maintenance of drains recommended.'
                ),
            },
        ]

        for analysis_data in analyses_data:
            obj, created = AIAnalysis.objects.get_or_create(
                lat=analysis_data['lat'],
                lng=analysis_data['lng'],
                risk_percentage=analysis_data['risk_percentage'],
                defaults={
                    'road_condition': analysis_data['road_condition'],
                    'drain_status': analysis_data['drain_status'],
                    'pothole_count': analysis_data['pothole_count'],
                    'elevation_risk': analysis_data['elevation_risk'],
                    'analysis_text': analysis_data['analysis_text'],
                    'raw_response': {'source': 'seed_data'},
                },
            )
            action = 'Created' if created else 'Exists'
            self.success(f'{action}: AI Analysis at ({analysis_data["lat"]}, {analysis_data["lng"]}) - risk {analysis_data["risk_percentage"]}%')
