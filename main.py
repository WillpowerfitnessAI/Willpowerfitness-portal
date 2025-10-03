# main.py — WillpowerFitness Portal API (Checkout Sessions model) + security headers + rate limit

import os, re, json, logging, requests
from datetime import datetime
from time import time
from collections import defaultdict
from typing import Optional

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
SUPABASE_URL   = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY   = os.getenv("SUPABASE_KEY", "")        # service-role key
GROQ_API_KEY   = os.getenv("GROQ_API_KEY")            # optional
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")          # optional

STRIPE_SECRET_KEY     = (os.getenv("STRIPE_SECRET_KEY") or "").strip()
STRIPE_WEBHOOK_SECRET = (os.getenv("STRIPE_WEBHOOK_SECRET") or "").strip()

# Price & trial settings for Checkout (support both names; trim to avoid paste artifacts)
PRICE_ID = (
    (os.getenv("STRIPE_PRICE_ID") or os.getenv("STRIPE_PRICE_MONTHLY_ID") or "")
).strip()
STRIPE_TRIAL_DAYS = int((os.getenv("STRIPE_TRIAL_DAYS") or "0").strip() or "0")

PRINTFUL_API_KEY           = os.getenv("PRINTFUL_API_KEY")
PRINTFUL_TSHIRT_VARIANT_ID = os.getenv("PRINTFUL_TSHIRT_VARIANT_ID")

FRONTEND_ORIGIN = (os.getenv("FRONTEND_ORIGIN") or "https://app.willpowerfitnessai.com").rstrip("/")

# Log presence of critical envs (not values)
logging.getLogger().setLevel(logging.INFO)
logging.info("SUPABASE_URL set? %s", bool(SUPABASE_URL))
logging.info("SUPABASE_KEY set? %s", bool(SUPABASE_KEY))
logging.info("STRIPE_SECRET_KEY set? %s", bool(STRIPE_SECRET_KEY))
logging.info("STRIPE_WEBHOOK_SECRET set? %s", bool(STRIPE_WEBHOOK_SECRET))
logging.info("Stripe PRICE_ID present? %s", bool(PRICE_ID))
logging.info("FRONTEND_ORIGIN: %s", FRONTEND_ORIGIN)

# Stripe
if STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY

# Supabase client
supabase: Optional[Client] = None
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

# ---------------- LLM HELPERS (OpenAI first, fallback to Groq) ----------------
def _call_openai(messages: list[dict]) -> Optional[str]:
    if not OPENAI_API_KEY:
        return None
    try:
        r = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"},
            json={"model": "gpt-4o-mini", "messages": messages, "temperature": 0.3},
            timeout=30,
        )
        if r.status_code >= 400:
            logger.warning("OpenAI error %s: %s", r.status_code, r.text[:300])
            return None
        j = r.json()
        return ((j.get("choices") or [{}])[0].get("message", {}) or {}).get("content")
    except Exception as e:
        logger.warning("OpenAI call failed: %s", e)
        return None

def _call_groq(messages: list[dict]) -> Optional[str]:
    if not GROQ_API_KEY:
        return None
    models = ("llama-3.1-70b-versatile", "llama3-70b-8192")
    for model in models:
        try:
            r = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
                json={"model": model, "messages": messages, "temperature": 0.3},
                timeout=30,
            )
            if r.status_code >= 400:
                logger.warning("Groq error (%s) %s: %s", model, r.status_code, r.text[:300])
                continue
            j = r.json()
            out = ((j.get("choices") or [{}])[0].get("message", {}) or {}).get("content")
            if out:
                return out
        except Exception as e:
            logger.warning("Groq call failed (%s): %s", model, e)
    return None

def _llm_chat(messages: list[dict]) -> str:
    out = _call_openai(messages)
    if out:
        return out.strip()
    out = _call_groq(messages)
    if out:
        return out.strip()
    raise RuntimeError("no_model_available")

# ---------------- APP ----------------
app = Flask(__name__)
app.url_map.strict_slashes = False  # /x and /x/ are treated the same

# ---- Security headers on every API response ----
@app.after_request
def secure_headers(resp):
    resp.headers['X-Content-Type-Options'] = 'nosniff'
    resp.headers['X-Frame-Options'] = 'DENY'
    resp.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    resp.headers['X-Robots-Tag'] = 'noindex, nofollow'
    resp.headers['Strict-Transport-Security'] = 'max-age=63072000; includeSubDomains; preload'
    return resp

# ---- Simple rate limiter for lead endpoints ----
_BUCKET = defaultdict(list)
def _too_many(ip, limit=30, window=60):
    now = time()
    q = _BUCKET[ip]
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

CORS(app, resources={r"/api/*": {
    "origins": [FRONTEND_ORIGIN, re.compile(r"^https://.*\.vercel\.app$"), "http://localhost:3000"],
    "methods": ["GET","POST","OPTIONS"],
    "allow_headers": ["Authorization","Content-Type"],
    "supports_credentials": False,
    "max_age": 86400,
}})

# -------- Health / Ping --------
@app.get("/api/status")
def api_status():
    return jsonify(status="online", service="willpowerfitness-api",
                   time=datetime.utcnow().isoformat() + "Z"), 200

