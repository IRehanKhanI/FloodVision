"""WebSocket URL routing for FloodVision."""

from django.urls import re_path

from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/sensors/$', consumers.SensorDataConsumer.as_asgi()),
    re_path(r'ws/alerts/$', consumers.AlertConsumer.as_asgi()),
]
