"""
FloodVision API Views.

ViewSets and APIViews for all FloodVision endpoints:
- FloodZone CRUD + location analysis
- SensorNode CRUD + readings
- Weather (current + forecast)
- FloodAlerts CRUD + active/dismiss
- Route optimization
- AI image analysis
- Dashboard stats
"""

from __future__ import annotations

import logging
from typing import Any

from django.db.models import Avg, Count, Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    AIAnalysis,
    FloodAlert,
    FloodZone,
    RouteQuery,
    SensorNode,
    SensorReading,
    WeatherData,
)
from .serializers import (
    AIAnalysisSerializer,
    FloodAlertSerializer,
    FloodZoneSerializer,
    RouteQuerySerializer,
    SensorNodeSerializer,
    SensorReadingSerializer,
    WeatherDataSerializer,
)

logger = logging.getLogger(__name__)


def _store_ai_analysis(
    result: dict[str, Any],
    image_url: str,
    lat_val: float | None,
    lng_val: float | None,
) -> AIAnalysis:
    """Persist AI analysis results to the database."""
    return AIAnalysis.objects.create(
        image_url=image_url or '',
        lat=lat_val,
        lng=lng_val,
        risk_percentage=result.get('risk_percentage', 0),
        road_condition=result.get('road_condition', 'good'),
        drain_status=result.get('drain_status', 'clear'),
        pothole_count=result.get('pothole_count', 0),
        elevation_risk=result.get('elevation_risk', 'flat'),
        analysis_text=result.get('analysis_text', ''),
        raw_response=result,
    )


# ─── FloodZone ────────────────────────────────────────────────────────