@app.get("/api/ping")
def api_ping():
    return jsonify(ok=True, time=datetime.utcnow().isoformat() + "Z"), 200

# --- Debug: show what the backend will use for checkout ---
@app.get("/api/debug/checkout-config")
def debug_checkout_config():
    return jsonify(
        price_id=PRICE_ID,
        price_id_startswith_price=bool(PRICE_ID and PRICE_ID.startswith("price_")),
        stripe_key_present=bool(STRIPE_SECRET_KEY),
        stripe_mode=(os.getenv("STRIPE_MODE") or ("live" if (STRIPE_SECRET_KEY or "").startswith("sk_live") else "test")),
        frontend_origin=FRONTEND_ORIGIN,
    ), 200

# -------- LLM debug --------
@app.get("/api/debug/providers")
def debug_providers():
    return jsonify(openai_key_present=bool(OPENAI_API_KEY),
                   groq_key_present=bool(GROQ_API_KEY)), 200

@app.get("/api/debug/ping-openai")
def ping_openai():
    try:
        out = _call_openai([{"role": "user", "content": "Say 'pong'."}])
        return jsonify(ok=bool(out), reply=(out or "")), 200
    except Exception as e:
        return jsonify(ok=False, error=str(e)), 500

@app.get("/api/debug/ping-groq")
def ping_groq():
    try:
        out = _call_groq([{"role": "user", "content": "Say 'pong'."}])
        return jsonify(ok=bool(out), reply=(out or "")), 200
    except Exception as e:
        return jsonify(ok=False, error=str(e)), 500

