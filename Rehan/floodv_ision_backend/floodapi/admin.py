from django.contrib import admin

from .models import (
    AIAnalysis,
    FloodAlert,
    FloodZone,
    RouteQuery,
    SensorNode,
    SensorReading,
    WeatherData,
)


@admin.register(FloodZone)
class FloodZoneAdmin(admin.ModelAdmin):
    list_display = ['id', 'address', 'risk_level', 'risk_category', 'lat', 'lng', 'last_analyzed', 'created_at']
    list_filter = ['risk_category']
    search_fields = ['address']
    readonly_fields = ['created_at']


@admin.register(SensorNode)
class SensorNodeAdmin(admin.ModelAdmin):
    list_display = ['node_id', 'name', 'location', 'is_active', 'last_seen', 'created_at']
    list_filter = ['is_active']
    search_fields = ['node_id', 'name', 'location']
    readonly_fields = ['created_at']


@admin.register(SensorReading)
class SensorReadingAdmin(admin.ModelAdmin):
    list_display = ['sensor', 'water_level_cm', 'temperature', 'rssi', 'flow_rate', 'timestamp']
    list_filter = ['sensor']
    readonly_fields = ['timestamp']


@admin.register(WeatherData)
class WeatherDataAdmin(admin.ModelAdmin):
    list_display = ['lat', 'lng', 'temperature', 'humidity', 'rainfall_mm', 'condition', 'fetched_at']
    readonly_fields = ['fetched_at']


@admin.register(FloodAlert)
class FloodAlertAdmin(admin.ModelAdmin):
    list_display = ['id', 'severity', 'message_preview', 'is_active', 'zone', 'sensor', 'created_at']
    list_filter = ['severity', 'is_active']
    readonly_fields = ['created_at']

    @admin.display(description='Message')
    def message_preview(self, obj: FloodAlert) -> str:
        return obj.message[:80] + '...' if len(obj.message) > 80 else obj.message


@admin.register(RouteQuery)
class RouteQueryAdmin(admin.ModelAdmin):
    list_display = ['id', 'optimization_param', 'risk_score', 'distance_km', 'duration_estimate', 'created_at']
    list_filter = ['optimization_param']
    readonly_fields = ['created_at']


@admin.register(AIAnalysis)
class AIAnalysisAdmin(admin.ModelAdmin):
    list_display = ['id', 'risk_percentage', 'road_condition', 'drain_status', 'pothole_count', 'elevation_risk', 'created_at']
    list_filter = ['road_condition', 'drain_status', 'elevation_risk']
    readonly_fields = ['created_at']
