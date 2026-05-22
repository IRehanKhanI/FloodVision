"""Celery application setup for FloodVision."""

import os

from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'floodv_ision_backend.settings')

app = Celery('floodv_ision_backend')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()
