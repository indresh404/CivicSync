import math
from datetime import date, datetime, timedelta
from typing import Optional, Tuple, Dict, Any, List

EARTH_RADIUS_METERS = 6371000.0

UNDERGROUND_TYPES = {"Pipeline", "Cabling", "Sewerage", "Gas line"}
SURFACE_TYPES = {"Resurfacing"}

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate great-circle distance between two points in meters using Haversine formula."""
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2)
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return EARTH_RADIUS_METERS * c

def sample_line_points(lat1: float, lon1: float, lat2: float, lon2: float, num_samples: int = 15) -> List[Tuple[float, float]]:
    """Sample equidistant coordinates along a line segment for deterministic spatial collision detection."""
    points = []
    for i in range(num_samples):
        t = i / (num_samples - 1) if num_samples > 1 else 0.0
        s_lat = lat1 + t * (lat2 - lat1)
        s_lon = lon1 + t * (lon2 - lon1)
        points.append((s_lat, s_lon))
    return points

def point_to_segment_distance(
    px: float, py: float, x1: float, y1: float, x2: float, y2: float
) -> float:
    """Distance from point (px, py) to line segment (x1, y1)-(x2, y2) in meters."""
    dx = x2 - x1
    dy = y2 - y1
    if dx == 0 and dy == 0:
        return haversine_distance(px, py, x1, y1)

    t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)
    t = max(0.0, min(1.0, t))
    closest_lat = x1 + t * dx
    closest_lon = y1 + t * dy
    return haversine_distance(px, py, closest_lat, closest_lon)

def calculate_project_distance(proj_a: Any, proj_b: Any) -> float:
    """
    Calculate minimum distance between two projects.
    Supports point-to-point, point-to-line, and line-to-line via sampled points.
    """
    lat_a = getattr(proj_a, "lat", getattr(proj_a, "latitude", None))
    lon_a = getattr(proj_a, "lng", getattr(proj_a, "longitude", None))
    end_lat_a = getattr(proj_a, "end_lat", getattr(proj_a, "end_latitude", None))
    end_lng_a = getattr(proj_a, "end_lng", getattr(proj_a, "end_longitude", None))

    lat_b = getattr(proj_b, "lat", getattr(proj_b, "latitude", None))
    lon_b = getattr(proj_b, "lng", getattr(proj_b, "longitude", None))
    end_lat_b = getattr(proj_b, "end_lat", getattr(proj_b, "end_latitude", None))
    end_lng_b = getattr(proj_b, "end_lng", getattr(proj_b, "end_longitude", None))

    if lat_a is None or lon_a is None or lat_b is None or lon_b is None:
        return 999999.0

    is_line_a = end_lat_a is not None and end_lng_a is not None
    is_line_b = end_lat_b is not None and end_lng_b is not None

    # Line to Line: Sample equidistant points on both segments
    if is_line_a and is_line_b:
        samples_a = sample_line_points(lat_a, lon_a, end_lat_a, end_lng_a, 15)
        samples_b = sample_line_points(lat_b, lon_b, end_lat_b, end_lng_b, 15)
        min_dist = float("inf")
        for sa in samples_a:
            for sb in samples_b:
                d = haversine_distance(sa[0], sa[1], sb[0], sb[1])
                if d < min_dist:
                    min_dist = d
        return round(min_dist, 2)

    # Line A to Point B
    if is_line_a and not is_line_b:
        d = point_to_segment_distance(lat_b, lon_b, lat_a, lon_a, end_lat_a, end_lng_a)
        return round(d, 2)

    # Point A to Line B
    if not is_line_a and is_line_b:
        d = point_to_segment_distance(lat_a, lon_a, lat_b, lon_b, end_lat_b, end_lng_b)
        return round(d, 2)

    # Point A to Point B
    return round(haversine_distance(lat_a, lon_a, lat_b, lon_b), 2)

def check_date_overlap(
    start_a: date, end_a: date, start_b: date, end_b: date
) -> Tuple[bool, Optional[date], Optional[date], int]:
    """Check if two date intervals overlap (inclusive). Returns (has_overlap, start, end, days)."""
    if isinstance(start_a, str):
        start_a = date.fromisoformat(start_a)
    if isinstance(end_a, str):
        end_a = date.fromisoformat(end_a)
    if isinstance(start_b, str):
        start_b = date.fromisoformat(start_b)
    if isinstance(end_b, str):
        end_b = date.fromisoformat(end_b)

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
    road_type_b: str,
    w1: float = 0.45,
    w2: float = 0.35,
    w3: float = 0.20,
) -> Dict[str, Any]:
    """
    Business Rule 2:
    severity = w1*closeness + w2*days_overlapping + w3*road_importance.
    All factors normalized to [0, 1].
    Bands:
      - Low < 0.33
      - Medium < 0.66
      - High >= 0.66
    """
    # 1. Closeness (0 to 1): 1.0 when distance = 0, 0.0 when distance >= threshold
    closeness = max(0.0, 1.0 - (distance / max(threshold, 1.0)))

    # 2. Overlapping days (0 to 1): normalized up to 10 days
    days_norm = min(1.0, max(0.0, overlapping_days / 10.0))

    # 3. Road importance (0 to 1): Arterial = 1.0, Residential = 0.40
    is_arterial = (str(road_type_a).lower() == "arterial" or str(road_type_b).lower() == "arterial")
    road_importance = 1.0 if is_arterial else 0.40

    # Total score between 0.0 and 1.0
    score = w1 * closeness + w2 * days_norm + w3 * road_importance
    score = round(score, 4)

    # Qualitative Bands
    if score >= 0.66:
        level = "High"
    elif score >= 0.33:
        level = "Medium"
    else:
        level = "Low"

    breakdown = {
        "closeness": round(closeness, 4),
        "days_overlapping": round(days_norm, 4),
        "road_importance": round(road_importance, 4),
        "raw_distance_m": round(distance, 2),
        "raw_overlapping_days": overlapping_days,
        "is_arterial": is_arterial,
        "weights": {"w1_closeness": w1, "w2_overlap": w2, "w3_road": w3},
        "formula": "0.45*closeness + 0.35*days_overlapping + 0.20*road_importance",
    }

    return {
        "proximity_score": round(closeness * 100.0, 2),
        "overlap_score": round(days_norm * 100.0, 2),
        "road_importance_score": round(road_importance * 100.0, 2),
        "severity_score": round(score * 100.0, 2),  # Percentage for UI (0-100)
        "severity_ratio": score,                     # Normalized ratio (0-1)
        "severity_level": level,                     # High / Medium / Low
        "severity_breakdown": breakdown,
    }

def generate_sequencing_recommendation(
    proj_a: Any,
    proj_b: Any,
    overlap_start: Optional[date] = None,
    overlap_end: Optional[date] = None,
    overlapping_days: int = 0
) -> Dict[str, str]:
    """
    Business Rule 3:
    Underground work (Pipeline, Cabling, Sewerage, Gas line) goes BEFORE surface work (Resurfacing).
    Outputs exact suggested dates.
    Same-category conflicts: earlier start goes first.
    """
    type_a = getattr(proj_a, "project_type", "")
    type_b = getattr(proj_b, "project_type", "")
    dept_a = getattr(proj_a, "department", getattr(proj_a, "department_id", "Dept A"))
    dept_b = getattr(proj_b, "department", getattr(proj_b, "department_id", "Dept B"))
    title_a = getattr(proj_a, "title", getattr(proj_a, "name", "Project A"))
    title_b = getattr(proj_b, "title", getattr(proj_b, "name", "Project B"))

    start_a = getattr(proj_a, "start_date")
    end_a = getattr(proj_a, "end_date")
    start_b = getattr(proj_b, "start_date")
    end_b = getattr(proj_b, "end_date")

    if isinstance(start_a, str):
        start_a = date.fromisoformat(start_a)
    if isinstance(end_a, str):
        end_a = date.fromisoformat(end_a)
    if isinstance(start_b, str):
        start_b = date.fromisoformat(start_b)
    if isinstance(end_b, str):
        end_b = date.fromisoformat(end_b)

    dur_a = (end_a - start_a).days
    dur_b = (end_b - start_b).days

    is_underground_a = type_a in UNDERGROUND_TYPES
    is_surface_a = type_a in SURFACE_TYPES
    is_underground_b = type_b in UNDERGROUND_TYPES
    is_surface_b = type_b in SURFACE_TYPES

    # Rule 3.1: Underground before Surface
    if is_underground_a and is_surface_b:
        # A before B
        phase1_start = min(start_a, start_b)
        phase1_end = phase1_start + timedelta(days=dur_a)
        phase2_start = phase1_end + timedelta(days=2)  # 2-day curing & compaction buffer
        phase2_end = phase2_start + timedelta(days=dur_b)

        msg = (
            f"Complete {dept_a} {type_a} ({phase1_start.strftime('%d %b')} – {phase1_end.strftime('%d %b %Y')}) "
            f"before {dept_b} {type_b} ({phase2_start.strftime('%d %b')} – {phase2_end.strftime('%d %b %Y')})."
        )
        return {
            "suggested_sequence": msg,
            "suggested_dates": f"{phase1_start.isoformat()} to {phase2_end.isoformat()}",
            "order": f"{title_a} -> {title_b}",
            "rule_applied": "Underground work precedes surface resurfacing"
        }

    if is_surface_a and is_underground_b:
        # B before A
        phase1_start = min(start_a, start_b)
        phase1_end = phase1_start + timedelta(days=dur_b)
        phase2_start = phase1_end + timedelta(days=2)
        phase2_end = phase2_start + timedelta(days=dur_a)

        msg = (
            f"Complete {dept_b} {type_b} ({phase1_start.strftime('%d %b')} – {phase1_end.strftime('%d %b %Y')}) "
            f"before {dept_a} {type_a} ({phase2_start.strftime('%d %b')} – {phase2_end.strftime('%d %b %Y')})."
        )
        return {
            "suggested_sequence": msg,
            "suggested_dates": f"{phase1_start.isoformat()} to {phase2_end.isoformat()}",
            "order": f"{title_b} -> {title_a}",
            "rule_applied": "Underground work precedes surface resurfacing"
        }

    # Rule 3.2: Same category -> earlier scheduled start goes first
    if start_a <= start_b:
        first_proj = (dept_a, type_a, title_a, dur_a)
        second_proj = (dept_b, type_b, title_b, dur_b)
    else:
        first_proj = (dept_b, type_b, title_b, dur_b)
        second_proj = (dept_a, type_a, title_a, dur_a)

    p1_start = min(start_a, start_b)
    p1_end = p1_start + timedelta(days=first_proj[3])
    p2_start = p1_end + timedelta(days=1)
    p2_end = p2_start + timedelta(days=second_proj[3])

    seq_msg = (
        f"Same-category prioritization: Complete {first_proj[0]} {first_proj[1]} "
        f"({p1_start.strftime('%d %b')} – {p1_end.strftime('%d %b %Y')}) before {second_proj[0]} {second_proj[1]} "
        f"({p2_start.strftime('%d %b')} – {p2_end.strftime('%d %b %Y')}) to prevent concurrent disruption."
    )
    return {
        "suggested_sequence": seq_msg,
        "suggested_dates": f"{p1_start.isoformat()} to {p2_end.isoformat()}",
        "order": f"{first_proj[2]} -> {second_proj[2]}",
        "rule_applied": "Earlier scheduled start domain precedence"
    }

def check_cooldown_warning(
    road_name: str,
    new_project_type: str,
    recent_resurfacing_end_date: Optional[date],
    reference_date: Optional[date] = None,
    cooldown_months: int = 24
) -> Optional[Dict[str, Any]]:
    """
    Business Rule 4:
    If a Resurfacing project on the same road completed within cooldown_months (24 mos)
    and the new project is underground work, add warning:
    'Road resurfaced X months ago' and require a justification note.
    """
    if new_project_type not in UNDERGROUND_TYPES or not recent_resurfacing_end_date:
        return None

    ref = reference_date or date.today()
    if isinstance(recent_resurfacing_end_date, str):
        recent_resurfacing_end_date = date.fromisoformat(recent_resurfacing_end_date)

    diff_days = (ref - recent_resurfacing_end_date).days
    diff_months = max(0, int(diff_days / 30.4375))

    if diff_months < cooldown_months:
        return {
            "has_warning": True,
            "months_ago": diff_months,
            "cooldown_months": cooldown_months,
            "warning": f"Road resurfaced {diff_months} months ago (Municipal Cooldown policy is {cooldown_months} months). Requires mandatory departmental justification note.",
            "requires_justification": True,
        }
    return None

def check_monsoon_warning(
    start_date: Any,
    end_date: Any,
    monsoon_start_str: str = "06-01",
    monsoon_end_str: str = "09-30"
) -> Optional[Dict[str, Any]]:
    """
    Business Rule 5:
    If dates fall in the monsoon window (06-01 to 09-30), show a non-blocking warning.
    """
    if isinstance(start_date, str):
        start_date = date.fromisoformat(start_date)
    if isinstance(end_date, str):
        end_date = date.fromisoformat(end_date)

    # Check for years involved
    years = {start_date.year, end_date.year}
    for yr in years:
        m_start = date(yr, int(monsoon_start_str.split("-")[0]), int(monsoon_start_str.split("-")[1]))
        m_end = date(yr, int(monsoon_end_str.split("-")[0]), int(monsoon_end_str.split("-")[1]))

        if start_date <= m_end and end_date >= m_start:
            return {
                "has_warning": True,
                "monsoon_window": f"{monsoon_start_str} to {monsoon_end_str}",
                "warning": "Monsoon window alert (01 June – 30 September): Excavations during this period carry flood, waterlogging, and trench-wall collapse risks. Non-blocking municipal advisory.",
            }
    return None
