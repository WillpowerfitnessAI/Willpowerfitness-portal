import os
import requests
import stripe
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
STRIPE_SECRET_KEY = os.getenv("Stripe_payment_key")

# Initialize Stripe
if STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY

# Initialize Supabase client (optional - only if you have Supabase credentials)
supabase = None
if SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        print(f"Supabase initialization failed: {e}")

def get_user_context(user_id):
    """Load comprehensive user context and history"""
    context = {
        'name': db.get(f"user:{user_id}:name", "Friend"),
        'goal': db.get(f"user:{user_id}:goal", "your fitness goals"),
        'source': db.get(f"user:{user_id}:source", "website"),
        'history': db.get(f"user:{user_id}:messages", []),
        'preferences': db.get(f"user:{user_id}:preferences", {}),
        'challenges': db.get(f"user:{user_id}:challenges", []),
        'wins': db.get(f"user:{user_id}:wins", [])
    }
    return context

def ask_groq_ai(user_input, user_id="default"):
    """Main AI function that handles personalized responses with memory"""
    if not GROQ_API_KEY:
        return "Error: GROQ_API_KEY environment variable not set. Please configure it in your deployment settings."

    # Load comprehensive user context
    user_context = get_user_context(user_id)
    name = user_context['name']
    goal = user_context['goal']
    history = user_context['history']

    # Save new user message
    history.append({"role": "user", "content": user_input})

    # Build proper messages array for Groq API
    messages = [
        {"role": "system", "content": f"""You are Will Power, founder of WillpowerFitness - an experienced personal trainer and fitness coach. You are currently working with {name} whose goal is {goal}.

CRITICAL: ALWAYS address {name} BY NAME. Never call them "friend" or generic terms. This is {name} and you know them personally.

YOUR AUTHENTIC PERSONALITY - BE LIKE THE REAL WILL POWER:
- CRITICAL THINKER: Question assumptions, dig deeper, challenge limiting beliefs with logic
- JOKESTER WITH PURPOSE: Use humor strategically - lighten the mood but keep it real and productive
- SERIOUS WHEN NEEDED: Know when to drop the jokes and get down to business
- INSPIRATIONAL REALIST: Motivate with truth, not just empty positivity - show them what's actually possible
- DIRECT & HONEST: Call out excuses respectfully, push when needed, celebrate real progress
- MEMORY MASTER: Remember everything about {name} - their struggles, wins, patterns, preferences

YOUR COMMUNICATION STYLE WITH {name}:
- Always use {name}'s name frequently in conversation - make it personal
- Think critically about their challenges and offer solutions that actually work
- Use appropriate humor to keep them engaged, but stay focused on results
- Be inspirational through honest assessment of their potential
- Remember their history and reference past conversations
- Ask probing questions that make them think deeper about their habits
- Give specific, science-based advice they can actually implement
- Balance being supportive with being real about what needs to change

REMEMBER ABOUT {name}:
- Their goal: {goal}
- Always reference their specific journey and previous conversations
- Build on what you know about their preferences, challenges, and progress
- Make every interaction feel like you genuinely know and care about them

Be the coach who combines critical thinking, strategic humor, serious dedication, and authentic inspiration. This is {name} - treat them like the individual they are, not a generic client."""}
    ]

    # Add recent conversation history with better context
    for msg in history[-30:]:  # Last 30 messages for better context management
        messages.append({"role": msg["role"], "content": msg["content"]})
    
    # Add a reminder about the user's identity and history
    if len(history) > 5:  # If there's conversation history
        messages.append({"role": "system", "content": f"Remember: You're talking to {name}. Reference your conversation history with them and their goal of {goal}. Be personal and show you remember them."})

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
    messages_key = f"user:{user_id}:messages"
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

