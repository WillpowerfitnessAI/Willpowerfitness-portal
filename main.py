
import os
import requests
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from supabase import create_client, Client

# Initialize Flask app
app = Flask(__name__)
CORS(app, origins=["*"])  # Allow all origins for development

# In-memory database for user data (you can replace with a proper database)
db = {}

# Environment variables
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://jxylbuwtjvsdavetryjx.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Initialize Supabase client (optional - only if you have Supabase credentials)
supabase = None
if SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        print(f"Supabase initialization failed: {e}")

def ask_groq_ai(user_input, user_id="default"):
    """Main AI function that handles personalized responses with memory"""
    if not GROQ_API_KEY:
        return "Error: GROQ_API_KEY environment variable not set. Please configure it in your deployment settings."
    
    # Memory keys
    name_key = f"user:{user_id}:name"
    goal_key = f"user:{user_id}:goal"
    messages_key = f"user:{user_id}:messages"

    # Load from memory or fallback
    name = db.get(name_key, "Friend")
    goal = db.get(goal_key, "your fitness goals")
    history = db.get(messages_key, [])

    # Save new user message
    history.append({"role": "user", "content": user_input})

    # Build proper messages array for Groq API
    messages = [
        {"role": "system", "content": f"You are Will Power, a fitness coach. You're coaching {name} whose goal is {goal}. Respond like a caring but tough trainer."}
    ]
    
    # Add recent conversation history
    for msg in history[-10:]:  # Last 10 messages for context
        messages.append({"role": msg["role"], "content": msg["content"]})

    try:
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "llama3-8b-8192",
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": 500
            }
        )
        
        if response.status_code == 200:
            reply = response.json()['choices'][0]['message']['content']
        else:
            print(f"Groq API Error: {response.status_code} - {response.text}")
            reply = "Sorry, I'm having trouble connecting to the AI service right now. Try again!"
            
    except Exception as e:
        print(f"Error calling Groq API: {e}")
        reply = f"Sorry, there was a problem generating a response. Please try again."

    # Save reply to memory
    history.append({"role": "assistant", "content": reply})
    db[messages_key] = history

    # Save to Supabase if available
    if supabase:
        try:
            timestamp = datetime.utcnow().isoformat()
            supabase.table("messages").insert({
                "user_id": user_id,
                "sender": "user",
                "message": user_input,
                "timestamp": timestamp
            }).execute()
            supabase.table("messages").insert({
                "user_id": user_id,
                "sender": "ai", 
                "message": reply,
                "timestamp": timestamp
            }).execute()
        except Exception as e:
            print(f"Error saving to Supabase: {e}")

    return reply

@app.route("/", methods=["GET"])
def home():
    try:
        with open('index.html', 'r') as f:
            return f.read()
    except FileNotFoundError:
        return "WillpowerFitness AI is live!", 200

@app.route("/api/chat", methods=["POST"])
def chat():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data received"}), 400
            
        user_input = data.get("message", "").strip()
        user_id = data.get("user_id", "default")

        if not user_input:
            return jsonify({"reply": "Please enter a message."}), 400

        reply_text = ask_groq_ai(user_input, user_id)
        return jsonify({"reply": reply_text})
    except Exception as e:
        print(f"Chat error: {e}")
        return jsonify({"error": "Server error occurred"}), 500

@app.route("/api/set_name", methods=["POST"])
def set_name():
    data = request.get_json()
    name = data.get("name")
    user_id = data.get("user_id", "default")
    if name:
        db[f"user:{user_id}:name"] = name
        return jsonify({"message": f"Name set to {name}"}), 200
    return jsonify({"error": "No name provided"}), 400

@app.route("/api/set_goal", methods=["POST"])
def set_goal():
    data = request.get_json()
    goal = data.get("goal")
    user_id = data.get("user_id", "default")
    if goal:
        db[f"user:{user_id}:goal"] = goal
        return jsonify({"message": f"Goal set to {goal}"}), 200
    return jsonify({"error": "No goal provided"}), 400

@app.route("/api/onboard", methods=["POST"])
def onboard():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data received"}), 400
            
        user_id = data.get("user_id", "default")
        name = data.get("name", "client").strip().split()[0] if data.get("name") else "client"
        goal = data.get("goal", "your fitness goals")
        source = data.get("source", "website")

        # Save memory
        db[f"user:{user_id}:name"] = name
        db[f"user:{user_id}:goal"] = goal
        db[f"user:{user_id}:source"] = source
        db[f"user:{user_id}:messages"] = []

        # Build welcome message
        welcome_message = (
            f"Hey {name}! 👋 Thanks for joining WillpowerFitness AI via {source}.\n"
            f"I've logged your goal: *{goal}*. I'm here to guide your journey 💪\n"
            "Ready to get started? Ask me anything about fitness, nutrition, or workouts!"
        )

        return jsonify({"message": welcome_message}), 200
    except Exception as e:
        print(f"Onboard error: {e}")
        return jsonify({"error": "Server error occurred"}), 500

