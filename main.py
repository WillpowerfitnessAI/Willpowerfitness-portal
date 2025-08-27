# main.py — WillpowerFitness Portal API (Buy-Button model) + security headers + rate limit

import os, re, json, logging, requests
from datetime import datetime
from time import time
from collections import defaultdict

from flask import Flask, request, jsonify
from flask_cors import CORS
import stripe

from supabase import create_client, Client

# ----- Local modules (unchanged) -----
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

# Price & trial settings for Checkout
STRIPE_PRICE_MONTHLY_ID = os.getenv("STRIPE_PRICE_MONTHLY_ID", "")
STRIPE_TRIAL_DAYS = int(os.getenv("STRIPE_TRIAL_DAYS", "0") or "0")

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

# ---- Security headers on every API response ----
@app.after_request
def secure_headers(resp):
    resp.headers['X-Content-Type-Options'] = 'nosniff'
    resp.headers['X-Frame-Options'] = 'DENY'
    resp.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    resp.headers['X-Robots-Tag'] = 'noindex, nofollow'  # keep API host out of search
    resp.headers['Strict-Transport-Security'] = 'max-age=63072000; includeSubDomains; preload'
    return resp

# ---- Simple rate limiter for lead endpoints (no extra deps) ----
_BUCKET = defaultdict(list)

def _too_many(ip, limit=30, window=60):
    now = time()
    q = _BUCKET[ip]
    # drop old hits
    while q and now - q[0] > window:
        q.pop(0)
    if len(q) >= limit:
        return True
    q.append(now)
    return False

@app.before_request
def throttle():
    if request.path in ("/api/lead", "/api/lead-min"):
        ip = (
            request.headers.get("cf-connecting-ip")
            or (request.headers.get("x-forwarded-for") or "").split(",")[0].strip()
            or request.remote_addr
            or "anon"
        )
        if _too_many(ip):
            return jsonify(error="rate limited"), 429

# CORS: restrict to Frontend + Vercel previews
ALLOWED_ORIGINS = [
    FRONTEND_ORIGIN,
    r"^https://.*\.vercel\.app$",
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
#   MEMBERSHIP LOOKUP (used by frontend after magic-link)
# ============================================================
@app.get("/api/me")
def me():
    email = (request.args.get("email") or "").strip().lower()
    if not email:
        return jsonify(error="email_required"), 400
    if not supabase:
        return jsonify(error="supabase_not_configured"), 500
    try:
        r = supabase.table("user_profiles").select("is_member").eq("email", email).limit(1).execute()
        rows = getattr(r, "data", []) or r.data
        is_member = bool(rows and rows[0].get("is_member"))
        return jsonify(email=email, is_member=is_member), 200
    except Exception:
        logger.exception("me lookup failed")
        return jsonify(error="lookup_failed"), 500

# ============================================================
#   LEADS  (minimal vs full intake)
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

        name  = (answers.get("name") or "").strip()
        email = (answers.get("email") or "").strip()
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
def maybe_send_printful_order(email: str, name: str = None):
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
    except Exception:
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

    except Exception:
        logger.exception("Webhook handler failed")
        return jsonify(success=False), 500

    return jsonify(received=True), 200

# ============================================================
#   CHECKOUT (create Stripe Checkout Session)
#   Body: { intent: "trial" | "join" }
#   Returns: { url: "https://checkout.stripe.com/..." }
# ============================================================
@app.post("/api/checkout")
def start_checkout():
    if not (stripe.api_key and STRIPE_PRICE_MONTHLY_ID):
        return jsonify(error="stripe_not_configured"), 500

    try:
        data = request.get_json(silent=True) or {}
        intent = (data.get("intent") or "join").lower()

        params = {
            "mode": "subscription",
            "line_items": [{"price": STRIPE_PRICE_MONTHLY_ID, "quantity": 1}],
            # After payment, send them to your login page
            "success_url": f"{FRONTEND_ORIGIN}/login?checkout=success&session_id={{CHECKOUT_SESSION_ID}}",
            "cancel_url": f"{FRONTEND_ORIGIN}/?checkout=cancelled",
            "allow_promotion_codes": True,
        }

        # Add a trial if requested and configured
        if intent == "trial" and STRIPE_TRIAL_DAYS > 0:
            params["subscription_data"] = {"trial_period_days": STRIPE_TRIAL_DAYS}

        session = stripe.checkout.Session.create(**params)
        return jsonify(url=session.url), 200

    except Exception as e:
        logger.exception("checkout failed")
        return jsonify(error="checkout_failed", message=str(e)), 500)

# ============================================================
#   AI CHAT ENDPOINT
# ============================================================

def _is_member(email: str) -> bool:
    """Return True if the user is an active/trialing member in Supabase."""
    if not (supabase and email):
        return False
    try:
        r = supabase.table("user_profiles").select("is_member").eq("email", email).limit(1).execute()
        rows = getattr(r, "data", []) or r.data
        return bool(rows and rows[0].get("is_member"))
    except Exception as e:
        logger.warning("membership check failed: %s", e)
        return False

def _llm_chat(messages: list[dict]) -> str:
    """Call OpenAI first; fall back to Groq. Return the assistant text."""
    # OpenAI
    if OPENAI_API_KEY:
        try:
            resp = requests.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"},
                json={"model": "gpt-4o-mini", "messages": messages, "temperature": 0.3},
                timeout=30,
            )
            j = resp.json()
            out = (j.get("choices") or [{}])[0].get("message", {}).get("content", "")
            if out:
                return out.strip()
        except Exception as e:
            logger.warning("OpenAI call failed: %s", e)

    # Groq fallback (OpenAI-compatible)
    if GROQ_API_KEY:
        try:
            resp = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
                json={"model": "llama-3.1-70b-versatile", "messages": messages, "temperature": 0.3},
                timeout=30,
            )
            j = resp.json()
            out = (j.get("choices") or [{}])[0].get("message", {}).get("content", "")
            if out:
                return out.strip()
        except Exception as e:
            logger.warning("Groq call failed: %s", e)

    raise RuntimeError("no_model_available")

@app.post("/api/chat")
def api_chat():
    """Minimal chat endpoint used by the dashboard UI."""
    try:
        data = request.get_json(force=True) or {}
        email = (data.get("email") or "").strip().lower()
        user_msg = (data.get("message") or data.get("prompt") or "").strip()
        if not user_msg:
            return jsonify(error="message_required"), 400

        # Optional paywall: if we know the email, require membership
        if email and not _is_member(email):
            return jsonify(error="not_member"), 403

        system = (
            "You are Coach Will, a concise, upbeat fitness coach. "
            "Give practical workout, nutrition, and recovery guidance. "
            "Favor simple, sustainable plans. Keep answers short and actionable."
        )
        messages = [
            {"role": "system", "content": system},
            {"role": "user", "content": user_msg},
        ]
        reply = _llm_chat(messages)
        if not reply:
            raise RuntimeError("empty_model_reply")

        return jsonify(reply=reply), 200

    except Exception as e:
        logger.exception("chat failed")
        code = "no_model" if str(e) == "no_model_available" else "chat_failed"
        return jsonify(error=code, message=str(e)), 500

# ---------------- Services (unchanged) ----------------
db = Database(Config.DATABASE_PATH)
ai_service = AIService(db)
payment_service = PaymentService(db)

# ---------------- Entrypoint ----------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 8080)))


