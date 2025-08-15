import json
import requests

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
TRIAL_DAYS = int(os.getenv("STRIPE_TRIAL_DAYS", "0") or "0")

@app.post("/api/checkout")
def create_checkout():
    if not stripe.api_key:
        return jsonify(error="STRIPE_SECRET_KEY missing"), 500
    if not STRIPE_PRICE_ID:
        return jsonify(error="STRIPE_PRICE_ID missing"), 500

    try:
        params = dict(
            mode="subscription",
            line_items=[{"price": STRIPE_PRICE_ID, "quantity": 1}],
            success_url=f"{FRONTEND_ORIGIN}/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{FRONTEND_ORIGIN}/subscribe?canceled=1",
        )
        if TRIAL_DAYS > 0:
            params["subscription_data"] = {"trial_period_days": TRIAL_DAYS}

        session = stripe.checkout.Session.create(**params)
        return jsonify(url=session.url), 200
    except Exception as e:
        logger.exception("Stripe checkout session failed")
        return jsonify(error=str(e)), 500

# --- Consultation: generate plan + store lead --------------------------------
@app.post("/api/consult")
def create_consultation():
    payload = request.get_json(silent=True) or {}
    name = (payload.get("name") or "Friend").strip()
    email = (payload.get("email") or "").strip()
    goals = (payload.get("goals") or "").strip()
    experience = (payload.get("experience") or "").strip()
    injuries = (payload.get("injuries") or "").strip()
    equipment = (payload.get("equipment") or "").strip()
    schedule = (payload.get("schedule") or "").strip()

    # 1) store lead
    try:
        if supabase:
            supabase.table("clients").insert({
                "name": name, "email": email, "goal": goals,
                "experience": experience, "injuries": injuries,
                "equipment": equipment, "schedule": schedule
            }).execute()
    except Exception as e:
        logger.warning("Lead insert (consult) warning: %s", e)

    # 2) generate plan
    plan_text = None
    try:
        # If your AIService exists, call it. Otherwise fallback template.
        if hasattr(ai_service, "generate_plan"):
            plan_text = ai_service.generate_plan(
                name=name, goal=goals, experience=experience,
                injuries=injuries, equipment=equipment, schedule=schedule
            )
    except Exception as e:
        logger.warning("AIService.generate_plan failed, using fallback: %s", e)

    if not plan_text:
        plan_text = f"""WillpowerFitness AI — Personalized Starter Plan for {name}

Goals: {goals or 'not specified'}
Experience: {experience or 'not specified'}
Injuries: {injuries or 'none'}
Equipment: {equipment or 'bodyweight'}
Schedule: {schedule or '3-4 days/week'}

TRAINING (3x/week):
- Full-body (Squat, Hinge, Push, Pull, Carry, Core)
- 3 sets x 8–12 reps; progress load when you hit 12 reps with good form
- Finisher: 5–10 min intervals (bike/rower/walk incline)

CARDIO (2–3x/week):
- Zone 2: 25–35 min conversational pace
- Optional HIIT: 6–8 x (30s hard / 90s easy)

NUTRITION:
- Protein: ~0.7–1.0 g/lb of goal BW
- Modest deficit for fat loss (−300 to −500/day) or surplus +200–300 for gain
- 25–35 g fiber/day; 2–3 L water/day

RECOVERY:
- Sleep 7–9 h; 7–10k steps/day; mobility 10 min post-workout

SCHEDULE (example week):
- Mon: Strength A
- Tue: Zone 2
- Thu: Strength B
- Sat: Zone 2 + mobility

We’ll auto-tune volume/macros based on check-ins. Tough love included. 😉
"""

    # 3) store plan text (optional)
    try:
        if supabase:
            supabase.table("messages").insert({
                "email": email, "content": plan_text, "type": "plan"
            }).execute()
    except Exception as e:
        logger.warning("Message insert warning: %s", e)

    return jsonify({"plan": plan_text}), 200

# --- Debug ------------------------------------------------------------
@app.get("/api/_debug/cors")
def debug_cors():
    return jsonify(
        origin=request.headers.get("Origin"),
        allowed_origins=[str(x) for x in ALLOWED_ORIGINS],
    ), 200