class FloodZoneViewSet(viewsets.ModelViewSet):
    """
    CRUD operations for flood zones.

    Endpoints:
        GET    /api/flood-zones/             - List all zones
        POST   /api/flood-zones/             - Create zone
        GET    /api/flood-zones/{id}/         - Retrieve zone
        PUT    /api/flood-zones/{id}/         - Update zone
        DELETE /api/flood-zones/{id}/         - Delete zone
        POST   /api/flood-zones/analyze_location/ - Analyze a location for flood risk
    """

    queryset = FloodZone.objects.all()
    serializer_class = FloodZoneSerializer

    def _analyze_location(self, request: Request) -> Response:
        """Shared handler to analyze a geographic location for flood risk."""
        lat = request.data.get('lat')
        lng = request.data.get('lng')

        if lat is None or lng is None:
            return Response(
                {'error': 'Both lat and lng are required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            lat = float(lat)
            lng = float(lng)
        except (ValueError, TypeError):
            return Response(
                {'error': 'lat and lng must be valid numbers'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from .services.weather_service import get_current_weather
        weather = get_current_weather(lat, lng)
        flood_risk = weather.get('flood_risk', {})
        risk_score = flood_risk.get('score', 0)

        if risk_score >= 70:
            risk_category = 'red'
        elif risk_score >= 40:
            risk_category = 'yellow'
        else:
            risk_category = 'green'

        zone, created = FloodZone.objects.update_or_create(
            lat=round(lat, 4),
            lng=round(lng, 4),
            defaults={
                'risk_level': risk_score,
                'risk_category': risk_category,
                'analysis_data': {
                    'weather': weather,
                    'flood_risk': flood_risk,
                },
                'last_analyzed': timezone.now(),
            },
        )

        serializer = self.get_serializer(zone)
        return Response(
            {
                'zone': serializer.data,
                'weather': weather,
                'created': created,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=['post'], url_path='analyze')
    def analyze(self, request: Request) -> Response:
        """
        Analyze a geographic location for flood risk.

        Request body: {"lat": float, "lng": float}
        """
        return self._analyze_location(request)

    @action(detail=False, methods=['post'], url_path='analyze-location')
    def analyze_location(self, request: Request) -> Response:
        """Backward-compatible alias for analyze endpoint."""
        return self._analyze_location(request)


# ─── SensorNode ───────────────────────────────────────────────────────

class SensorNodeViewSet(viewsets.ModelViewSet):
    """
    CRUD operations for IoT sensor nodes.

    Endpoints:
        GET    /api/sensors/                      - List all sensors
        POST   /api/sensors/                      - Register sensor
        GET    /api/sensors/{id}/                  - Retrieve sensor
        PUT    /api/sensors/{id}/                  - Update sensor
        DELETE /api/sensors/{id}/                  - Delete sensor
        GET    /api/sensors/{id}/latest-readings/  - Get latest readings
        GET    /api/sensors/{id}/readings-history/ - Get historical readings
    """

    queryset = SensorNode.objects.all()
    serializer_class = SensorNodeSerializer

    @action(detail=True, methods=['get'], url_path='latest-readings')
    def latest_readings(self, request: Request, pk: Any = None) -> Response:
        """Get the 10 most recent readings from a specific sensor."""
        sensor = self.get_object()
        readings = sensor.readings.order_by('-timestamp')[:10]
        serializer = SensorReadingSerializer(readings, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='readings-history')
    def readings_history(self, request: Request, pk: Any = None) -> Response:
        """
        Get historical readings for a sensor.

        Query params:
            hours: number of hours to look back (default 24, max 168)
            limit: max number of readings (default 100, max 1000)
        """
        sensor = self.get_object()
        hours = min(int(request.query_params.get('hours', 24)), 168)
        limit = min(int(request.query_params.get('limit', 100)), 1000)

        cutoff = timezone.now() - timezone.timedelta(hours=hours)
        readings = sensor.readings.filter(timestamp__gte=cutoff).order_by('-timestamp')[:limit]
        serializer = SensorReadingSerializer(readings, many=True)

        return Response({
            'sensor': SensorNodeSerializer(sensor).data,
            'readings': serializer.data,
            'count': len(serializer.data),
            'hours': hours,
        })

    @action(detail=True, methods=['get'], url_path='readings')
    def readings(self, request: Request, pk: Any = None) -> Response:
        """Alias for readings history to match frontend expectations."""
        return self.readings_history(request, pk)

    @action(detail=False, methods=['get'], url_path='latest')
    def latest(self, request: Request) -> Response:
        """Return the latest reading for each sensor node."""
        limit = min(int(request.query_params.get('limit', 100)), 500)
        active_only = request.query_params.get('active', 'false').lower() == 'true'

        queryset = SensorNode.objects.all()
        if active_only:
            queryset = queryset.filter(is_active=True)

        sensors = queryset.order_by('-created_at')[:limit]
        serializer = SensorNodeSerializer(sensors, many=True)
        return Response(serializer.data)


# ─── SensorReading ────────────────────────────────────────────────────

class SensorReadingListView(APIView):
    """
    List sensor readings with optional filters.

    GET /api/readings/?sensor_id=<node_id>&limit=50&hours=24
    """

    def get(self, request: Request) -> Response:
        sensor_id = request.query_params.get('sensor_id')
        limit = min(int(request.query_params.get('limit', 50)), 500)
        hours = min(int(request.query_params.get('hours', 24)), 168)

        cutoff = timezone.now() - timezone.timedelta(hours=hours)
        queryset = SensorReading.objects.filter(timestamp__gte=cutoff)

        if sensor_id:
            queryset = queryset.filter(sensor__node_id=sensor_id)

        readings = queryset.order_by('-timestamp')[:limit]
        serializer = SensorReadingSerializer(readings, many=True)
        return Response(serializer.data)


# ─── Weather ──────────────────────────────────────────────────────────

class WeatherAPIView(APIView):
    """
    Fetch current weather and forecast data.

    GET /api/weather/?lat=19.07&lng=72.87          - Current weather
    GET /api/weather/forecast/?lat=19.07&lng=72.87  - 7-day forecast
    """

    def get(self, request: Request) -> Response:
        lat = request.query_params.get('lat')
        lng = request.query_params.get('lng')

        if not lat or not lng:
            return Response(
                {'error': 'lat and lng query parameters are required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            lat = float(lat)
            lng = float(lng)
        except (ValueError, TypeError):
            return Response(
                {'error': 'lat and lng must be valid numbers'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from .services.weather_service import get_current_weather
        data = get_current_weather(lat, lng)
        return Response(data)


class WeatherForecastView(APIView):
    """
    Fetch 7-day weather forecast.

    GET /api/weather/forecast/?lat=19.07&lng=72.87&days=7
    """

    def get(self, request: Request) -> Response:
        lat = request.query_params.get('lat')
        lng = request.query_params.get('lng')
        days = int(request.query_params.get('days', 7))

        if not lat or not lng:
            return Response(
                {'error': 'lat and lng query parameters are required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            lat = float(lat)
            lng = float(lng)
        except (ValueError, TypeError):
            return Response(
                {'error': 'lat and lng must be valid numbers'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from .services.weather_service import get_forecast
        data = get_forecast(lat, lng, days)
        return Response(data)


# ─── FloodAlert ───────────────────────────────────────────────────────

class FloodAlertViewSet(viewsets.ModelViewSet):
    """
    CRUD operations for flood alerts.

    Endpoints:
        GET    /api/alerts/                 - List all alerts
        POST   /api/alerts/                 - Create alert
        GET    /api/alerts/{id}/            - Retrieve alert
        PUT    /api/alerts/{id}/            - Update alert
        DELETE /api/alerts/{id}/            - Delete alert
        POST   /api/alerts/{id}/dismiss/    - Dismiss an alert
        GET    /api/alerts/active/          - List active alerts
    """

    queryset = FloodAlert.objects.all()
    serializer_class = FloodAlertSerializer

    @action(detail=True, methods=['post'])
    def dismiss(self, request: Request, pk: Any = None) -> Response:
        """Dismiss (deactivate) an alert."""
        alert = self.get_object()
        alert.is_active = False
        alert.save(update_fields=['is_active'])
        serializer = self.get_serializer(alert)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='active')
    def active_alerts(self, request: Request) -> Response:
        """List only active alerts."""
        alerts = FloodAlert.objects.filter(is_active=True)

        severity = request.query_params.get('severity')
        if severity:
            alerts = alerts.filter(severity=severity)

        serializer = self.get_serializer(alerts, many=True)
        return Response(serializer.data)


# ─── Route Optimization ──────────────────────────────────────────────

class RouteOptimizeView(APIView):
    """
    Compute an optimized route considering flood risk.

    POST /api/routes/optimize/
    Body: {
        "start_lat": float,
        "start_lng": float,
        "end_lat": float,
        "end_lng": float,
        "optimization": "lowest_risk" | "shortest_path"
    }
    """

    def post(self, request: Request) -> Response:
        required = ['start_lat', 'start_lng', 'end_lat', 'end_lng']
        for field in required:
            if field not in request.data:
                return Response(
                    {'error': f'{field} is required'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        try:
            start_lat = float(request.data['start_lat'])
            start_lng = float(request.data['start_lng'])
            end_lat = float(request.data['end_lat'])
            end_lng = float(request.data['end_lng'])
        except (ValueError, TypeError):
            return Response(
                {'error': 'All coordinates must be valid numbers'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        optimization = (
            request.data.get('optimization')
            or request.data.get('optimization_param')
            or 'lowest_risk'
        )
        if optimization not in ('lowest_risk', 'shortest_path'):
            optimization = 'lowest_risk'

        from .services.route_service import optimize_route
        route_data = optimize_route(start_lat, start_lng, end_lat, end_lng, optimization)

        # Store the query
        route_query = RouteQuery.objects.create(
            start_lat=start_lat,
            start_lng=start_lng,
            end_lat=end_lat,
            end_lng=end_lng,
            optimization_param=optimization,
            route_data=route_data,
            risk_score=route_data.get('average_risk', 0),
            duration_estimate=route_data.get('estimated_duration', ''),
            distance_km=route_data.get('total_distance_km', 0),
        )

        return Response({
            'query_id': route_query.id,
            'route': route_data,
        })


# ─── AI Analysis ─────────────────────────────────────────────────────

class AIAnalyzeImageView(APIView):
    """
    Analyze an image or location for flood risk using Gemini AI.

    POST /api/ai/analyze/
    Body (multipart/form-data):
        - image: image file (optional)
        - image_url: URL string (optional)
        - lat: float (optional)
        - lng: float (optional)

    At least one of image, image_url, or (lat+lng) must be provided.
    """

    def post(self, request: Request) -> Response:
        image_file = request.FILES.get('image')
        image_url = request.data.get('image_url', '')
        lat = request.data.get('lat')
        lng = request.data.get('lng')

        if not image_file and not image_url and not (lat and lng):
            return Response(
                {'error': 'Provide at least an image file, image_url, or coordinates (lat + lng)'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Parse coordinates if provided
        lat_val = None
        lng_val = None
        if lat and lng:
            try:
                lat_val = float(lat)
                lng_val = float(lng)
            except (ValueError, TypeError):
                return Response(
                    {'error': 'lat and lng must be valid numbers'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Read image bytes if uploaded
        image_bytes = None
        if image_file:
            image_bytes = image_file.read()

        prefer_street_view = bool(lat_val is not None and lng_val is not None and not image_bytes and not image_url)

        from .services.ai_service import analyze_image
        result = analyze_image(
            image_bytes=image_bytes,
            image_url=image_url if image_url else None,
            lat=lat_val,
            lng=lng_val,
            prefer_street_view=prefer_street_view,
        )

        analysis = _store_ai_analysis(result, image_url, lat_val, lng_val)

        serializer = AIAnalysisSerializer(analysis)
        return Response({
            'analysis': serializer.data,
            'recommendations': result.get('recommendations', []),
        }, status=status.HTTP_201_CREATED)

    def get(self, request: Request) -> Response:
        """List past AI analyses."""
        limit = min(int(request.query_params.get('limit', 20)), 100)
        analyses = AIAnalysis.objects.all()[:limit]
        serializer = AIAnalysisSerializer(analyses, many=True)
        return Response(serializer.data)


class AIAnalyzeCoordinatesView(APIView):
    """
    Analyze a location using Street View imagery when available.

    POST /api/ai/analyze-coordinates/
    Body: {"lat": float, "lng": float}
    """

    def post(self, request: Request) -> Response:
        lat = request.data.get('lat')
        lng = request.data.get('lng')

        if lat is None or lng is None:
            return Response(
                {'error': 'Both lat and lng are required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            lat_val = float(lat)
            lng_val = float(lng)
        except (ValueError, TypeError):
            return Response(
                {'error': 'lat and lng must be valid numbers'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from .services.ai_service import analyze_image
        result = analyze_image(
            image_bytes=None,
            image_url=None,
            lat=lat_val,
            lng=lng_val,
            prefer_street_view=True,
        )

        analysis = _store_ai_analysis(result, '', lat_val, lng_val)
        serializer = AIAnalysisSerializer(analysis)

        return Response({
            'analysis': serializer.data,
            'recommendations': result.get('recommendations', []),
        }, status=status.HTTP_201_CREATED)


# ─── Dashboard Stats ─────────────────────────────────────────────────

class DashboardStatsView(APIView):
    """
    Aggregated dashboard statistics.

    GET /api/dashboard/stats/
    Returns sensor counts, alert counts, average risk, and recent activity.
    """

    def get(self, request: Request) -> Response:
        total_sensors = SensorNode.objects.count()
        active_sensors = SensorNode.objects.filter(is_active=True).count()
        inactive_sensors = total_sensors - active_sensors

        total_alerts = FloodAlert.objects.count()
        active_alerts = FloodAlert.objects.filter(is_active=True).count()
        critical_alerts = FloodAlert.objects.filter(
            is_active=True, severity='critical'
        ).count()
        warning_alerts = FloodAlert.objects.filter(
            is_active=True, severity='warning'
        ).count()

        total_zones = FloodZone.objects.count()
        avg_risk = FloodZone.objects.aggregate(avg=Avg('risk_level'))['avg'] or 0

        zone_breakdown = {
            'red': FloodZone.objects.filter(risk_category='red').count(),
            'yellow': FloodZone.objects.filter(risk_category='yellow').count(),
            'green': FloodZone.objects.filter(risk_category='green').count(),
        }

        # Recent readings (last hour)
        one_hour_ago = timezone.now() - timezone.timedelta(hours=1)
        recent_readings = SensorReading.objects.filter(
            timestamp__gte=one_hour_ago
        ).count()

        # Latest reading per active sensor
        latest_readings = []
        for sensor in SensorNode.objects.filter(is_active=True)[:10]:
            reading = sensor.readings.order_by('-timestamp').first()
            if reading:
                latest_readings.append({
                    'node_id': sensor.node_id,
                    'name': sensor.name,
                    'water_level_cm': reading.water_level_cm,
                    'temperature': reading.temperature,
                    'timestamp': reading.timestamp.isoformat(),
                })

        return Response({
            'sensors': {
                'total': total_sensors,
                'active': active_sensors,
                'inactive': inactive_sensors,
            },
            'alerts': {
                'total': total_alerts,
                'active': active_alerts,
                'critical': critical_alerts,
                'warning': warning_alerts,
            },
            'flood_zones': {
                'total': total_zones,
                'average_risk': round(avg_risk, 1),
                'breakdown': zone_breakdown,
            },
            'recent_activity': {
                'readings_last_hour': recent_readings,
                'latest_sensor_readings': latest_readings,
            },
        })
