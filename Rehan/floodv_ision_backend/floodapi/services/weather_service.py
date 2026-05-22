"""
Weather Service - Open-Meteo API Integration.

Fetches current weather and 7-day forecast from the Open-Meteo API
(completely free, no API key required). Computes a flood risk score
based on rainfall, humidity, and conditions. Caches results in the
WeatherData model with a 15-minute TTL.
"""

from __future__ import annotations

import logging
from datetime import timedelta
from typing import Any

import requests
from django.utils import timezone

logger = logging.getLogger(__name__)

# WMO Weather Interpretation Codes -> human-readable conditions
WMO_CODES: dict[int, str] = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    56: 'Light freezing drizzle',
    57: 'Dense freezing drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    66: 'Light freezing rain',
    67: 'Heavy freezing rain',
    71: 'Slight snow fall',
    73: 'Moderate snow fall',
    75: 'Heavy snow fall',
    77: 'Snow grains',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail',
}

CACHE_TTL_MINUTES = 15
OPEN_METEO_BASE = 'https://api.open-meteo.com/v1/forecast'


def _compute_flood_risk(rainfall_mm: float, humidity: float, weather_code: int) -> dict[str, Any]:
    """
    Compute a flood risk score (0-100) based on weather parameters.

    Factors:
    - rainfall_mm: higher rainfall = higher risk
    - humidity: high humidity suggests saturated ground
    - weather_code: thunderstorms and heavy rain codes increase risk
    """
    risk = 0.0

    # Rainfall contribution (0-50 points)
    if rainfall_mm > 50:
        risk += 50
    elif rainfall_mm > 20:
        risk += 35
    elif rainfall_mm > 10:
        risk += 25
    elif rainfall_mm > 5:
        risk += 15
    elif rainfall_mm > 1:
        risk += 8
    elif rainfall_mm > 0:
        risk += 3

    # Humidity contribution (0-20 points)
    if humidity > 90:
        risk += 20
    elif humidity > 80:
        risk += 15
    elif humidity > 70:
        risk += 10
    elif humidity > 60:
        risk += 5

    # Severe weather code contribution (0-30 points)
    if weather_code in (95, 96, 99):  # Thunderstorms
        risk += 30
    elif weather_code in (65, 67, 82):  # Heavy rain
        risk += 25
    elif weather_code in (63, 81):  # Moderate rain
        risk += 15
    elif weather_code in (61, 80):  # Slight rain
        risk += 8
    elif weather_code in (51, 53, 55):  # Drizzle
        risk += 5

    risk_score = min(100, max(0, int(risk)))

    if risk_score >= 70:
        risk_level = 'high'
    elif risk_score >= 40:
        risk_level = 'moderate'
    else:
        risk_level = 'low'

    return {
        'score': risk_score,
        'level': risk_level,
        'factors': {
            'rainfall_contribution': min(50, risk),
            'humidity_factor': 'high' if humidity > 80 else 'normal',
            'severe_weather': weather_code in (65, 67, 82, 95, 96, 99),
        },
    }