@app.get("/api/success")
def success():
    sid = request.args.get("session_id", "")
    if not sid:
        return jsonify(error="missing session_id"), 400
    try:
        sess = stripe.checkout.Session.retrieve(sid, expand=["customer", "subscription"])
        email = (sess.get("customer_details") or {}).get("email") or sess.get("customer_email")
        sub = sess.get("subscription")
        active = bool(sub and sub.get("status") in ("active", "trialing"))
        # upsert into Supabase
        if supabase and email:
            supabase.table("user_profiles").upsert(
                {"email": email, "is_member": active}
            ).execute()
            if sub:
                supabase.table("subscriptions").upsert({
                    "email": email,
                    "stripe_subscription_id": sub.get("id"),
                    "status": sub.get("status"),
                    "current_period_end": sub.get("current_period_end")
                }).execute()
        return jsonify({"email": email, "member": active}), 200
    except Exception as e:
        logger.exception("Success verify failed")
        return jsonify(error=str(e)), 500
# --- Optional: welcome swag via Printful --------------------------------------
def maybe_send_printful_order(email: str, name: str = "New Member"):
    """Fire-and-forget Printful order if keys/variant are configured."""
    if not (PRINTFUL_API_KEY and PRINTFUL_TSHIRT_VARIANT_ID):
        return
    try:
        payload = {
            "recipient": {"name": name, "email": email},
            "items": [{
                "variant_id": int(PRINTFUL_TSHIRT_VARIANT_ID),
                "quantity": 1
            }],
        }
        r = requests.post(
            "https://api.printful.com/orders",
            headers={
                "Authorization": f"Bearer {PRINTFUL_API_KEY}",
                "Content-Type": "application/json",
            },
            data=json.dumps(payload),
            timeout=20,
        )
        if r.status_code >= 300:
            logger.warning("Printful order failed: %s %s", r.status_code, r.text[:300])
        else:
            logger.info("Printful order created: %s", r.status_code)
    except Exception as e:
        logger.warning("Printful order exception: %s", e)


# --- Stripe Webhook: membership lifecycle -------------------------------------
@app.post("/api/webhooks/stripe")
def stripe_webhook():
    if not STRIPE_WEBHOOK_SECRET:
        return jsonify(error="STRIPE_WEBHOOK_SECRET not set"), 500

    payload = request.data
    sig_header = request.headers.get("Stripe-Signature", "")

    try:
        event = stripe.Webhook.construct_event(
            payload=payload, sig_header=sig_header, secret=STRIPE_WEBHOOK_SECRET
        )
    except Exception as e:
        logger.exception("Stripe webhook signature verify failed")
        return jsonify(error="invalid signature"), 400

    etype = event.get("type")
    data = (event.get("data") or {}).get("object") or {}

    try:
        # 1) Checkout completed → mark member + record subscription
        if etype == "checkout.session.completed":
            email = (data.get("customer_details") or {}).get("email") or data.get("customer_email")
            sub_id = data.get("subscription")
            status = None
            period_end = None
            sub_obj = None

            if sub_id:
                try:
                    sub_obj = stripe.Subscription.retrieve(sub_id)
                    status = sub_obj.get("status")
                    period_end = sub_obj.get("current_period_end")
                except Exception:
                    pass

            is_member = (status in ("active", "trialing"))

            if supabase and email:
                supabase.table("user_profiles").upsert(
                    {"email": email, "is_member": is_member}
                ).execute()
                if sub_id:
                    supabase.table("subscriptions").upsert({
                        "email": email,
                        "stripe_subscription_id": sub_id,
                        "status": status,
                        "current_period_end": period_end,
                    }).execute()

            # optional welcome apparel
            if email:
                maybe_send_printful_order(email)

        # 2) Subscription updated/deleted → sync membership
        elif etype in ("customer.subscription.updated", "customer.subscription.deleted"):
            sub = data
            status = sub.get("status")
            period_end = sub.get("current_period_end")
            is_member = (status in ("active", "trialing"))

            email = None
            try:
                cust_id = sub.get("customer")
                if cust_id:
                    cust = stripe.Customer.retrieve(cust_id)
                    email = cust.get("email")
            except Exception:
                pass

            if supabase and email:
                supabase.table("user_profiles").upsert(
                    {"email": email, "is_member": is_member}
                ).execute()
                supabase.table("subscriptions").upsert({
                    "email": email,
                    "stripe_subscription_id": sub.get("id"),
                    "status": status,
                    "current_period_end": period_end,
                }).execute()

        # (You can add more handlers later if needed)

    except Exception as e:
        logger.exception("Webhook handler failed")
        return jsonify(success=False), 500

    return jsonify(received=True), 200

# ---------------- Services ----------------
db = Database(Config.DATABASE_PATH)
ai_service = AIService(db)
payment_service = PaymentService(db)

# Local dev entrypoint (Railway uses gunicorn main:app)
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 8080)))
