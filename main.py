from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from datetime import datetime
import os
import logging
import stripe

from supabase import create_client, Client

# Import our services
from config import Config, setup_logging
from database import Database
from services.ai_service import AIService
from services.payment_service import PaymentService

# -------- Environment variables --------
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY")
PRINTFUL_API_KEY = os.getenv("PRINTFUL_API_KEY")

# Debug: confirm env vars are present (do NOT log actual values)
logging.getLogger().setLevel(logging.INFO)
logging.info("SUPABASE_URL set? %s", bool(SUPABASE_URL))
logging.info("SUPABASE_KEY set? %s", bool(SUPABASE_KEY))

# Initialize Supabase (one time)
supabase: Client | None = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        logging.error(f"Supabase initialization failed: {e}")

# Setup logging
setup_logging()
logger = logging.getLogger(__name__)

# Validate configuration (fail fast if missing)
try:
    Config.validate_required_keys()
except ValueError as e:
    logger.error(f"Configuration error: {e}")
    exit(1)

# ---------------- Flask App ----------------
app = Flask(__name__)

# Allowed origins (prod domain + any Vercel preview via regex string)
ALLOWED_ORIGINS = [
    "https://app.willpowerfitnessai.com",
    r"https://.*\.vercel\.app$",   # allow all vercel.app previews
]

# CORS: restrict to API routes only
CORS(
    app,
    resources={
        r"/api/*": {
            "origins": ALLOWED_ORIGINS,
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Authorization", "Content-Type"],
            "supports_credentials": False,
            "max_age": 86400,
        }
    },
)

# --- Health + Debug -------------------------------------------------
@app.get("/api/status")
def api_status():
    return jsonify(
        status="online",
        service="willpowerfitness-api",
        time=datetime.utcnow().isoformat() + "Z",
    ), 200

@app.get("/api/_debug/cors")
def debug_cors():
    return jsonify(
        origin=request.headers.get("Origin"),
        allowed_origins=ALLOWED_ORIGINS,
    ), 200

# ---------------- Services ----------------
db = Database(Config.DATABASE_PATH)
ai_service = AIService(db)
payment_service = PaymentService(db)

# Stripe (optional)
if STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY

# Local dev entrypoint (Railway uses your start command, e.g., gunicorn main:app)
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 8080)))
