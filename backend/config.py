import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent

# Load local environment variables (.env.local or .env)
load_dotenv(BASE_DIR.parent / ".env.local")
load_dotenv(BASE_DIR.parent / ".env")
load_dotenv()

# Port configuration (default 5000 as requested)
PORT = int(os.getenv("PORT", "5000"))

# Database Configuration
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    sqlite_path = BASE_DIR / "civicsync.db"
    DATABASE_URL = f"sqlite:///{sqlite_path}"

# MongoDB Atlas connection string
MONGO_URI = os.getenv("MONGO_URI", "")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "civicsync")

# JWT Secret & Auth config
JWT_SECRET = os.getenv("JWT_SECRET", "mySuperSecretKey")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Conflict Engine Business Constants
CONFLICT_DISTANCE_THRESHOLD_METERS = float(os.getenv("CONFLICT_THRESHOLD_METERS", "50.0"))
ASSUMED_COST_PER_REDIG = float(os.getenv("ASSUMED_COST_PER_REDIG", "350000.0"))  # INR
COOLDOWN_MONTHS = int(os.getenv("COOLDOWN_MONTHS", "24"))
MONSOON_START = os.getenv("MONSOON_START", "06-01")  # June 1
MONSOON_END = os.getenv("MONSOON_END", "09-30")      # Sept 30

# Severity weights (must sum to 1.0)
WEIGHT_CLOSENESS = 0.45
WEIGHT_OVERLAP = 0.35
WEIGHT_ROAD_IMPORTANCE = 0.20

# Geographic center context: Mira Road (Mumbai MMR / MBMC Jurisdiction)
DEFAULT_CITY_CENTER = {"lat": 19.2812, "lng": 72.8561, "city": "Mira Road (Mumbai MMR)"}

# Frontend CORS origins
CORS_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5000",
    "http://127.0.0.1:5000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]
