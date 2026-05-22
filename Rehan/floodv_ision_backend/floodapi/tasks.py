"""Celery tasks for background processing."""

from celery import shared_task

from floodapi.models import SensorNode
from floodapi.services.weather_service import get_current_weather


@shared_task
def refresh_weather_for_sensors() -> int:
    """Refresh cached weather for all sensor locations."""
    count = 0
    for sensor in SensorNode.objects.all():
        get_current_weather(sensor.lat, sensor.lng)
        count += 1
    return count
