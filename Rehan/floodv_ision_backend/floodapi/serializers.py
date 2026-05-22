from rest_framework import serializers

from .models import (
    AIAnalysis,
    FloodAlert,
    FloodZone,
    RouteQuery,
    SensorNode,
    SensorReading,
    WeatherData,
)


class FloodZoneSerializer(serializers.ModelSerializer):
    """Serializer for FloodZone model."""

    class Meta:
        model = FloodZone
        fields = '__all__'
        read_only_fields = ['created_at']


class SensorReadingSerializer(serializers.ModelSerializer):
    """Serializer for SensorReading model."""

    class Meta:
        model = SensorReading
        fields = '__all__'
        read_only_fields = ['timestamp']


class SensorNodeSerializer(serializers.ModelSerializer):
    """Serializer for SensorNode with embedded latest reading."""

    latest_reading = serializers.SerializerMethodField()

    class Meta:
        model = SensorNode
        fields = '__all__'
        read_only_fields = ['created_at']

    def get_latest_reading(self, obj: SensorNode) -> dict | None:
        """Return the most recent reading from this sensor."""
        reading = obj.readings.order_by('-timestamp').first()
        if reading:
            return SensorReadingSerializer(reading).data
        return None


class WeatherDataSerializer(serializers.ModelSerializer):
    """Serializer for WeatherData model."""

    class Meta:
        model = WeatherData
        fields = '__all__'
        read_only_fields = ['fetched_at']


class FloodAlertSerializer(serializers.ModelSerializer):
    """Serializer for FloodAlert model."""

    zone_info = FloodZoneSerializer(source='zone', read_only=True)
    sensor_info = serializers.SerializerMethodField()

    class Meta:
        model = FloodAlert
        fields = '__all__'
        read_only_fields = ['created_at']

    def get_sensor_info(self, obj: FloodAlert) -> dict | None:
        """Return basic sensor info without triggering nested reading queries."""
        if obj.sensor:
            return {
                'node_id': obj.sensor.node_id,
                'name': obj.sensor.name,
                'location': obj.sensor.location,
            }
        return None


class RouteQuerySerializer(serializers.ModelSerializer):
    """Serializer for RouteQuery model."""

    class Meta:
        model = RouteQuery
        fields = '__all__'
        read_only_fields = ['created_at']


class AIAnalysisSerializer(serializers.ModelSerializer):
    """Serializer for AIAnalysis model."""

    class Meta:
        model = AIAnalysis
        fields = '__all__'
        read_only_fields = ['created_at']
