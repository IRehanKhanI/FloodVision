"""
Route Optimization Service.

Computes routes between two points considering flood risk data.
Supports two modes:
- lowest_risk: avoids high-risk flood zones even if the route is longer
- shortest_path: direct route with risk warnings

Uses a grid-based approach with flood zone data as cost weights.
"""

from __future__ import annotations

import logging
import math
from typing import Any

logger = logging.getLogger(__name__)


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate the great-circle distance between two points in km."""
    R = 6371.0  # Earth's radius in km
    d_lat = math.radians(lat2 - lat1)
    d_lng = math.radians(lng2 - lng1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2))
        * math.sin(d_lng / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _get_flood_zones_in_region(
    min_lat: float, max_lat: float, min_lng: float, max_lng: float,
) -> list[dict]:
    """Fetch flood zones within a bounding box."""
    from floodapi.models import FloodZone
    zones = FloodZone.objects.filter(
        lat__gte=min_lat, lat__lte=max_lat,
        lng__gte=min_lng, lng__lte=max_lng,
    ).values('lat', 'lng', 'risk_level', 'risk_category', 'address')
    return list(zones)


def _compute_point_risk(
    lat: float, lng: float, flood_zones: list[dict], influence_km: float = 0.5,
) -> float:
    """
    Compute the flood risk at a specific point based on nearby flood zones.

    Uses inverse-distance weighting from nearby zones.
    """
    if not flood_zones:
        return 0.0

    total_risk = 0.0
    total_weight = 0.0

    for zone in flood_zones:
        dist = _haversine_km(lat, lng, zone['lat'], zone['lng'])
        if dist < 0.01:
            # Essentially at the zone
            return float(zone['risk_level'])
        if dist <= influence_km:
            weight = 1.0 / (dist ** 2)
            total_risk += zone['risk_level'] * weight
            total_weight += weight

    if total_weight > 0:
        return min(100.0, total_risk / total_weight)
    return 0.0


def _interpolate_waypoints(
    start_lat: float, start_lng: float,
    end_lat: float, end_lng: float,
    num_points: int = 10,
) -> list[dict[str, float]]:
    """Generate linearly interpolated waypoints between start and end."""
    waypoints = []
    for i in range(num_points + 1):
        t = i / num_points
        waypoints.append({
            'lat': start_lat + t * (end_lat - start_lat),
            'lng': start_lng + t * (end_lng - start_lng),
        })
    return waypoints


def _generate_detour_waypoints(
    start_lat: float, start_lng: float,
    end_lat: float, end_lng: float,
    flood_zones: list[dict],
    num_points: int = 12,
) -> list[dict[str, float]]:
    """
    Generate waypoints that detour around high-risk flood zones.

    Uses a simple perpendicular offset approach: for each intermediate
    point, if flood risk is high, offset perpendicular to the route.
    """
    direct_waypoints = _interpolate_waypoints(
        start_lat, start_lng, end_lat, end_lng, num_points
    )

    # Route direction vector
    d_lat = end_lat - start_lat
    d_lng = end_lng - start_lng
    length = math.sqrt(d_lat ** 2 + d_lng ** 2)
    if length == 0:
        return direct_waypoints

    # Perpendicular unit vector (rotated 90 degrees)
    perp_lat = -d_lng / length
    perp_lng = d_lat / length

    optimized = [direct_waypoints[0]]  # Keep start point

    for i in range(1, len(direct_waypoints) - 1):
        wp = direct_waypoints[i]
        risk = _compute_point_risk(wp['lat'], wp['lng'], flood_zones)

        if risk > 40:
            # Apply perpendicular offset proportional to risk
            offset_magnitude = (risk / 100.0) * 0.005  # Max ~500m offset
            # Try both directions, pick lower risk
            wp_pos = {
                'lat': wp['lat'] + perp_lat * offset_magnitude,
                'lng': wp['lng'] + perp_lng * offset_magnitude,
            }
            wp_neg = {
                'lat': wp['lat'] - perp_lat * offset_magnitude,
                'lng': wp['lng'] - perp_lng * offset_magnitude,
            }
            risk_pos = _compute_point_risk(wp_pos['lat'], wp_pos['lng'], flood_zones)
            risk_neg = _compute_point_risk(wp_neg['lat'], wp_neg['lng'], flood_zones)

            if risk_pos < risk_neg and risk_pos < risk:
                optimized.append(wp_pos)
            elif risk_neg < risk:
                optimized.append(wp_neg)
            else:
                optimized.append(wp)
        else:
            optimized.append(wp)

    optimized.append(direct_waypoints[-1])  # Keep end point
    return optimized


def optimize_route(
    start_lat: float,
    start_lng: float,
    end_lat: float,
    end_lng: float,
    optimization: str = 'lowest_risk',
) -> dict[str, Any]:
    """
    Compute an optimized route between two points.

    Args:
        start_lat: Starting latitude.
        start_lng: Starting longitude.
        end_lat: Destination latitude.
        end_lng: Destination longitude.
        optimization: 'lowest_risk' or 'shortest_path'.

    Returns:
        Dictionary with route data including waypoints, distance,
        duration estimate, risk segments, and overall status.
    """
    direct_distance = _haversine_km(start_lat, start_lng, end_lat, end_lng)

    # Get flood zones in a bounding box around the route with padding
    padding = 0.02  # ~2km padding
    min_lat = min(start_lat, end_lat) - padding
    max_lat = max(start_lat, end_lat) + padding
    min_lng = min(start_lng, end_lng) - padding
    max_lng = max(start_lng, end_lng) + padding

    flood_zones = _get_flood_zones_in_region(min_lat, max_lat, min_lng, max_lng)

    if optimization == 'lowest_risk':
        waypoints = _generate_detour_waypoints(
            start_lat, start_lng, end_lat, end_lng, flood_zones
        )
    else:
        waypoints = _interpolate_waypoints(
            start_lat, start_lng, end_lat, end_lng
        )

    # Compute total distance along waypoints
    total_distance = 0.0
    for i in range(1, len(waypoints)):
        total_distance += _haversine_km(
            waypoints[i - 1]['lat'], waypoints[i - 1]['lng'],
            waypoints[i]['lat'], waypoints[i]['lng'],
        )

    # Assess risk along each segment
    risk_segments = []
    max_risk = 0.0
    total_risk = 0.0

    for i, wp in enumerate(waypoints):
        risk = _compute_point_risk(wp['lat'], wp['lng'], flood_zones)
        max_risk = max(max_risk, risk)
        total_risk += risk
        wp['risk'] = round(risk, 1)
        wp['index'] = i

        if risk > 60:
            level = 'high'
        elif risk > 30:
            level = 'moderate'
        else:
            level = 'low'

        risk_segments.append({
            'waypoint_index': i,
            'lat': wp['lat'],
            'lng': wp['lng'],
            'risk_score': round(risk, 1),
            'risk_level': level,
        })

    avg_risk = total_risk / len(waypoints) if waypoints else 0

    # Estimate duration (assuming avg 30 km/h in urban areas)
    avg_speed_kmh = 30.0
    if max_risk > 70:
        avg_speed_kmh = 15.0  # Slow down for high risk
    elif max_risk > 40:
        avg_speed_kmh = 22.0

    duration_hours = total_distance / avg_speed_kmh if avg_speed_kmh > 0 else 0
    duration_minutes = int(duration_hours * 60)

    # Overall status
    if max_risk > 80:
        overall_status = 'blocked'
    elif max_risk > 50:
        overall_status = 'hazardous'
    else:
        overall_status = 'optimal'

    return {
        'waypoints': waypoints,
        'total_distance_km': round(total_distance, 2),
        'direct_distance_km': round(direct_distance, 2),
        'estimated_duration': f"{duration_minutes} min",
        'duration_minutes': duration_minutes,
        'max_flood_exposure': round(max_risk, 1),
        'average_risk': round(avg_risk, 1),
        'risk_segments': risk_segments,
        'overall_status': overall_status,
        'optimization_used': optimization,
        'flood_zones_considered': len(flood_zones),
        'detour_ratio': round(total_distance / direct_distance, 2) if direct_distance > 0 else 1.0,
    }
