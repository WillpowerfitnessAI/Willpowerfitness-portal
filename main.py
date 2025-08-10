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
SUPABASE_URL = os.getenv("SUPABASE_URL")  # URL is public-ish; no default needed
SUPABASE_KEY = os.getenv("SUPABASE_KEY")  # NO default — treat like a secret
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY")        # <-- fixed name
PRINTFUL_API_KEY = os.getenv("PRINTFUL_API_KEY")

# Debug: confirm env vars are present (do NOT log the actual values)
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

# Validate configuration
try:
    Config.validate_required_keys()
except ValueError as e:
    logger.error(f"Configuration error: {e}")
    exit(1)

# Initialize Flask app
app = Flask(__name__)

# Allowed origins for your production sites
ALLOWED_ORIGINS = [
    "https://app.willpowerfitnessai.com",
    "https://willpowerfitness-frontend.vercel.app",
    "https://willpowerfitness-frontend-clwj.vercel.app",
    # "https://www.app.willpowerfitnessai.com",  # if you add www
]

# CORS: restrict to API routes only
CORS(
    app,
    resources={
        r"/api/*": {
            "origins": ALLOWED_ORIGINS,
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Authorization", "Content-Type"],
            "expose_headers": [],
            "supports_credentials": False,
            "max_age": 86400,
        }
    },
)

# Initialize services
db = Database(Config.DATABASE_PATH)
ai_service = AIService(db)
payment_service = PaymentService(db)

# Initialize Stripe (optional)
if STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY

