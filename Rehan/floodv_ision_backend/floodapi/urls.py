"""URL routing for FloodVision API endpoints."""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r'flood-zones', views.FloodZoneViewSet, basename='floodzone')
router.register(r'sensors', views.SensorNodeViewSet, basename='sensor')
router.register(r'alerts', views.FloodAlertViewSet, basename='alert')

app_name = 'floodapi'

urlpatterns = [
    # Router-generated CRUD endpoints
    path('', include(router.urls)),

    # Sensor readings
    path('readings/', views.SensorReadingListView.as_view(), name='readings-list'),

    # Weather endpoints
    path('weather/', views.WeatherAPIView.as_view(), name='weather-current'),
    path('weather/current/', views.WeatherAPIView.as_view(), name='weather-current-alias'),
    path('weather/forecast/', views.WeatherForecastView.as_view(), name='weather-forecast'),

    # Route optimization
    path('routes/optimize/', views.RouteOptimizeView.as_view(), name='route-optimize'),
    path('route/optimize/', views.RouteOptimizeView.as_view(), name='route-optimize-alias'),

    # AI analysis
    path('ai/analyze/', views.AIAnalyzeImageView.as_view(), name='ai-analyze'),
    path('ai/analyze-image/', views.AIAnalyzeImageView.as_view(), name='ai-analyze-image'),
    path('ai/analyze-coordinates/', views.AIAnalyzeCoordinatesView.as_view(), name='ai-analyze-coordinates'),

    # Dashboard
    path('dashboard/stats/', views.DashboardStatsView.as_view(), name='dashboard-stats'),
]
