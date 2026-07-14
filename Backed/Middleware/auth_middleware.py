# auth_middleware.py — validates a real signed JWT for protected Flask routes
from functools import wraps
from flask import request, jsonify, g
import auth

def require_auth(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        token = request.headers.get("Authorization", "").replace("Bearer ", "").strip()
        if not token:
            return jsonify({"error": "Ana buƙatar shiga (authentication required)"}), 401
        payload = auth.decode_token(token)
        if payload is None:
            return jsonify({"error": "Alamar shiga ba ta da inganci ko ta ƙare (invalid or expired token)"}), 401
        g.current_user = {"id": payload["sub"], "email": payload["email"], "role": payload["role"]}
        return f(*args, **kwargs)
    return wrapper

def require_role(*allowed_roles):
    """Stack this after require_auth to restrict a route to specific roles, e.g. admin-only."""
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            if g.current_user["role"] not in allowed_roles:
                return jsonify({"error": "Ba a yarda ba (insufficient permissions)"}), 403
            return f(*args, **kwargs)
        return wrapper
    return decorator