# ================================
#   AUTH: Email + Password signup
# ================================
@app.post("/api/auth/register")
def auth_register():
    if not supabase:
        return jsonify(error="supabase_not_configured"), 500

    data = request.get_json(force=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = (data.get("password") or "").strip()
    name = (data.get("name") or "").strip() or None

    if not (email and password):
        return jsonify(error="email_and_password_required"), 400
    if len(password) < 8:
        return jsonify(error="weak_password"), 400

    try:
        supabase.auth.admin.create_user({
            "email": email,
            "password": password,
            "email_confirm": True
        })
    except Exception as e:
        msg = str(e).lower()
        if "already" not in msg and "exists" not in msg:
            logging.warning("auth_register create_user failed: %s", e)
            return jsonify(error="create_failed"), 400

    try:
        supabase.table("user_profiles").upsert({
            "email": email,
            "name": name,
            "plan": None,
            "is_member": False,
            "stripe_status": None,
        }).execute()
    except Exception as e:
        logging.warning("auth_register profile upsert failed: %s", e)

    return jsonify(ok=True), 200

# ============================================================
#   MEMBERSHIP LOOKUP (used by frontend after login)
# ============================================================
@app.get("/api/me")
def me():
    email = (request.args.get("email") or "").strip().lower()
    if not email:
        return jsonify(error="email_required"), 400
    if not supabase:
        return jsonify(error="supabase_not_configured"), 500
    try:
        pr = supabase.table("user_profiles") \
                     .select("is_member, plan, stripe_status") \
                     .eq("email", email).limit(1).execute()
        prow = (getattr(pr, "data", []) or pr.data or [{}])[0] if pr else {}

        sr = supabase.table("subscriptions") \
                     .select("status, current_period_end") \
                     .eq("email", email).order("updated_at", desc=True) \
                     .limit(1).execute()
        srow = (getattr(sr, "data", []) or sr.data or [{}])[0] if sr else {}

        return jsonify(
            email=email,
            is_member=bool(prow.get("is_member")),
            plan=prow.get("plan"),
            stripe_status=prow.get("stripe_status") or srow.get("status"),
            current_period_end=srow.get("current_period_end"),
        ), 200
    except Exception:
        logger.exception("me lookup failed")
        return jsonify(error="lookup_failed"), 500

# ============================================================
#   LEADS
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
#   STRIPE WEBHOOK  (endpoint path: /api/webhooks/stripe)
# ============================================================
def maybe_send_printful_order(recipient: dict):
    """
    recipient example:
    {
        "name": "...", "email": "...",
        "address1": "...", "address2": "...",
        "city": "...", "state_code": "...",
        "country_code": "...", "zip": "..."
    }
    """
    if not (PRINTFUL_API_KEY and PRINTFUL_TSHIRT_VARIANT_ID and recipient and recipient.get("email")):
        return
    try:
        req = requests.post(
            "https://api.printful.com/orders",
            headers={"Authorization": f"Bearer {PRINTFUL_API_KEY}", "Content-Type": "application/json"},
            data=json.dumps({
                "recipient": recipient,
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

    # RAW BODY (bytes) for signature verification
    payload = request.get_data(cache=False, as_text=False)
    sig = request.headers.get("Stripe-Signature", "")

    try:
        event = stripe.Webhook.construct_event(payload=payload, sig_header=sig, secret=STRIPE_WEBHOOK_SECRET)
    except Exception:
        logger.exception("Stripe signature verify failed")
        return jsonify(error="invalid signature"), 400

    etype = event.get("type")
    data  = (event.get("data") or {}).get("object") or {}

    try:
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
                supabase.table("user_profiles").upsert({
                    "email": email,
                    "is_member": is_member,
                    "stripe_status": (status or None),
                    "plan": "elite",
                }).execute()

                if sub_id:
                    supabase.table("subscriptions").upsert({
                        "email": email,
                        "stripe_subscription_id": sub_id,
                        "status": status,
                        "current_period_end": period_end,
                    }).execute()

            # ---- Build full recipient from Stripe session and send to Printful ----
            cust = (data.get("customer_details") or {})
            addr = cust.get("address") or {}
            recipient = {
                "name": (cust.get("name") or "New Member"),
                "email": (cust.get("email") or email),
                "address1": addr.get("line1"),
                "address2": addr.get("line2"),
                "city": addr.get("city"),
                "state_code": addr.get("state"),
                "country_code": addr.get("country"),
                "zip": addr.get("postal_code"),
            }
            maybe_send_printful_order(recipient)

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
                supabase.table("user_profiles").upsert({
                    "email": email,
                    "is_member": is_member,
                    "stripe_status": (status or None),
                    "plan": "elite",
                }).execute()

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
# ============================================================
@app.post("/api/checkout")
def checkout_route():
    # 1) Parse JSON
    try:
        data = request.get_json(force=True, silent=False) or {}
    except Exception as e:
        return jsonify({"error": "invalid_json", "detail": str(e)}), 400

    # 2) Extract + normalize
    email  = (data.get("email")  or "").strip().lower()
    name   = (data.get("name")   or "").strip()
    goal   = (data.get("goal")   or "").strip()
    intent = (data.get("intent") or "join").strip() or "join"

    # 3) Validate
    if not email or not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        return jsonify({"error": "invalid_email"}), 400

    if not stripe.api_key:
        return jsonify({"error": "stripe_not_configured", "message": "Missing STRIPE_SECRET_KEY"}), 500

    if not PRICE_ID or not PRICE_ID.startswith("price_"):
        return jsonify({"error": "bad_price_id", "message": f"Backend PRICE_ID looks wrong: {repr(PRICE_ID)}"}), 500

    # (optional) sanity check price exists
    try:
        _ = stripe.Price.retrieve(PRICE_ID)
    except Exception as e:
        logger.exception("Stripe Price.retrieve failed")
        return jsonify({"error": "bad_price_id", "message": str(e)}), 500

    # 4) Build Checkout params
    params = {
        "mode": "subscription",
        "line_items": [{"price": PRICE_ID, "quantity": 1}],
        "success_url": f"{FRONTEND_ORIGIN}/success?session_id={{CHECKOUT_SESSION_ID}}{f'&email={email}' if email else ''}",
        "cancel_url": f"{FRONTEND_ORIGIN}/subscribe?canceled=1",
        "allow_promotion_codes": True,
        "client_reference_id": email or None,
        "customer_email": email or None,
        # collect shipping info so Printful can fulfill
        "shipping_address_collection": {"allowed_countries": ["US", "CA"]},
        "phone_number_collection": {"enabled": True},
        # helpful context on the Session
        "metadata": {
            "name": name or "",
            "goal": goal or "",
            "intent": intent or "join",
            "source": "app_subscribe",
        },
    }
    if intent == "trial" and STRIPE_TRIAL_DAYS > 0:
        params["subscription_data"] = {"trial_period_days": STRIPE_TRIAL_DAYS}

    # 5) Create session
    try:
        session = stripe.checkout.Session.create(**params)
        return jsonify({"url": session.url}), 200
    except stripe.error.StripeError as se:
        msg = getattr(se, "user_message", None) or getattr(se, "code", None) or str(se)
        logger.exception("Stripe error during checkout: %s", msg)
        return jsonify({"error": "stripe_error", "message": msg}), 502
    except Exception as e:
        logger.exception("checkout failed")
        return jsonify({"error": "checkout_failed", "message": str(e)}), 500



# ============================================================
#   AI CHAT ENDPOINT
# ============================================================
def _is_member(email: str) -> bool:
    if not (supabase and email):
        return False
    try:
        r = supabase.table("user_profiles").select("is_member").eq("email", email).limit(1).execute()
        rows = getattr(r, "data", []) or r.data
        return bool(rows and rows[0].get("is_member"))
    except Exception as e:
        logger.warning("membership check failed: %s", e)
        return False

@app.post("/api/chat")
def api_chat():
    try:
        data = request.get_json(force=True) or {}
        email = (data.get("email") or "").strip().lower()
        user_msg = (data.get("message") or data.get("prompt") or "").strip()
        if not user_msg:
            return jsonify(error="message_required"), 400

        if email and not _is_member(email):
            return jsonify(error="not_member"), 403

        system = (
            "You are Coach Will, a concise, upbeat fitness coach. "
            "Give practical workout, nutrition, and recovery guidance. "
            "Favor simple, sustainable plans. Keep answers short and actionable."
        )
        messages = [{"role": "system", "content": system}, {"role": "user", "content": user_msg}]
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
