import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

# Check for DATABASE_URL; fallback to SQLite local file database
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    # Use SQLite for reliable, deterministic local demo when PostgreSQL is not configured
    sqlite_path = BASE_DIR / "civicsync.db"
    DATABASE_URL = f"sqlite:///{sqlite_path}"

# Haversine distance conflict threshold in meters
CONFLICT_DISTANCE_THRESHOLD_METERS = float(os.getenv("CONFLICT_THRESHOLD_METERS", "50.0"))

# Cost avoidance assumption: average cost in Indian Rupees (₹) per prevented municipal re-excavation
ASSUMED_COST_PER_REDIG = float(os.getenv("ASSUMED_COST_PER_REDIG", "350000.0"))

# Geographic center context: Mira Road (Mumbai MMR / MBMC Jurisdiction)
DEFAULT_CITY_CENTER = {"lat": 19.2812, "lng": 72.8561, "city": "Mira Road (Mumbai MMR)"}

# Frontend CORS origin
CORS_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]
