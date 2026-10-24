import hashlib
import hmac
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from backend.config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRATION_HOURS

security = HTTPBearer(auto_error=False)

def hash_password(password: str) -> str:
    """Generate deterministic salted SHA-256 hash."""
    salt = "civicsync_salt_2026"
    return hashlib.sha256((password + salt).encode("utf-8")).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plain password against hashed password."""
    return hmac.compare_digest(hash_password(plain_password), hashed_password)

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Generate signed JWT token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta if expires_delta else timedelta(hours=JWT_EXPIRATION_HOURS)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and validate signed JWT token."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None

# Seed Departments definition
DEPARTMENTS = [
    {"id": "DEPT-ROADS", "name": "Roads Department", "color": "#2563EB"},
    {"id": "DEPT-WATER", "name": "Water Department", "color": "#06B6D4"},
    {"id": "DEPT-ELEC", "name": "Electricity Department", "color": "#F59E0B"},
    {"id": "DEPT-SEWER", "name": "Sewerage Department", "color": "#10B981"},
    {"id": "DEPT-TELE", "name": "Telecom Department", "color": "#8B5CF6"},
    {"id": "DEPT-GAS", "name": "Gas Department", "color": "#EC4899"},
]

# Pre-defined system users (All passwords: CivicSync2026!)
DEFAULT_PASSWORD_HASH = hash_password("CivicSync2026!")

PRESET_USERS = [
    {
        "id": "USR-ADMIN",
        "email": "admin@civicsync.gov",
        "name": "Rajesh Sharma (City Commissioner)",
        "department_id": "DEPT-ROADS",
        "department_name": "Municipal Administration",
        "role": "ADMIN",
        "password_hash": DEFAULT_PASSWORD_HASH,
    },
    {
        "id": "USR-ROADS",
        "email": "roads@civicsync.gov",
        "name": "Amit Patil (Chief Roads Engineer)",
        "department_id": "DEPT-ROADS",
        "department_name": "Roads Department",
        "role": "DEPARTMENT_USER",
        "password_hash": DEFAULT_PASSWORD_HASH,
    },
    {
        "id": "USR-WATER",
        "email": "water@civicsync.gov",
        "name": "Priya Deshmukh (Water Works Officer)",
        "department_id": "DEPT-WATER",
        "department_name": "Water Department",
        "role": "DEPARTMENT_USER",
        "password_hash": DEFAULT_PASSWORD_HASH,
    },
    {
        "id": "USR-ELEC",
        "email": "electricity@civicsync.gov",
        "name": "Sunil Nair (Superintending Engineer)",
        "department_id": "DEPT-ELEC",
        "department_name": "Electricity Department",
        "role": "DEPARTMENT_USER",
        "password_hash": DEFAULT_PASSWORD_HASH,
    },
    {
        "id": "USR-SEWER",
        "email": "sewerage@civicsync.gov",
        "name": "Kavita Rao (Sanitation Director)",
        "department_id": "DEPT-SEWER",
        "department_name": "Sewerage Department",
        "role": "DEPARTMENT_USER",
        "password_hash": DEFAULT_PASSWORD_HASH,
    },
    {
        "id": "USR-TELE",
        "email": "telecom@civicsync.gov",
        "name": "Vikram Mehta (Digital Infrastructure Lead)",
        "department_id": "DEPT-TELE",
        "department_name": "Telecom Department",
        "role": "DEPARTMENT_USER",
        "password_hash": DEFAULT_PASSWORD_HASH,
    },
    {
        "id": "USR-GAS",
        "email": "gas@civicsync.gov",
        "name": "Farhan Khan (Gas Utility Inspector)",
        "department_id": "DEPT-GAS",
        "department_name": "Gas Department",
        "role": "DEPARTMENT_USER",
        "password_hash": DEFAULT_PASSWORD_HASH,
    },
]

def get_current_user_optional(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[Dict[str, Any]]:
    """Extract current user from Bearer JWT token if provided."""
    if not auth or not auth.credentials:
        return None
    payload = decode_access_token(auth.credentials)
    if not payload:
        return None
    user_id = payload.get("sub")
    user = next((u for u in PRESET_USERS if u["id"] == user_id or u["email"] == user_id), None)
    if user:
        return user
    return {
        "id": user_id,
        "email": payload.get("email", ""),
        "name": payload.get("name", "User"),
        "department_id": payload.get("department_id", "DEPT-ROADS"),
        "department_name": payload.get("department_name", "Municipal"),
        "role": payload.get("role", "DEPARTMENT_USER"),
    }

def get_current_user(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Dict[str, Any]:
    """Enforce authenticated user via JWT."""
    user = get_current_user_optional(auth)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authentication token. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

def require_admin(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """Enforce ADMIN role."""
    if user.get("role") != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Action requires ADMIN municipal privileges.",
        )
    return user
