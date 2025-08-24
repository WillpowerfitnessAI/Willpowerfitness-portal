# main.py  — WillpowerFitness Portal API (Buy-Button model)

import os, re, json, logging, requests
from datetime import datetime

from flask import Flask, request, jsonify
from flask_cors import CORS
import stripe

from supabase import create_client, Client

# ----- Local modules (unchanged in your repo) -----
from config import Config, setup_logging
from database import Database
from services.ai_service import AIService
from services.payment_service import PaymentService  # kept for compatibility

# ---------------- ENV ----------------
SUPABASE_URL  = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY  = os.getenv("SUPABASE_KEY", "")        # service-role key
GROQ_API_KEY  = os.getenv("GROQ_API_KEY")            # optional
OPENAI_API_KEY= os.getenv("OPENAI_API_KEY")          # optional

STRIPE_SECRET_KEY     = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")

PRINTFUL_API_KEY           = os.getenv("PRINTFUL_API_KEY")
PRINTFUL_TSHIRT_VARIANT_ID = os.getenv("PRINTFUL_TSHIRT_VARIANT_ID")

FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "https://app.willpowerfitnessai.com")

# Log presence of critical envs (not values)
logging.getLogger().setLevel(logging.INFO)
logging.info("SUPABASE_URL set? %s", bool(SUPABASE_URL))
logging.info("SUPABASE_KEY set? %s", bool(SUPABASE_KEY))
logging.info("STRIPE_SECRET_KEY set? %s", bool(STRIPE_SECRET_KEY))
logging.info("STRIPE_WEBHOOK_SECRET set? %s", bool(STRIPE_WEBHOOK_SECRET))

# Stripe
if STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY

# Supabase client
supabase: Client | None = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        logging.error(f"Supabase init failed: {e}")

# Config validation
setup_logging()
logger = logging.getLogger(__name__)
try:
    Config.validate_required_keys()
except ValueError as e:
    logger.error(f"Configuration error: {e}")
    raise SystemExit(1)

# ---------------- APP ----------------
app = Flask(__name__)

# CORS: restrict to Frontend + Vercel previews
ALLOWED_ORIGINS = [
    FRONTEND_ORIGIN,
    re.compile(r"https://.*\.vercel\.app$"),
]
CORS(
    app,
    resources={r"/api/*": {
        "origins": ALLOWED_ORIGINS,
        "methods": ["GET","POST","OPTIONS"],
        "allow_headers": ["Authorization","Content-Type"],
        "supports_credentials": False,
        "max_age": 86400,
    }}
)

# -------- Health --------
@app.get("/api/status")
def api_status():
    return jsonify(status="online", service="willpowerfitness-api",
                   time=datetime.utcnow().isoformat() + "Z"), 200

# ============================================================
#   LEADS  (GDPR-ish: minimal vs full intake)
#   - /api/lead-min : keep ONLY name + email (non-members)
#   - /api/lead     : store full intake (trial/join click)
#   Create tables in Supabase:
#   leads_min(name text, email text, source text, created_at timestamptz default now())
#   leads(intent text, name text, email text, goal text, schedule text,
#         experience text, constraints text, prefs text, plan_headline text, created_at timestamptz default now())
#   RLS: service role only.
# ============================================================

def _sb_upsert(table: str, payload: dict):
    if not supabase:
        raise RuntimeError("Supabase client not initialized")
    return supabase.table(table).upsert(payload).execute()

@app.post("/api/lead-min")
def lead_min():
    try:
        data = request.get_json(force=True) or {}
        name  = (data.get("name") or "").strip()
        email = (data.get("email") or "").strip()
        if not (name and email):
            return jsonify(error="name and email required"), 400
        _sb_upsert("leads_min", {"name": name, "email": email, "source": data.get("source","consult")})
    except Exception as e:
        logger.warning("lead-min insert failed: %s", e)
    return jsonify(ok=True), 200

