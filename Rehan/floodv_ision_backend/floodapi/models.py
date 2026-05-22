from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


class FloodZone(models.Model):
    """Geographic zone with assessed flood risk level."""

    RISK_CATEGORY_CHOICES = [
        ('green', 'Low Risk'),
        ('yellow', 'Moderate Risk'),
        ('red', 'High Risk'),
    ]

    lat = models.FloatField(help_text="Latitude of the flood zone center")
    lng = models.FloatField(help_text="Longitude of the flood zone center")
    risk_level = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Risk level from 0 (safe) to 100 (extreme danger)",
    )
    risk_category = models.CharField(
        max_length=10,
        choices=RISK_CATEGORY_CHOICES,
        default='green',
    )
    address = models.CharField(max_length=500, blank=True, default='')
    analysis_data = models.JSONField(default=dict, blank=True)
    last_analyzed = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Flood Zone'
        verbose_name_plural = 'Flood Zones'

    def __str__(self) -> str:
        return f"FloodZone({self.risk_category}) at ({self.lat:.4f}, {self.lng:.4f})"


class SensorNode(models.Model):
    """Physical IoT sensor node deployed in the field."""

    node_id = models.CharField(max_length=50, unique=True, help_text="Unique sensor identifier e.g. SN-402")
    name = models.CharField(max_length=200, blank=True, default='')
    location = models.CharField(max_length=500, blank=True, default='')
    lat = models.FloatField(help_text="Latitude of sensor placement")
    lng = models.FloatField(help_text="Longitude of sensor placement")
    is_active = models.BooleanField(default=True)
    last_seen = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Sensor Node'
        verbose_name_plural = 'Sensor Nodes'

    def __str__(self) -> str:
        status = "active" if self.is_active else "inactive"
        return f"{self.node_id} - {self.name} ({status})"


class SensorReading(models.Model):
    """Individual data reading from a sensor node."""

    sensor = models.ForeignKey(
        SensorNode,
        on_delete=models.CASCADE,
        related_name='readings',
    )
    water_level_cm = models.FloatField(help_text="Water level in centimeters")
    temperature = models.FloatField(null=True, blank=True, help_text="Temperature in Celsius")
    rssi = models.IntegerField(null=True, blank=True, help_text="Signal strength indicator")
    flow_rate = models.FloatField(null=True, blank=True, help_text="Water flow rate in L/min")
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'Sensor Reading'
        verbose_name_plural = 'Sensor Readings'

    def __str__(self) -> str:
        return f"{self.sensor.node_id}: {self.water_level_cm}cm @ {self.timestamp}"


class WeatherData(models.Model):
    """Cached weather data for a geographic location."""

    lat = models.FloatField()
    lng = models.FloatField()
    temperature = models.FloatField(help_text="Temperature in Celsius")
    humidity = models.FloatField(help_text="Relative humidity percentage")
    rainfall_mm = models.FloatField(default=0.0, help_text="Rainfall in millimeters")
    wind_speed = models.FloatField(default=0.0, help_text="Wind speed in km/h")
    condition = models.CharField(max_length=100, blank=True, default='')
    forecast_json = models.JSONField(null=True, blank=True)
    fetched_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-fetched_at']
        verbose_name = 'Weather Data'
        verbose_name_plural = 'Weather Data'

    def __str__(self) -> str:
        return f"Weather({self.condition}) at ({self.lat:.2f}, {self.lng:.2f}) - {self.fetched_at}"


class FloodAlert(models.Model):
    """Alert generated from sensor data or AI analysis."""

    SEVERITY_CHOICES = [
        ('critical', 'Critical'),
        ('warning', 'Warning'),
        ('info', 'Informational'),
    ]

    zone = models.ForeignKey(
        FloodZone,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='alerts',
    )
    sensor = models.ForeignKey(
        SensorNode,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='alerts',
    )
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default='info')
    message = models.TextField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Flood Alert'
        verbose_name_plural = 'Flood Alerts'

    def __str__(self) -> str:
        return f"[{self.severity.upper()}] {self.message[:60]}"


class RouteQuery(models.Model):
    """Stored route optimization query and result."""

    start_lat = models.FloatField()
    start_lng = models.FloatField()
    end_lat = models.FloatField()
    end_lng = models.FloatField()
    optimization_param = models.CharField(
        max_length=50,
        default='lowest_risk',
        help_text="Either 'lowest_risk' or 'shortest_path'",
    )
    route_data = models.JSONField(default=dict)
    risk_score = models.FloatField(default=0.0)
    duration_estimate = models.CharField(max_length=100, blank=True, default='')
    distance_km = models.FloatField(default=0.0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Route Query'
        verbose_name_plural = 'Route Queries'

    def __str__(self) -> str:
        return f"Route({self.optimization_param}): ({self.start_lat:.3f},{self.start_lng:.3f}) -> ({self.end_lat:.3f},{self.end_lng:.3f})"


class AIAnalysis(models.Model):
    """Result of AI-powered flood risk image analysis."""

    ROAD_CONDITION_CHOICES = [
        ('good', 'Good'),
        ('fair', 'Fair'),
        ('poor', 'Poor'),
        ('critical', 'Critical'),
    ]
    DRAIN_STATUS_CHOICES = [
        ('clear', 'Clear'),
        ('partial', 'Partially Blocked'),
        ('blocked', 'Blocked'),
    ]
    ELEVATION_RISK_CHOICES = [
        ('flat', 'Flat Terrain'),
        ('slight_slope', 'Slight Slope'),
        ('significant_slope', 'Significant Slope'),
        ('depression', 'Depression / Low-lying'),
    ]

    image_url = models.URLField(blank=True, default='')
    lat = models.FloatField(null=True, blank=True)
    lng = models.FloatField(null=True, blank=True)
    risk_percentage = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    road_condition = models.CharField(
        max_length=20,
        choices=ROAD_CONDITION_CHOICES,
        default='good',
    )
    drain_status = models.CharField(
        max_length=20,
        choices=DRAIN_STATUS_CHOICES,
        default='clear',
    )
    pothole_count = models.IntegerField(default=0)
    elevation_risk = models.CharField(
        max_length=30,
        choices=ELEVATION_RISK_CHOICES,
        default='flat',
    )
    analysis_text = models.TextField(blank=True, default='')
    raw_response = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'AI Analysis'
        verbose_name_plural = 'AI Analyses'

    def __str__(self) -> str:
        return f"AIAnalysis(risk={self.risk_percentage}%, road={self.road_condition}) - {self.created_at}"
