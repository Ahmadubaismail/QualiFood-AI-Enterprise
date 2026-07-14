import os

class Config:
    SECRET_KEY = os.environ.get("QF_SECRET_KEY", "change-me-in-production")
    DATABASE_URL = os.environ.get("QF_DATABASE_URL", "sqlite:///qualifood.db")
    KNOWLEDGE_BASE_DIR = os.environ.get("QF_KB_DIR", "../knowledge_base")
    AI_MODEL = os.environ.get("QF_AI_MODEL", "claude-sonnet-4-6")
    ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
    JWT_EXPIRY_HOURS = int(os.environ.get("QF_JWT_EXPIRY_HOURS", "12"))
    DEBUG = os.environ.get("QF_DEBUG", "true").lower() == "true"