def get_current_weather(lat: float, lng: float) -> dict[str, Any]:
    """
    Fetch current weather data for a location.

    Uses cached data if available within CACHE_TTL_MINUTES, otherwise
    fetches fresh data from Open-Meteo.

    Args:
        lat: Latitude of the location.
        lng: Longitude of the location.

    Returns:
        Dictionary with weather data and flood risk assessment.
    """
    from floodapi.models import WeatherData

    # Check cache (within 15 minutes and ~0.01 degree tolerance)
    cache_cutoff = timezone.now() - timedelta(minutes=CACHE_TTL_MINUTES)
    cached = WeatherData.objects.filter(
        lat__gte=lat - 0.01,
        lat__lte=lat + 0.01,
        lng__gte=lng - 0.01,
        lng__lte=lng + 0.01,
        fetched_at__gte=cache_cutoff,
    ).first()

    if cached:
        logger.info(f"Using cached weather data for ({lat}, {lng})")
        weather_code = 0
        # Try to extract weather_code from the condition string
        for code, desc in WMO_CODES.items():
            if cached.condition == desc:
                weather_code = code
                break

        flood_risk = _compute_flood_risk(cached.rainfall_mm, cached.humidity, weather_code)
        return {
            'temperature': cached.temperature,
            'humidity': cached.humidity,
            'rainfall_mm': cached.rainfall_mm,
            'wind_speed': cached.wind_speed,
            'condition': cached.condition,
            'flood_risk': flood_risk,
            'cached': True,
            'fetched_at': cached.fetched_at.isoformat(),
        }

    # Fetch from Open-Meteo API
    try:
        params = {
            'latitude': lat,
            'longitude': lng,
            'current': 'temperature_2m,relative_humidity_2m,rain,wind_speed_10m,weather_code',
            'timezone': 'auto',
        }
        response = requests.get(OPEN_METEO_BASE, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        current = data.get('current', {})
        temperature = current.get('temperature_2m', 0.0)
        humidity = current.get('relative_humidity_2m', 0.0)
        rainfall_mm = current.get('rain', 0.0)
        wind_speed = current.get('wind_speed_10m', 0.0)
        weather_code = current.get('weather_code', 0)
        condition = WMO_CODES.get(weather_code, 'Unknown')

        # Save to cache
        WeatherData.objects.create(
            lat=lat,
            lng=lng,
            temperature=temperature,
            humidity=humidity,
            rainfall_mm=rainfall_mm,
            wind_speed=wind_speed,
            condition=condition,
        )

        flood_risk = _compute_flood_risk(rainfall_mm, humidity, weather_code)

        return {
            'temperature': temperature,
            'humidity': humidity,
            'rainfall_mm': rainfall_mm,
            'wind_speed': wind_speed,
            'condition': condition,
            'weather_code': weather_code,
            'flood_risk': flood_risk,
            'cached': False,
            'fetched_at': timezone.now().isoformat(),
        }

    except requests.RequestException as e:
        logger.error(f"Open-Meteo API request failed: {e}")
        return {
            'error': 'Failed to fetch weather data',
            'detail': str(e),
            'flood_risk': {'score': 0, 'level': 'unknown', 'factors': {}},
        }


def get_forecast(lat: float, lng: float, days: int = 7) -> dict[str, Any]:
    """
    Fetch multi-day weather forecast for a location.

    Args:
        lat: Latitude of the location.
        lng: Longitude of the location.
        days: Number of forecast days (1-16), defaults to 7.

    Returns:
        Dictionary with daily forecast data.
    """
    from floodapi.models import WeatherData

    try:
        params = {
            'latitude': lat,
            'longitude': lng,
            'daily': 'temperature_2m_max,temperature_2m_min,rain_sum,weather_code',
            'timezone': 'auto',
            'forecast_days': min(days, 16),
        }
        response = requests.get(OPEN_METEO_BASE, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        daily = data.get('daily', {})
        dates = daily.get('time', [])
        temp_maxs = daily.get('temperature_2m_max', [])
        temp_mins = daily.get('temperature_2m_min', [])
        rain_sums = daily.get('rain_sum', [])
        weather_codes = daily.get('weather_code', [])

        forecast_days = []
        total_rain = 0.0

        for i in range(len(dates)):
            rain = rain_sums[i] if i < len(rain_sums) else 0.0
            total_rain += rain or 0.0
            code = weather_codes[i] if i < len(weather_codes) else 0

            forecast_days.append({
                'date': dates[i],
                'temperature_max': temp_maxs[i] if i < len(temp_maxs) else None,
                'temperature_min': temp_mins[i] if i < len(temp_mins) else None,
                'rain_sum_mm': rain,
                'condition': WMO_CODES.get(code, 'Unknown'),
                'weather_code': code,
            })

        # Compute cumulative flood risk from forecast
        if total_rain > 100:
            forecast_risk = 'critical'
        elif total_rain > 50:
            forecast_risk = 'high'
        elif total_rain > 20:
            forecast_risk = 'moderate'
        else:
            forecast_risk = 'low'

        # Cache the forecast JSON
        WeatherData.objects.update_or_create(
            lat=round(lat, 2),
            lng=round(lng, 2),
            defaults={
                'temperature': temp_maxs[0] if temp_maxs else 0,
                'humidity': 0,
                'rainfall_mm': rain_sums[0] if rain_sums else 0,
                'wind_speed': 0,
                'condition': WMO_CODES.get(weather_codes[0], 'Unknown') if weather_codes else 'Unknown',
                'forecast_json': {'days': forecast_days},
            },
        )

        return {
            'location': {'lat': lat, 'lng': lng},
            'days': forecast_days,
            'summary': {
                'total_rainfall_mm': round(total_rain, 1),
                'forecast_risk_level': forecast_risk,
                'rainy_days': sum(1 for d in forecast_days if (d.get('rain_sum_mm') or 0) > 0.5),
            },
        }

    except requests.RequestException as e:
        logger.error(f"Open-Meteo forecast request failed: {e}")
        return {
            'error': 'Failed to fetch forecast data',
            'detail': str(e),
        }
