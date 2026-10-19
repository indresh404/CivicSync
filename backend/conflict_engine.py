import math
from datetime import date, timedelta
from typing import Optional, Tuple, Dict, Any

EARTH_RADIUS_METERS = 6371000.0

UTILITY_TYPES = {"Pipeline", "Cabling", "Sewerage", "Gas line"}
SURFACE_TYPES = {"Resurfacing"}

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great-circle distance between two points in meters."""
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2))
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))

    return EARTH_RADIUS_METERS * c

def point_to_segment_distance(
    px: float, py: float, x1: float, y1: float, x2: float, y2: float
) -> float:
    """Distance from point (px, py) to line segment (x1, y1)-(x2, y2) in meters."""
    # Approximate locally using flat projection for short segments
    dx = x2 - x1
    dy = y2 - y1
    if dx == 0 and dy == 0:
        return haversine_distance(px, py, x1, y1)

    # Parameter t of the closest point on segment
    t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)
    t = max(0.0, min(1.0, t))
    closest_lat = x1 + t * dx
    closest_lon = y1 + t * dy
    return haversine_distance(px, py, closest_lat, closest_lon)

def calculate_project_distance(proj_a: Any, proj_b: Any) -> float:
    """Calculate distance between two projects, taking optional line segments into account."""
    lat_a = proj_a.latitude
    lon_a = proj_a.longitude
    lat_b = proj_b.latitude
    lon_b = proj_b.longitude

    # Basic point-to-point
    min_dist = haversine_distance(lat_a, lon_a, lat_b, lon_b)

    # Check line segment on A
    if getattr(proj_a, "end_latitude", None) and getattr(proj_a, "end_longitude", None):
        d_b_to_line_a = point_to_segment_distance(
            lat_b, lon_b, lat_a, lon_a, proj_a.end_latitude, proj_a.end_longitude
        )
        min_dist = min(min_dist, d_b_to_line_a)

    # Check line segment on B
    if getattr(proj_b, "end_latitude", None) and getattr(proj_b, "end_longitude", None):
        d_a_to_line_b = point_to_segment_distance(
            lat_a, lon_a, lat_b, lon_b, proj_b.end_latitude, proj_b.end_longitude
        )
        min_dist = min(min_dist, d_a_to_line_b)

    return round(min_dist, 2)

def check_date_overlap(
    start_a: date, end_a: date, start_b: date, end_b: date
) -> Tuple[bool, Optional[date], Optional[date], int]:
    """
    Check if two date intervals overlap (inclusive).
    Condition: start_a <= end_b AND start_b <= end_a
    """
    if start_a <= end_b and start_b <= end_a:
        overlap_start = max(start_a, start_b)
        overlap_end = min(end_a, end_b)
        overlapping_days = (overlap_end - overlap_start).days + 1
        return True, overlap_start, overlap_end, overlapping_days
    return False, None, None, 0

def calculate_severity(
    distance: float,
    threshold: float,
    overlapping_days: int,
    road_type_a: str,
    road_type_b: str
) -> Dict[str, Any]:
    """
    Calculate deterministic normalized weighted severity score.
    Weights:
      - proximity_weight = 0.45
      - overlap_weight = 0.35
      - road_weight = 0.20
    Sum of weights = 1.0. All component scores in range [0, 100].
    """
    # Proximity score: closer -> higher score
    proximity_ratio = max(0.0, 1.0 - (distance / max(threshold, 1.0)))
    proximity_score = round(proximity_ratio * 100.0, 2)

    # Overlap score: up to 10 days = 100
    overlap_score = round(min(100.0, max(0.0, overlapping_days * 10.0)), 2)

    # Road importance score: Arterial = 100, Residential = 40
    is_arterial = (road_type_a == "Arterial" or road_type_b == "Arterial")
    road_score = 100.0 if is_arterial else 40.0

    # Total severity score
    severity_score = round(
        0.45 * proximity_score + 0.35 * overlap_score + 0.20 * road_score, 2
    )

    if severity_score >= 70.0:
        level = "High"
    elif severity_score >= 40.0:
        level = "Medium"
    else:
        level = "Low"

    return {
        "proximity_score": proximity_score,
        "overlap_score": overlap_score,
        "road_importance_score": road_score,
        "severity_score": severity_score,
        "severity_level": level,
    }

def generate_sequencing_recommendation(
    proj_a: Any,
    proj_b: Any,
    overlap_start: date,
    overlap_end: date,
    overlapping_days: int
) -> Dict[str, str]:
    """
    Deterministic domain rule:
    Underground/utility work (pipeline, cabling, sewerage, gas line) must precede surface work (resurfacing).
    """
    type_a = proj_a.project_type
    type_b = proj_b.project_type

    is_util_a = type_a in UTILITY_TYPES
    is_surf_a = type_a in SURFACE_TYPES

    is_util_b = type_b in UTILITY_TYPES
    is_surf_b = type_b in SURFACE_TYPES

    # Case 1: Utility vs Surface
    if (is_util_a and is_surf_b) or (is_util_b and is_surf_a):
        util_proj = proj_a if is_util_a else proj_b
        surf_proj = proj_b if is_util_a else proj_a

        # Feasible suggested sequence
        util_duration = (util_proj.end_date - util_proj.start_date).days
        surf_duration = (surf_proj.end_date - surf_proj.start_date).days

        # Suggested dates: Utility proceeds on its start date or earliest date, surface follows after
        suggested_util_start = min(util_proj.start_date, surf_proj.start_date)
        suggested_util_end = suggested_util_start + timedelta(days=util_duration)
        suggested_surf_start = suggested_util_end + timedelta(days=2) # 2 days buffer for compaction
        suggested_surf_end = suggested_surf_start + timedelta(days=surf_duration)

        suggested_dates_str = (
            f"Phase 1 ({util_proj.department}): {suggested_util_start.strftime('%d %b %Y')} – "
            f"{suggested_util_end.strftime('%d %b %Y')}; "
            f"Phase 2 ({surf_proj.department}): {suggested_surf_start.strftime('%d %b %Y')} – "
            f"{suggested_surf_end.strftime('%d %b %Y')}"
        )

        recommendation = (
            f"Domain Precedence Rule: Underground utility work ({util_proj.department} {util_proj.project_type}) "
            f"must be completed before road surface resurfacing ({surf_proj.department} {surf_proj.project_type}). "
            f"This prevents premature excavation of newly asphalted roadway. "
            f"Proposed execution sequence: Complete {util_proj.name} first, followed by {surf_proj.name}."
        )

        return {
            "suggested_sequence": recommendation,
            "suggested_dates": suggested_dates_str,
            "rule_applied": "Utility-before-surface domain precedence rule"
        }

    # Case 2: Both are Utility
    if is_util_a and is_util_b:
        return {
            "suggested_sequence": (
                f"Both projects ({proj_a.department} {proj_a.project_type} and {proj_b.department} {proj_b.project_type}) "
                f"involve underground utility infrastructure. No automatic precedence rule is configured. "
                f"Recommendation: Joint trench-sharing coordination meeting between {proj_a.department} and {proj_b.department} "
                f"to determine duct/pipe depth hierarchy and unified traffic management."
            ),
            "suggested_dates": "Requires inter-departmental scheduling agreement.",
            "rule_applied": "Manual utility coordination (symmetric infrastructure)"
        }

    # Case 3: Both are Surface or Other
    return {
        "suggested_sequence": (
            f"Projects ({proj_a.department} and {proj_b.department}) have overlapping spatial scopes. "
            f"No automatic domain precedence rule configured for these project types. "
            f"Recommendation: Stagger road closures or coordinate lane-by-lane work."
        ),
        "suggested_dates": "Requires inter-departmental scheduling agreement.",
        "rule_applied": "Manual coordination"
    }
