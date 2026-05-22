"""
AI Analysis Service - Gemini Vision Integration.

Sends images and/or coordinates to Google Gemini for flood risk
analysis. Returns structured assessment of road conditions, drainage,
potholes, elevation risk, and overall flood risk percentage.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any

import requests

logger = logging.getLogger(__name__)


def _get_analysis_prompt(lat: float | None = None, lng: float | None = None) -> str:
    """Build the structured prompt for Gemini flood analysis."""
    location_context = ""
    if lat is not None and lng is not None:
        location_context = f"""
The image/location is at coordinates: latitude {lat}, longitude {lng}.
Consider the geographic and topographic characteristics of this region.
"""

    return f"""You are an expert flood risk analyst. Analyze this image/location for flood vulnerability.
{location_context}
Evaluate the following factors:
1. **Road Conditions**: Look for cracks, wear, water damage, pooling areas
2. **Drainage Systems**: Check visibility and condition of drains, gutters, channels
3. **Potholes**: Count visible potholes or depressions that could collect water
4. **Low-lying Areas**: Identify depressions or areas prone to water accumulation
5. **Vegetation**: Note vegetation that may indicate waterlogged soil
6. **Slope & Elevation**: Assess terrain slope and elevation risk
7. **Nearby Water Bodies**: Note proximity to rivers, canals, or water sources

Return your analysis as a JSON object with EXACTLY these fields:
{{
    "risk_percentage": <integer 0-100>,
    "road_condition": "<one of: good, fair, poor, critical>",
    "drain_status": "<one of: clear, partial, blocked>",
    "pothole_count": <integer>,
    "elevation_risk": "<one of: flat, slight_slope, significant_slope, depression>",
    "analysis_text": "<detailed paragraph describing all observations and risk factors>",
    "recommendations": ["<recommendation 1>", "<recommendation 2>", "..."]
}}

Return ONLY the JSON object, no other text."""


def _parse_gemini_response(response_text: str) -> dict[str, Any]:
    """Parse Gemini response text, extracting JSON from possible markdown wrapping."""
    text = response_text.strip()

    # Strip markdown code fences if present
    if text.startswith('```'):
        lines = text.split('\n')
        # Remove first line (```json) and last line (```)
        lines = [line for line in lines if not line.strip().startswith('```')]
        text = '\n'.join(lines).strip()

    return json.loads(text)


def _get_fallback_analysis(lat: float | None = None, lng: float | None = None) -> dict[str, Any]:
    """Return fallback mock analysis when Gemini is unavailable."""
    return {
        'risk_percentage': 45,
        'road_condition': 'fair',
        'drain_status': 'partial',
        'pothole_count': 3,
        'elevation_risk': 'slight_slope',
        'analysis_text': (
            'Automated fallback analysis: The area shows moderate flood risk. '
            'Road surfaces appear to have some wear with potential water pooling areas. '
            'Drainage systems may be partially obstructed. '
            'The terrain has a slight slope which could redirect water flow. '
            f'Location: ({lat}, {lng}).' if lat else
            'Unable to perform live AI analysis. This is an estimated assessment.'
        ),
        'recommendations': [
            'Clear drainage channels regularly',
            'Monitor water levels during heavy rainfall',
            'Repair road surface potholes to prevent water accumulation',
            'Install additional flood barriers in low-lying sections',
        ],
    }


def _fetch_street_view_image(lat: float, lng: float) -> bytes | None:
    """Fetch a Street View static image for the given coordinates."""
    api_key = os.environ.get('GOOGLE_MAPS_API_KEY', '')
    if not api_key:
        return None

    params = {
        'size': '640x640',
        'location': f'{lat},{lng}',
        'fov': 80,
        'pitch': 0,
        'key': api_key,
    }

    try:
        response = requests.get(
            'https://maps.googleapis.com/maps/api/streetview',
            params=params,
            timeout=12,
        )
        response.raise_for_status()
        content_type = response.headers.get('Content-Type', '')
        if not content_type.startswith('image/'):
            logger.warning('Street View response did not return an image')
            return None
        return response.content
    except requests.RequestException as exc:
        logger.warning(f'Street View request failed: {exc}')
        return None


def analyze_image(
    image_bytes: bytes | None = None,
    image_url: str | None = None,
    lat: float | None = None,
    lng: float | None = None,
    prefer_street_view: bool = False,
) -> dict[str, Any]:
    """
    Analyze an image or location for flood risk using Google Gemini.

    Args:
        image_bytes: Raw image file bytes (optional).
        image_url: URL of the image to analyze (optional).
        lat: Latitude of the location (optional).
        lng: Longitude of the location (optional).

    Returns:
        Dictionary with structured flood risk analysis data.
    """
    api_key = os.environ.get('GEMINI_API_KEY', '')
    if not api_key:
        logger.warning("GEMINI_API_KEY not set, returning fallback analysis")
        return _get_fallback_analysis(lat, lng)

    try:
        import google.generativeai as genai

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-1.5-flash')

        prompt = _get_analysis_prompt(lat, lng)
        content_parts: list[Any] = []

        if not image_bytes and not image_url and prefer_street_view and lat is not None and lng is not None:
            image_bytes = _fetch_street_view_image(lat, lng)

        if image_bytes:
            # Upload image bytes directly
            import PIL.Image
            import io
            img = PIL.Image.open(io.BytesIO(image_bytes))
            content_parts.append(img)
            content_parts.append(prompt)
        elif image_url:
            # Use URL reference in prompt
            content_parts.append(
                f"Analyze the image at this URL: {image_url}\n\n{prompt}"
            )
        else:
            # Coordinate-only analysis
            content_parts.append(
                f"Based on general knowledge of the area at coordinates "
                f"({lat}, {lng}), provide a flood risk assessment.\n\n{prompt}"
            )

        response = model.generate_content(content_parts)

        if not response or not response.text:
            logger.warning("Empty response from Gemini, using fallback")
            return _get_fallback_analysis(lat, lng)

        parsed = _parse_gemini_response(response.text)

        # Validate required fields exist
        required_fields = [
            'risk_percentage', 'road_condition', 'drain_status',
            'pothole_count', 'elevation_risk', 'analysis_text',
        ]
        for field in required_fields:
            if field not in parsed:
                logger.warning(f"Missing field '{field}' in Gemini response, using fallback")
                return _get_fallback_analysis(lat, lng)

        # Clamp risk_percentage to valid range
        parsed['risk_percentage'] = max(0, min(100, int(parsed['risk_percentage'])))
        parsed.setdefault('recommendations', [])

        return parsed

    except ImportError:
        logger.error("google-generativeai package not installed")
        return _get_fallback_analysis(lat, lng)
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Gemini JSON response: {e}")
        return _get_fallback_analysis(lat, lng)
    except Exception as e:
        logger.error(f"Gemini analysis failed: {e}")
        return _get_fallback_analysis(lat, lng)