@app.post("/api/lead")
def lead_full():
    try:
        data     = request.get_json(force=True) or {}
        answers  = data.get("answers") or {}
        summary  = data.get("summary") or {}
        intent   = data.get("intent","unknown")

        name = (answers.get("name") or "").strip()
        email= (answers.get("email") or "").strip()
        if not (name and email):
            return jsonify(error="name and email required"), 400

        payload = {
            "intent": intent,
            "name": name, "email": email,
            "goal": answers.get("goal"),
            "schedule": answers.get("schedule"),
            "experience": answers.get("experience"),
            "constraints": answers.get("constraints"),
            "prefs": answers.get("prefs"),
            "plan_headline": summary.get("headline") if isinstance(summary, dict) else None,
        }
        _sb_upsert("leads", payload)
    except Exception as e:
        logger.warning("lead (full) insert failed: %s", e)
    return jsonify(ok=True), 200

# ============================================================
#   STRIPE WEBHOOK  (must match your Stripe endpoint path)
#   Endpoint configured in Stripe: /api/webhooks/stripe
# ============================================================
def maybe_send_printful_order(email: str, name: str | None = None):
    if not (PRINTFUL_API_KEY and PRINTFUL_TSHIRT_VARIANT_ID and email):
        return
    try:
        req = requests.post(
            "https://api.printful.com/orders",
            headers={"Authorization": f"Bearer {PRINTFUL_API_KEY}", "Content-Type": "application/json"},
            data=json.dumps({
                "recipient": {"name": name or "New Member", "email": email},
                "items": [{"variant_id": int(PRINTFUL_TSHIRT_VARIANT_ID), "quantity": 1}],
            }),
            timeout=20,
        )
        if req.status_code >= 300:
            logger.warning("Printful order failed: %s %s", req.status_code, req.text[:300])
    except Exception as e:
        logger.warning("Printful order exception: %s", e)

@app.post("/api/webhooks/stripe")
def stripe_webhook():
    if not STRIPE_WEBHOOK_SECRET:
        return jsonify(error="STRIPE_WEBHOOK_SECRET not set"), 500

    payload = request.data
    sig = request.headers.get("Stripe-Signature", "")
    try:
        event = stripe.Webhook.construct_event(payload=payload, sig_header=sig, secret=STRIPE_WEBHOOK_SECRET)
    except Exception as e:
        logger.exception("Stripe signature verify failed")
        return jsonify(error="invalid signature"), 400

    etype = event.get("type")
    data  = (event.get("data") or {}).get("object") or {}

    try:
        # Checkout completed -> mark membership + record subscription
        if etype == "checkout.session.completed":
            email = (data.get("customer_details") or {}).get("email") or data.get("customer_email")
            sub_id = data.get("subscription")
            status = None
            period_end = None

            if sub_id:
                try:
                    sub_obj = stripe.Subscription.retrieve(sub_id)
                    status = sub_obj.get("status")
                    period_end = sub_obj.get("current_period_end")
                except Exception:
                    pass

            is_member = status in ("active","trialing")

            if supabase and email:
                supabase.table("user_profiles").upsert({"email": email, "is_member": is_member}).execute()
                if sub_id:
                    supabase.table("subscriptions").upsert({
                        "email": email,
                        "stripe_subscription_id": sub_id,
                        "status": status,
                        "current_period_end": period_end,
                    }).execute()

            if email:
                maybe_send_printful_order(email)

        # Subscription lifecycle -> keep membership in sync
        elif etype in ("customer.subscription.updated","customer.subscription.deleted"):
            sub = data
            status = sub.get("status")
            period_end = sub.get("current_period_end")
            is_member = status in ("active","trialing")

            email = None
            try:
                cust_id = sub.get("customer")
                if cust_id:
                    cust = stripe.Customer.retrieve(cust_id)
                    email = cust.get("email")
            except Exception:
                pass

            if supabase and email:
                supabase.table("user_profiles").upsert({"email": email, "is_member": is_member}).execute()
                supabase.table("subscriptions").upsert({
                    "email": email,
                    "stripe_subscription_id": sub.get("id"),
                    "status": status,
                    "current_period_end": period_end,
                }).execute()

    except Exception as e:
        logger.exception("Webhook handler failed")
        return jsonify(success=False), 500

    return jsonify(received=True), 200

# ---------------- Services (unchanged) ----------------
db = Database(Config.DATABASE_PATH)
ai_service = AIService(db)
payment_service = PaymentService(db)

# ---------------- Entrypoint ----------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 8080)))

