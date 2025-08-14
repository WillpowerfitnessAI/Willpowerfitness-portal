from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from datetime import datetime
import os
import logging
import stripe
import re

from supabase import create_client, Client

# Import our services
from config import Config, setup_logging
from database import Database
from services.ai_service import AIService
from services.payment_service import PaymentService

# -------- Environment variables --------
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")  # service role key
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY")
PRINTFUL_API_KEY = os.getenv("PRINTFUL_API_KEY")
STRIPE_PRICE_ID = os.getenv("STRIPE_PRICE_ID")  # price_...
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "https://app.willpowerfitnessai.com")

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
    raise SystemExit(1)

# ---------------- Flask App ----------------
app = Flask(__name__)

# Allowed origins (prod + any vercel preview via regex)
ALLOWED_ORIGINS = [
    "https://app.willpowerfitnessai.com",
    re.compile(r"https://.*\.vercel\.app$"),
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

# --- Health -----------------------------------------------------------
@app.get("/api/status")
def api_status():
    return jsonify(
        status="online",
        service="willpowerfitness-api",
        time=datetime.utcnow().isoformat() + "Z",
    ), 200

# --- Leads: store name/goal server-side -------------------------------
@app.post("/api/leads")
def create_lead():
    payload = request.get_json(silent=True) or {}
    name = (payload.get("name") or "").strip()
    goal = (payload.get("goal") or "").strip()
    if not name or not goal:
        return jsonify(error="name and goal are required"), 400

    if not supabase:
        return jsonify(error="Supabase client not initialized"), 500

    try:
        res = supabase.table("clients").insert({"name": name, "goal": goal}).execute()
        return jsonify(data=res.data or []), 201
    except Exception as e:
        logger.exception("Lead insert failed")
        return jsonify(error=str(e)), 500

# --- Stripe init & Checkout ------------------------------------------
if STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY  # set once at import time

@app.post("/api/checkout")
def create_checkout():
    if not stripe.api_key:
        return jsonify(error="STRIPE_SECRET_KEY missing"), 500
    if not STRIPE_PRICE_ID:
        return jsonify(error="STRIPE_PRICE_ID missing"), 500

    try:
        session = stripe.checkout.Session.create(
            mode="subscription",
            line_items=[{"price": STRIPE_PRICE_ID, "quantity": 1}],
            success_url=f"{FRONTEND_ORIGIN}/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{FRONTEND_ORIGIN}/subscribe?canceled=1",
        )
        return jsonify(url=session.url), 200
    except Exception as e:
        logger.exception("Stripe checkout session failed")
        return jsonify(error=str(e)), 500

# --- Debug ------------------------------------------------------------
@app.get("/api/_debug/cors")
def debug_cors():
    return jsonify(
        origin=request.headers.get("Origin"),
        allowed_origins=[str(x) for x in ALLOWED_ORIGINS],
    ), 200

# ---------------- Services ----------------
db = Database(Config.DATABASE_PATH)
ai_service = AIService(db)
payment_service = PaymentService(db)

# Local dev entrypoint (Railway uses gunicorn main:app)
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 8080)))
