import hashlib
import os
import time
import uuid
import jwt
from database import get_connection
from config import Config

def hash_password(password: str, salt: str = None) -> str:
    salt = salt or os.urandom(16).hex()
    digest = hashlib.sha256((salt + password).encode()).hexdigest()
    return f"{salt}${digest}"

def verify_password(password: str, stored: str) -> bool:
    salt, _ = stored.split("$")
    return hash_password(password, salt) == stored

def register_user(email: str, password: str, role: str = "inspector"):
    with get_connection() as conn:
        user_id = str(uuid.uuid4())
        conn.execute(
            "INSERT INTO users (id, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)",
            (user_id, email, hash_password(password), role, str(int(time.time()))),
        )
        return {"id": user_id, "email": email, "role": role}

def issue_token(user: dict) -> str:
    """Create a real, signed JWT that expires after Config.JWT_EXPIRY_HOURS."""
    now = int(time.time())
    payload = {
        "sub": user["id"],
        "email": user["email"],
        "role": user["role"],
        "iat": now,
        "exp": now + Config.JWT_EXPIRY_HOURS * 3600,
    }
    return jwt.encode(payload, Config.SECRET_KEY, algorithm="HS256")

def decode_token(token: str):
    """Validate a JWT's signature and expiry. Returns the payload, or None if invalid/expired."""
    try:
        return jwt.decode(token, Config.SECRET_KEY, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def authenticate(email: str, password: str):
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
        if row and verify_password(password, row["password_hash"]):
            user = {"id": row["id"], "email": row["email"], "role": row["role"]}
            token = issue_token(user)
            return {"token": token, "user": user}
        return None