@app.route("/api/webhook", methods=["POST"])
def webhook():
    """For external integrations like SMS or other services"""
    data = request.get_json()
    user_id = data.get("user_id", "unknown")
    user_input = data.get("message", "Hello")

    ai_reply = ask_groq_ai(user_input, user_id)
    return jsonify({"reply": ai_reply})

@app.route("/api/thumbtack", methods=["POST"])
def thumbtack_inquiry():
    """Handle Thumbtack fitness training inquiries"""
    data = request.get_json()
    
    customer_name = data.get("customer_name", "Friend")
    customer_email = data.get("customer_email")
    inquiry_message = data.get("message", "I'm interested in personal training")
    
    # Generate AI response for consultation offer
    ai_response = ask_groq_ai(
        f"A potential client named {customer_name} contacted us through Thumbtack with this inquiry: '{inquiry_message}'. Respond professionally offering either AI coaching consultation or human trainer consultation, and explain our $225/month membership program.",
        customer_email or "thumbtack_lead"
    )
    
    # Store lead info
    db[f"lead:{customer_email}:source"] = "thumbtack"
    db[f"lead:{customer_email}:status"] = "consultation_offered"
    
    return jsonify({
        "reply": ai_response,
        "next_action": "consultation_booking",
        "customer_email": customer_email
    })

@app.route("/api/email-inquiry", methods=["POST"])
def email_inquiry():
    """Handle email fitness inquiries"""
    data = request.get_json()
    
    sender_email = data.get("from_email")
    subject = data.get("subject", "")
    email_body = data.get("body", "")
    
    # Generate AI response
    ai_response = ask_groq_ai(
        f"Someone emailed us about fitness training. Subject: '{subject}', Message: '{email_body}'. Respond professionally offering consultation options and our $225/month membership.",
        sender_email
    )
    
    # Store lead
    db[f"lead:{sender_email}:source"] = "email"
    db[f"lead:{sender_email}:inquiry"] = email_body
    
    return jsonify({
        "reply": ai_response,
        "send_to": sender_email,
        "next_action": "consultation_booking"
    })

@app.route("/api/book-consultation", methods=["POST"])
def book_consultation():
    """Handle consultation booking requests"""
    data = request.get_json()
    
    customer_email = data.get("customer_email")
    consultation_type = data.get("type", "ai")  # "ai" or "human"
    preferred_time = data.get("preferred_time")
    
    if consultation_type == "ai":
        response = "Great! I can start your AI fitness consultation right now. Let's begin with understanding your fitness goals and current situation."
        next_action = "start_ai_consultation"
    else:
        response = f"I've scheduled your consultation with one of our human trainers for {preferred_time}. You'll receive a calendar invite shortly. To complete your booking, please secure your spot with our $225/month membership."
        next_action = "payment_required"
    
    # Update lead status
    db[f"lead:{customer_email}:consultation_type"] = consultation_type
    db[f"lead:{customer_email}:status"] = "consultation_booked"
    
    return jsonify({
        "reply": response,
        "next_action": next_action,
        "payment_link": "https://buy.stripe.com/your-payment-link" if next_action == "payment_required" else None
    })

@app.route("/api/stripe-success", methods=["POST"])
def stripe_payment_success():
    """Handle successful Stripe payments"""
    data = request.get_json()
    
    customer_email = data.get("customer_email")
    subscription_id = data.get("subscription_id")
    amount = data.get("amount", 225)
    
    # Update customer status
    db[f"customer:{customer_email}:subscription_id"] = subscription_id
    db[f"customer:{customer_email}:status"] = "active_member"
    db[f"customer:{customer_email}:monthly_amount"] = amount
    
    # Generate welcome message for paying customer
    welcome_message = ask_groq_ai(
        f"A new customer just paid ${amount}/month for our fitness coaching program! Send them an enthusiastic welcome message and ask them to tell me about their fitness goals so we can create their personalized training plan.",
        customer_email
    )
    
    return jsonify({
        "reply": welcome_message,
        "customer_status": "active_member",
        "next_action": "start_training_program"
    })

@app.route("/api/leads", methods=["GET"])
def get_leads():
    """Get all leads and customers for admin dashboard"""
    leads = {}
    customers = {}
    
    for key, value in db.items():
        if key.startswith("lead:"):
            email = key.split(":")[1]
            if email not in leads:
                leads[email] = {}
            field = key.split(":")[2]
            leads[email][field] = value
        elif key.startswith("customer:"):
            email = key.split(":")[1]
            if email not in customers:
                customers[email] = {}
            field = key.split(":")[2]
            customers[email][field] = value
    
    return jsonify({
        "leads": leads,
        "customers": customers,
        "total_leads": len(leads),
        "active_customers": len(customers)
    })

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