@app.route("/attached_assets/<path:filename>")
def attached_assets(filename):
    """Serve files from attached_assets directory"""
    from flask import send_from_directory
    import os
    try:
        # Handle nested paths like videos/filename.mp4
        if '/' in filename:
            directory_parts = filename.split('/')
            subdirectory = '/'.join(directory_parts[:-1])
            file_name = directory_parts[-1]
            full_path = os.path.join('attached_assets', subdirectory)
            return send_from_directory(full_path, file_name)
        else:
            return send_from_directory('attached_assets', filename)
    except FileNotFoundError:
        print(f"File not found: attached_assets/{filename}")
        return "File not found", 404

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
            f"What's up, {name}! 👋 Will Power here - welcome to WillpowerFitness AI via {source}.\n"
            f"I've got your goal locked in: *{goal}*. Now here's the thing - I'm not your typical 'rah-rah' trainer. "
            f"I'm going to challenge how you think about fitness, crack some jokes to keep it fun, but when it's time to work, we get SERIOUS about results. 💪\n"
            f"So {name}, let's cut through the BS and figure out what's really going to move the needle for you. What's your biggest challenge right now?"
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

    # Generate payment link
    payment_link = create_stripe_payment_link(customer_email, customer_name)

    # Generate AI response for consultation offer
    ai_response = ask_groq_ai(
        f"A potential client named {customer_name} contacted us through Thumbtack with this inquiry: '{inquiry_message}'. Respond professionally offering either AI coaching consultation or human trainer consultation, and explain our $225/month membership program. Include this payment link in your response: {payment_link}",
        customer_email or "thumbtack_lead"
    )

    # Store lead info
    db[f"lead:{customer_email}:source"] = "thumbtack"
    db[f"lead:{customer_email}:status"] = "consultation_offered"

    return jsonify({
        "reply": ai_response,
        "payment_link": payment_link,
        "next_action": "payment_required",
        "customer_email": customer_email
    })

@app.route("/api/sms-inquiry", methods=["POST"])
def sms_inquiry():
    """Handle SMS/text message fitness inquiries"""
    data = request.get_json()

    phone_number = data.get("from_number")
    message_body = data.get("body", "")
    sender_name = data.get("sender_name", "Friend")

    # Generate payment link (use phone as identifier)
    payment_link = create_stripe_payment_link(phone_number, sender_name)

    # Generate AI response
    ai_response = ask_groq_ai(
        f"Someone texted us about fitness training. Message: '{message_body}'. Respond professionally offering consultation options and our $225/month membership. Include this payment link: {payment_link}",
        phone_number
    )

    # Store lead
    db[f"lead:{phone_number}:source"] = "sms"
    db[f"lead:{phone_number}:inquiry"] = message_body
    db[f"lead:{phone_number}:status"] = "consultation_offered"

    return jsonify({
        "reply": ai_response,
        "send_to": phone_number,
        "payment_link": payment_link,
        "next_action": "payment_required"
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
    customer_name = data.get("customer_name", "Friend")

    # Generate payment link
    payment_link = create_stripe_payment_link(customer_email, customer_name)

    if consultation_type == "ai":
        response = f"Great! I can start your AI fitness consultation right now, but first please secure your $225/month membership to access all features: {payment_link}"
        next_action = "payment_required"
    else:
        response = f"I've scheduled your consultation with one of our human trainers for {preferred_time}. To complete your booking, please secure your spot with our $225/month membership: {payment_link}"
        next_action = "payment_required"

    # Update lead status
    db[f"lead:{customer_email}:consultation_type"] = consultation_type
    db[f"lead:{customer_email}:status"] = "consultation_booked"

    return jsonify({
        "reply": response,
        "next_action": next_action,
        "payment_link": payment_link
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

def create_stripe_payment_link(customer_email, customer_name="Customer"):
    """Create a Stripe payment link for the fitness membership"""
    if not STRIPE_SECRET_KEY:
        return "https://willpowerfitness.com/payment"  # Fallback URL

    try:
        # Create or retrieve customer
        customers = stripe.Customer.list(email=customer_email, limit=1)
        if customers.data:
            customer = customers.data[0]
        else:
            customer = stripe.Customer.create(
                email=customer_email,
                name=customer_name,
                metadata={"source": "willpowerfitness_ai"}
            )

        # Create payment link for $225/month subscription
        payment_link = stripe.PaymentLink.create(
            line_items=[{
                'price_data': {
                    'currency': 'usd',
                    'product_data': {
                        'name': 'WillpowerFitness AI Monthly Membership',
                        'description': 'Monthly access to AI fitness coaching and human trainer consultations'
                    },
                    'unit_amount': 22500,  # $225.00 in cents
                    'recurring': {
                        'interval': 'month'
                    }
                },
                'quantity': 1,
            }],
            metadata={
                'customer_email': customer_email,
                'customer_name': customer_name
            }
        )

        return payment_link.url
    except Exception as e:
        print(f"Stripe error: {e}")
        return "https://willpowerfitness.com/payment"  # Fallback URL

@app.route("/api/stripe-webhook", methods=["POST"])
def stripe_webhook():
    """Handle Stripe webhook events"""
    payload = request.get_data()
    sig_header = request.headers.get('Stripe-Signature')

    try:
        # Verify webhook signature if you have webhook secret
        event = stripe.Event.construct_from(
            request.get_json(), stripe.api_key
        )
    except Exception as e:
        print(f"Webhook error: {e}")
        return jsonify({"error": "Invalid payload"}), 400

    # Handle successful payment
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        customer_email = session.get('customer_details', {}).get('email')

        if customer_email:
            # Generate welcome message for new member
            welcome_message = ask_groq_ai(
                "A new customer just paid $225/month for our fitness coaching program! Send them an enthusiastic welcome message and ask them to tell me about their fitness goals so we can create their personalized training plan.",
                customer_email
            )

            # Update customer status
            db[f"customer:{customer_email}:subscription_id"] = session.get('subscription')
            db[f"customer:{customer_email}:status"] = "active_member"
            db[f"customer:{customer_email}:monthly_amount"] = 225

            # You can send email here or trigger Zapier webhook
            # For now, we'll just log it
            print(f"New member: {customer_email} - Welcome message: {welcome_message}")

    return jsonify({"status": "success"}), 200

@app.route("/api/lead-capture", methods=["POST"])
def lead_capture():
    """Handle lead capture form submissions from website"""
    data = request.get_json()

    customer_name = data.get("name", "Friend")
    customer_email = data.get("email")
    customer_phone = data.get("phone", "")
    goals = data.get("goals", "general fitness")
    experience = data.get("experience", "beginner")
    message = data.get("message", "")

    if not customer_email:
        return jsonify({"error": "Email is required"}), 400

    # Generate payment link
    payment_link = create_stripe_payment_link(customer_email, customer_name)

    # Create personalized AI consultation response
    consultation_prompt = f"""
    A potential client named {customer_name} submitted a fitness consultation request:
    - Goals: {goals}
    - Experience: {experience}
    - Message: {message}

    Create a personalized, professional response that:
    1. Addresses their specific goals and experience level
    2. Explains how our AI coaching can help them
    3. Mentions our $225/month membership program
    4. Includes this payment link: {payment_link}
    5. Creates excitement about their fitness transformation

    Keep it encouraging, professional, and action-oriented.
    """

    ai_response = ask_groq_ai(consultation_prompt, customer_email)

    # Store comprehensive lead info
    timestamp = datetime.utcnow().isoformat()
    db[f"lead:{customer_email}:name"] = customer_name
    db[f"lead:{customer_email}:phone"] = customer_phone
    db[f"lead:{customer_email}:goals"] = goals
    db[f"lead:{customer_email}:experience"] = experience
    db[f"lead:{customer_email}:message"] = message
    db[f"lead:{customer_email}:source"] = "website_form"
    db[f"lead:{customer_email}:status"] = "consultation_sent"
    db[f"lead:{customer_email}:timestamp"] = timestamp
    db[f"lead:{customer_email}:ai_response"] = ai_response

    # Save to Supabase if available
    if supabase:
        try:
            supabase.table("leads").insert({
                "email": customer_email,
                "name": customer_name,
                "phone": customer_phone,
                "goals": goals,
                "experience": experience,
                "message": message,
                "source": "website_form",
                "status": "consultation_sent",
                "ai_response": ai_response,
                "payment_link": payment_link,
                "timestamp": timestamp
            }).execute()
        except Exception as e:
            print(f"Error saving lead to Supabase: {e}")

    return jsonify({
        "success": True,
        "message": "Lead captured successfully",
        "ai_response": ai_response,
        "payment_link": payment_link,
        "next_action": "email_consultation_sent"
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



@app.route("/api/upload", methods=["POST"])
def upload_file():
    """Handle file uploads (progress photos, documents, etc.)"""
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400

        file = request.files['file']
        user_id = request.form.get('user_id', 'default')
        file_type = request.form.get('type', 'general')  # 'progress_photo', 'document', 'meal_plan'

        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400

        # Save file info to database
        timestamp = datetime.utcnow().isoformat()
        file_key = f"upload:{user_id}:{timestamp}:{file.filename}"

        # In a real implementation, you'd save to Object Storage
        # For now, we'll save metadata to our in-memory db
        db[file_key] = {
            "filename": file.filename,
            "type": file_type,
            "user_id": user_id,
            "timestamp": timestamp,
            "size": len(file.read())
        }

        return jsonify({
            "success": True,
            "file_id": file_key,
            "message": f"File '{file.filename}' uploaded successfully"
        })

    except Exception as e:
        print(f"Upload error: {e}")
        return jsonify({"error": "Upload failed"}), 500

@app.route("/api/downloads/<user_id>", methods=["GET"])
def get_user_downloads(user_id):
    """Get downloadable files for a user (workout plans, progress reports)"""
    try:
        # Generate personalized workout plan
        user_name = db.get(f"user:{user_id}:name", "Friend")
        user_goal = db.get(f"user:{user_id}:goal", "fitness goals")

        downloads = [
            {
                "id": 1,
                "title": f"{user_name}'s Personalized Workout Plan",
                "description": f"Custom workout plan for {user_goal}",
                "type": "pdf",
                "size": "2.1 MB",
                "created": datetime.utcnow().isoformat(),
                "download_url": f"/api/generate-workout-plan/{user_id}"
            },
            {
                "id": 2,
                "title": "Nutrition Guidelines",
                "description": "Complete nutrition guide with meal suggestions",
                "type": "pdf",
                "size": "1.8 MB",
                "created": datetime.utcnow().isoformat(),
                "download_url": "/api/generate-nutrition-guide"
            },
            {
                "id": 3,
                "title": "Progress Tracking Sheet",
                "description": "Track your workouts and measurements",
                "type": "pdf",
                "size": "0.5 MB",
                "created": datetime.utcnow().isoformat(),
                "download_url": "/api/generate-progress-tracker"
            }
        ]

        return jsonify({"downloads": downloads})

    except Exception as e:
        print(f"Downloads error: {e}")
        return jsonify({"error": "Failed to get downloads"}), 500

@app.route("/api/generate-workout-plan/<user_id>", methods=["GET"])
def generate_workout_plan(user_id):
    """Generate and return a personalized workout plan"""
    try:
        user_name = db.get(f"user:{user_id}:name", "Friend")
        user_goal = db.get(f"user:{user_id}:goal", "fitness goals")

        # Generate AI workout plan
        plan_prompt = f"""
        Create a detailed 4-week workout plan for {user_name} whose goal is {user_goal}.
        Include:
        - Weekly schedule (3-4 workouts per week)
        - Specific exercises with sets/reps
        - Progressive overload recommendations
        - Rest day activities
        - Nutrition tips

        Format it as a comprehensive PDF-ready document.
        """

        workout_plan = ask_groq_ai(plan_prompt, user_id)

        # In a real implementation, you'd generate an actual PDF
        # For now, return the text content
        return {
            "content_type": "text/plain",
            "filename": f"{user_name}_workout_plan.txt",
            "content": workout_plan
        }

    except Exception as e:
        print(f"Workout plan generation error: {e}")
        return jsonify({"error": "Failed to generate workout plan"}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)