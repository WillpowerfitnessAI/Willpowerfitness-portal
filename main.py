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
PRINTFUL_API_KEY = os.getenv("PRINTFUL_API_KEY")

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
        {"role": "system", "content": f"""You are Will Power, founder of Willpower Fitness - an experienced personal trainer and fitness coach. You are currently working with {name} whose goal is {goal}.

YOUR AUTHENTIC PERSONALITY - BE LIKE THE REAL WILL POWER:
- CRITICAL THINKER: Question assumptions, dig deeper, challenge limiting beliefs with logic
- JOKESTER WITH PURPOSE: Use humor strategically - lighten the mood but keep it real and productive
- SERIOUS WHEN NEEDED: Know when to drop the jokes and get down to business
- INSPIRATIONAL REALIST: Motivate with truth, not just empty positivity - show them what's actually possible
- DIRECT & HONEST: Call out excuses respectfully, push when needed, celebrate real progress
- MEMORY MASTER: Remember everything about this client - their struggles, wins, patterns, preferences

YOUR COMMUNICATION STYLE:
- Use the client's name when first introduced and occasionally throughout conversations, not constantly
- Think critically about their challenges and offer solutions that actually work
- Use appropriate humor to keep them engaged, but stay focused on results
- Be inspirational through honest assessment of their potential
- Remember their history and reference past conversations
- Ask probing questions that make them think deeper about their habits
- Give general fitness advice and motivation, but NEVER give complete workout plans
- For workout requests, give 1-2 sample exercises maximum, then say "For complete workout programs, nutrition plans, and personalized coaching, join Willpower Fitness membership!"
- Always redirect workout plan requests to membership signup
- Focus on motivation, form tips, and general guidance rather than specific routines
- IMPORTANT: Never provide complete workout routines or detailed meal plans - these require paid membership
- When asked for workouts, give 1-2 exercises as examples only, then direct to membership
- NEVER mention community accountability, motivation from community, or Facebook groups
- ALWAYS use numbered lists (1., 2., 3.) for ALL lists and bullet points
- NEVER use asterisks or any special formatting characters in responses
- ABSOLUTELY NO EMOJIS, EMOTICONS, OR SYMBOLS - responses must be completely text-based
- Keep responses clean and text-only for optimal voice synthesis
- Do not use any decorative characters, symbols, emojis, or special formatting whatsoever
- Professional text communication only - no visual elements
"""}
    ]

    # Add recent conversation history with better context
    for msg in history[-30:]:  # Last 30 messages for better context management
        messages.append({"role": msg["role"], "content": msg["content"]})

    # Add a reminder about the user's identity and history
    if len(history) > 5:  # If there's conversation history
        messages.append({"role": "system", "content": f"Remember: You're talking to this client. Reference your conversation history with them and their goal of {goal}. Be personal and show you remember them."})

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
        return """
        <!DOCTYPE html>
        <html>
        <head>
            <title>WillpowerFitness AI Coach</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body>
            <div id="root"></div>
            <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
            <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
            <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
            <script type="text/babel" src="/static/App.jsx"></script>
        </body>
        </html>
        """, 200

@app.route("/test", methods=["GET"])
def test_page():
    """Simple test page to verify the server is working"""
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>WillpowerFitness - Test Page</title>
        <style>
            body { 
                font-family: Arial, sans-serif; 
                max-width: 800px; 
                margin: 50px auto; 
                padding: 20px; 
                background: #f8f9fa;
            }
            .header {
                text-align: center;
                background: linear-gradient(45deg, #007bff, #28a745);
                color: white;
                padding: 2rem;
                border-radius: 10px;
                margin-bottom: 2rem;
            }
            .test-section {
                background: white;
                padding: 2rem;
                border-radius: 10px;
                margin-bottom: 1rem;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .test-button { 
                padding: 15px 30px; 
                background: #007bff; 
                color: white; 
                border: none; 
                border-radius: 5px; 
                cursor: pointer; 
                margin: 10px; 
                font-size: 16px;
                transition: background 0.3s;
            }
            .test-button:hover {
                background: #0056b3;
            }
            .test-button.success {
                background: #28a745;
            }
            .test-button.danger {
                background: #dc3545;
            }
            .result { 
                margin: 20px 0; 
                padding: 15px; 
                background: #f8f9fa; 
                border: 1px solid #ddd;
                border-radius: 5px; 
                max-height: 400px;
                overflow-y: auto;
            }
            .status {
                display: inline-block;
                padding: 5px 10px;
                border-radius: 3px;
                font-size: 14px;
                font-weight: bold;
            }
            .status.online {
                background: #d4edda;
                color: #155724;
            }
            .status.offline {
                background: #f8d7da;
                color: #721c24;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🎽 WillpowerFitness AI - System Test</h1>
            <p>Test all your integrations and API connections</p>
        </div>

        <div class="test-section">
            <h2>🏃 Server Status</h2>
            <p>Flask Server: <span class="status online">ONLINE</span></p>
            <p>Test page loading successfully! ✅</p>
        </div>

        <div class="test-section">
            <h2>🔌 API Testing</h2>
            <p>Test your external integrations:</p>

            <button class="test-button" onclick="testBasicAPI()">Test Basic API</button>
            <button class="test-button" onclick="testPrintfulAPI()">Test Printful Connection</button>
            <button class="test-button" onclick="testCreateOrder()">Create Sample T-Shirt Order</button>
            <button class="test-button" onclick="testChatBot()">Test AI Chat</button>
            <button class="test-button" onclick="testVideos()">Test Video Library</button>
        </div>

        <div class="test-section">
            <h2>📊 Results</h2>
            <div id="results" class="result" style="display:none;"></div>
        </div>

        <script>
            async function testBasicAPI() {
                showResult('Testing basic API endpoint...');
                try {
                    const response = await fetch('/api/status');
                    const result = await response.json();
                    showResult('✅ Basic API working!\\n' + JSON.stringify(result, null, 2));
                } catch (error) {
                    showResult('❌ Basic API Error: ' + error.message);
                }
            }

            async function testChatBot() {
                showResult('Testing AI chatbot...');
                try {
                    const response = await fetch('/api/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            message: 'Hello, this is a test',
                            user_id: 'test_user'
                        })
                    });
                    const result = await response.json();
                    showResult('✅ AI Chat working!\\nReply: ' + result.reply);
                } catch (error) {
                    showResult('❌ AI Chat Error: ' + error.message);
                }
            }

            async function testVideos() {
                showResult('Testing video library...');
                try {
                    const response = await fetch('/api/videos');
                    const result = await response.json();
                    if (result.status === 'coming_soon') {
                        showResult('📹 Video library status: ' + result.message);
                    } else {
                        showResult('✅ Video library working!\\n' + result.videos.length + ' videos available');
                    }
                } catch (error) {
                    showResult('❌ Video API Error: ' + error.message);
                }
            }

            async function testPrintfulAPI() {
                showResult('Testing Printful API connection...');
                try {
                    const response = await fetch('/api/printful-test', { method: 'POST' });
                    const result = await response.json();
                    if (result.success) {
                        showResult('✅ Printful API Connected!\\n' + JSON.stringify(result, null, 2));
                    } else {
                        showResult('❌ Printful API Failed:\\n' + JSON.stringify(result, null, 2));
                    }
                } catch (error) {
                    showResult('❌ Printful API Error: ' + error.message);
                }
            }

            async function testCreateOrder() {
                showResult('Creating test Printful order...');
                try {
                    const response = await fetch('/api/test-order', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            email: 'test@willpowerfitness.com',
                            name: 'Test Customer',
                            size: 'M',
                            address: '123 Test St\\nLos Angeles, CA 90210'
                        })
                    });
                    const result = await response.json();
                    if (result.success) {
                        showResult('✅ Test order created!\\n' + JSON.stringify(result, null, 2));
                    } else {
                        showResult('❌ Order creation failed:\\n' + JSON.stringify(result, null, 2));
                    }
                } catch (error) {
                    showResult('❌ Order Error: ' + error.message);
                }
            }

            function showResult(message) {
                const resultsDiv = document.getElementById('results');
                resultsDiv.style.display = 'block';
                resultsDiv.innerHTML = '<pre>' + message + '</pre>';
            }
        </script>
    </body>
    </html>
    """

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

@app.route("/static/<path:filename>")
def static_files(filename):
    """Serve static files including React components"""
    from flask import send_from_directory
    import os
    try:
        # Serve React components from root directory
        if filename.endswith('.jsx'):
            return send_from_directory('.', filename)
        # Serve other static files
        return send_from_directory('static', filename)
    except FileNotFoundError:
        print(f"Static file not found: {filename}")
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
            f"What's up, {name}! Will Power here - welcome to Willpower Fitness AI via {source}.\n"
            f"I've got your goal locked in: {goal}. Now here's the thing - I'm not your typical 'rah-rah' trainer. "
            f"I'm going to challenge how you think about fitness, crack some jokes to keep it fun, but when it's time to work, we get SERIOUS about results.\n"
            f"So let's cut through the BS and figure out what's really going to move the needle for you. What's your biggest challenge right now?"
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

def create_printful_order(customer_email, tshirt_size, shipping_address, customer_name):
    """Create order in Printful for t-shirt fulfillment"""
    if not PRINTFUL_API_KEY:
        print("Warning: PRINTFUL_API_KEY not set - skipping Printful order creation")
        return None

    try:
        # Parse shipping address - improved parsing
        address_lines = [line.strip() for line in shipping_address.split('\n') if line.strip()]

        # Basic address parsing
        address1 = address_lines[0] if len(address_lines) > 0 else shipping_address

        # Try to extract city, state, zip from last line
        if len(address_lines) >= 2:
            last_line = address_lines[-1]
            # Look for patterns like "City, ST 12345" or "City ST 12345"
            import re
            match = re.match(r'(.+?),?\s+([A-Z]{2})\s+(\d{5})', last_line)
            if match:
                city = match.group(1).strip()
                state_code = match.group(2)
                zip_code = match.group(3)
            else:
                # Fallback parsing
                parts = last_line.split()
                if len(parts) >= 3:
                    city = ' '.join(parts[:-2])
                    state_code = parts[-2] if len(parts[-2]) == 2 else "CA"
                    zip_code = parts[-1] if parts[-1].isdigit() else "90210"
                else:
                    city = last_line
                    state_code = "CA"
                    zip_code = "90210"
        else:
            city = "Los Angeles"
            state_code = "CA"
            zip_code = "90210"

        # Size mapping for Printful variant IDs (Bella+Canvas 3001 Unisex T-Shirt)
        size_variants = {
            "S": 4011,    # Small
            "M": 4012,    # Medium  
            "L": 4013,    # Large
            "XL": 4014,   # X-Large
            "XXL": 4015   # XX-Large
        }

        variant_id = size_variants.get(tshirt_size, 4012)  # Default to Medium

        # WillpowerFitness AI logo design file
        design_url = "https://trainerai-groqapp-willpowerfitness.replit.app/attached_assets/WillPowerFitness%20Profile%20Image_1751491136331.png"

        # Create order payload
        order_data = {
            "recipient": {
                "name": customer_name,
                "address1": address1,
                "city": city,
                "state_code": state_code,
                "country_code": "US",
                "zip": zip_code
            },
            "items": [
                {
                    "variant_id": variant_id,
                    "quantity": 1,
                    "files": [
                        {
                            "type": "front",
                            "url": design_url
                        }
                    ]
                }
            ],
            "external_id": f"willpower_{customer_email}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
            "shipping": "STANDARD"
        }

        print(f"🎽 Creating Printful order for {customer_name}")
        print(f"📍 Shipping to: {address1}, {city}, {state_code} {zip_code}")
        print(f"👕 Size: {tshirt_size} (Variant ID: {variant_id})")

        # Make API request to Printful
        response = requests.post(
            "https://api.printful.com/orders",
            headers={
                "Authorization": f"Bearer {PRINTFUL_API_KEY}",
                "Content-Type": "application/json"
            },
            json=order_data
        )

        if response.status_code == 200 or response.status_code == 201:
            order_result = response.json()
            printful_order_id = order_result.get("result", {}).get("id")

            # Store Printful order info
            db[f"printful:{customer_email}:order_id"] = printful_order_id
            db[f"printful:{customer_email}:status"] = "draft"
            db[f"printful:{customer_email}:created"] = datetime.utcnow().isoformat()
            db[f"printful:{customer_email}:variant_id"] = variant_id
            db[f"printful:{customer_email}:size"] = tshirt_size

            print(f"✅ Printful order created: {printful_order_id} for {customer_name}")
            return printful_order_id
        else:
            print(f"❌ Printful order failed: {response.status_code} - {response.text}")
            # Store error for debugging
            db[f"printful:{customer_email}:error"] = f"{response.status_code}: {response.text}"
            return None

    except Exception as e:
        print(f"Error creating Printful order: {e}")
        db[f"printful:{customer_email}:error"] = str(e)
        return None

def confirm_printful_order(customer_email):
    """Confirm Printful order for fulfillment"""
    if not PRINTFUL_API_KEY:
        return False

    try:
        printful_order_id = db.get(f"printful:{customer_email}:order_id")
        if not printful_order_id:
            print(f"No Printful order found for {customer_email}")
            return False

        # Confirm the order
        response = requests.post(
            f"https://api.printful.com/orders/{printful_order_id}/confirm",
            headers={
                "Authorization": f"Bearer {PRINTFUL_API_KEY}",
                "Content-Type": "application/json"
            }
        )

        if response.status_code == 200:
            db[f"printful:{customer_email}:status"] = "confirmed"
            db[f"printful:{customer_email}:confirmed_at"] = datetime.utcnow().isoformat()
            print(f"✅ Printful order confirmed: {printful_order_id}")
            return True
        else:
            print(f"❌ Failed to confirm Printful order: {response.status_code} - {response.text}")
            return False

    except Exception as e:
        print(f"Error confirming Printful order: {e}")
        return False

def get_printful_order_status(customer_email):
    """Get current status of Printful order"""
    if not PRINTFUL_API_KEY:
        return None

    try:
        printful_order_id = db.get(f"printful:{customer_email}:order_id")
        if not printful_order_id:
            return None

        response = requests.get(
            f"https://api.printful.com/orders/{printful_order_id}",
            headers={
                "Authorization": f"Bearer {PRINTFUL_API_KEY}"
            }
        )

        if response.status_code == 200:
            order_data = response.json().get("result", {})
            status = order_data.get("status")
            shipments = order_data.get("shipments", [])

            # Update local status
            db[f"printful:{customer_email}:status"] = status

            if shipments:
                tracking_number = shipments[0].get("tracking_number")
                if tracking_number:
                    db[f"printful:{customer_email}:tracking"] = tracking_number

            return {
                "status": status,
                "shipments": shipments,
                "order_data": order_data
            }
        else:
            print(f"Failed to get Printful order status: {response.status_code}")
            return None

    except Exception as e:
        print(f"Error getting Printful order status: {e}")
        return None

def create_stripe_payment_link(customer_email, customer_name="Customer"):
    """Create a Stripe payment link for fitness membership + t-shirt bundle"""
    # Return working Stripe payment link
    return "https://buy.stripe.com/4gw8wVcGh0qkc4o7ss"

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
        customer_name = session.get('customer_details', {}).get('name', 'New Member')

        # Extract custom fields data
        custom_fields = session.get('custom_fields', [])
        tshirt_size = None
        shipping_address = None
        fitness_goals = None
        experience_level = None

        for field in custom_fields:
            if field.get('key') == 'tshirt_size':
                tshirt_size = field.get('dropdown', {}).get('value')
            elif field.get('key') == 'shipping_address':
                shipping_address = field.get('text', {}).get('value')
            elif field.get('key') == 'fitness_goals':
                fitness_goals = field.get('text', {}).get('value')
            elif field.get('key') == 'experience_level':
                experience_level = field.get('dropdown', {}).get('value')

        if customer_email:
            # Generate welcome message for new member with t-shirt info
            welcome_message = ask_groq_ai(
                f"A new customer {customer_name} just paid $225/month for our fitness coaching program + FREE t-shirt! Their goal is: {fitness_goals}, experience level: {experience_level}. Send them an enthusiastic welcome message mentioning their FREE WillpowerFitness AI t-shirt will ship soon, and ask them to start their fitness journey by telling you more about their current routine.",
                customer_email
            )

            # Update customer status with all collected data
            db[f"customer:{customer_email}:subscription_id"] = session.get('subscription')
            db[f"customer:{customer_email}:status"] = "active_member"
            db[f"customer:{customer_email}:monthly_amount"] = 225
            db[f"customer:{customer_email}:name"] = customer_name
            db[f"customer:{customer_email}:fitness_goals"] = fitness_goals
            db[f"customer:{customer_email}:experience_level"] = experience_level

            # T-shirt fulfillment data
            if tshirt_size and shipping_address:
                db[f"tshirt:{customer_email}:size"] = tshirt_size
                db[f"tshirt:{customer_email}:address"] = shipping_address
                db[f"tshirt:{customer_email}:status"] = "pending_fulfillment"
                db[f"tshirt:{customer_email}:order_date"] = datetime.utcnow().isoformat()

                # Create Printful order
                printful_order_id = create_printful_order(
                    customer_email, 
                    tshirt_size, 
                    shipping_address, 
                    customer_name
                )

                if printful_order_id:
                    # Auto-confirm the order for fulfillment
                    confirm_printful_order(customer_email)
                    db[f"tshirt:{customer_email}:status"] = "sent_to_printful"
                    print(f"🎽 T-SHIRT ORDER SENT TO PRINTFUL: {customer_name} ({customer_email}) - Size: {tshirt_size}")
                else:
                    print(f"⚠️ Printful order failed - manual fulfillment needed")

                print(f"📦 SHIP TO: {shipping_address}")

            print(f"🎉 NEW MEMBER: {customer_name} ({customer_email})")
            print(f"💪 GOAL: {fitness_goals} | LEVEL: {experience_level}")

    return jsonify({"status": "success"}), 200

@app.route("/api/printful-webhook", methods=["POST"])
def printful_webhook():
    """Handle Printful webhook events for order updates"""
    try:
        data = request.get_json()
        event_type = data.get("type")
        order_data = data.get("data", {})

        external_id = order_data.get("external_id", "")
        order_id = order_data.get("id")
        status = order_data.get("status")

        print(f"📦 Printful Webhook: {event_type} - Order {order_id} - Status: {status}")

        # Extract customer email from external_id
        if external_id.startswith("willpower_"):
            parts = external_id.split("_")
            if len(parts) >= 2:
                customer_email = parts[1]

                # Update order status
                db[f"printful:{customer_email}:status"] = status
                db[f"printful:{customer_email}:updated"] = datetime.utcnow().isoformat()

                # Handle different event types
                if event_type == "order_shipped":
                    shipments = order_data.get("shipments", [])
                    if shipments:
                        tracking_number = shipments[0].get("tracking_number")
                        tracking_url = shipments[0].get("tracking_url")

                        if tracking_number:
                            db[f"printful:{customer_email}:tracking"] = tracking_number
                            db[f"printful:{customer_email}:tracking_url"] = tracking_url
                            db[f"tshirt:{customer_email}:status"] = "shipped"

                            # Notify customer
                            customer_name = db.get(f"customer:{customer_email}:name", "Member")
                            notification = ask_groq_ai(
                                f"Great news! {customer_name}'s WillpowerFitness AI t-shirt has shipped! Tracking: {tracking_number}. Send them an excited message about their merch being on the way and ask about their fitness progress.",
                                customer_email                            )

                            print(f"🚚 T-shirt shipped to {customer_name}: {tracking_number}")

                elif event_type == "order_fulfilled":
                    db[f"tshirt:{customer_email}:status"] = "fulfilled"

                    # Send fulfillment notification
                    customer_name = db.get(f"customer:{customer_email}:name", "Member")
                    notification = ask_groq_ai(
                        f"{customer_name}'s WillpowerFitness AI t-shirt has been fulfilled and is ready to ship! Let them know their awesome merch is on the way.",
                        customer_email
                    )

                elif event_type == "order_failed":
                    db[f"tshirt:{customer_email}:status"] = "failed"
                    error_message = order_data.get("error", "Unknown error")
                    db[f"printful:{customer_email}:error"] = error_message

                    print(f"❌ Printful order failed for {customer_email}: {error_message}")

        return jsonify({"status": "received"}), 200

    except Exception as e:
        print(f"Printful webhook error: {e}")
        return jsonify({"error": "Webhook processing failed"}), 500

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

@app.route("/api/progress", methods=["POST"])
def log_progress():
    """Log user progress - workouts, measurements, photos"""
    try:
        data = request.get_json()
        user_id = data.get("user_id")
        progress_type = data.get("type")  # workout, measurement, photo
        progress_data = data.get("data")

        timestamp = datetime.utcnow().isoformat()
        progress_key = f"progress:{user_id}:{timestamp}"

        db[progress_key] = {
            "type": progress_type,
            "data": progress_data,
            "timestamp": timestamp
        }

        return jsonify({"success": True, "message": "Progress logged successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/tshirt-orders", methods=["GET"])
def get_tshirt_orders():
    """Get all t-shirt fulfillment orders with Printful status"""
    orders = []

    for key, value in db.items():
        if key.startswith("tshirt:") and key.endswith(":status"):
            email = key.split(":")[1]

            # Get Printful order info
            printful_order_id = db.get(f"printful:{email}:order_id")
            printful_status = db.get(f"printful:{email}:status")
            tracking_number = db.get(f"printful:{email}:tracking")

            order = {
                "email": email,
                "name": db.get(f"customer:{email}:name", "Unknown"),
                "size": db.get(f"tshirt:{email}:size"),
                "address": db.get(f"tshirt:{email}:address"),
                "order_date": db.get(f"tshirt:{email}:order_date"),
                "status": value,
                "printful_order_id": printful_order_id,
                "printful_status": printful_status,
                "tracking_number": tracking_number
            }
            orders.append(order)

    return jsonify({
        "orders": orders,
        "total_orders": len(orders),
        "pending_orders": [o for o in orders if o["status"] == "pending_fulfillment"],
        "shipped_orders": [o for o in orders if o["status"] == "shipped"]
    })

@app.route("/api/tshirt-orders/<email>/ship", methods=["POST"])
def mark_tshirt_shipped(email):
    """Mark t-shirt as shipped (manual override)"""
    data = request.get_json()
    tracking_number = data.get("tracking_number", "")

    db[f"tshirt:{email}:status"] = "shipped"
    db[f"tshirt:{email}:tracking"] = tracking_number
    db[f"tshirt:{email}:ship_date"] = datetime.utcnow().isoformat()

    # Send notification to customer
    customer_name = db.get(f"customer:{email}:name", "Member")
    notification_message = ask_groq_ai(
        f"Great news! {customer_name}'s FREE WillpowerFitness AI t-shirt has shipped! Tracking: {tracking_number}. Send them an excited message about their merch arriving soon and ask how their fitness journey is going.",
        email
    )

    return jsonify({
        "success": True,
        "message": f"T-shirt marked as shipped for {email}",
        "notification_sent": notification_message
    })

@app.route("/api/printful-orders/<email>/status", methods=["GET"])
def get_printful_order_status_endpoint(email):
    """Get Printful order status for a customer"""
    try:
        status_info = get_printful_order_status(email)

        if status_info:
            return jsonify({
                "success": True,
                "printful_status": status_info,
                "local_status": {
                    "tshirt_status": db.get(f"tshirt:{email}:status"),
                    "printful_order_id": db.get(f"printful:{email}:order_id"),
                    "tracking": db.get(f"printful:{email}:tracking")
                }
            })
        else:
            return jsonify({
                "success": False,
                "message": "No Printful order found for this customer"
            }), 404

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route("/api/printful-products", methods=["GET"])
def get_printful_products():
    """Get available Printful products for testing"""
    if not PRINTFUL_API_KEY:
        return jsonify({"error": "PRINTFUL_API_KEY not configured"}), 400

    try:
        # Get all products
        response = requests.get(
            "https://api.printful.com/products",
            headers={"Authorization": f"Bearer {PRINTFUL_API_KEY}"}
        )

        if response.status_code == 200:
            products = response.json().get("result", [])

            # Filter for t-shirts
            tshirts = [p for p in products if 'shirt' in p.get('type_name', '').lower()]

            return jsonify({
                "success": True,
                "total_products": len(products),
                "tshirt_products": tshirts[:10],  # Show first 10 t-shirt products
                "recommended_product": {
                    "name": "Bella + Canvas 3001 Unisex Short Sleeve Jersey T-Shirt",
                    "id": 71,
                    "variants": {
                        "S": 4011,
                        "M": 4012,
                        "L": 4013,
                        "XL": 4014,
                        "XXL": 4015
                    }
                }
            })
        else:
            return jsonify({
                "success": False,
                "error": f"Printful API error: {response.status_code}"
            }), 400

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route("/api/printful-test", methods=["POST"])
def test_printful_integration():
    """Test Printful integration with detailed diagnostics"""
    if not PRINTFUL_API_KEY:
        return jsonify({
            "success": False,
            "error": "PRINTFUL_API_KEY not configured in Secrets",
            "fix": "Add your Printful API token to Replit Secrets with key 'PRINTFUL_API_KEY'",
            "instructions": [
                "1. Go to Secrets tab in Replit",
                "2. Add key: PRINTFUL_API_KEY", 
                "3. Add your Printful API token as the value",
                "4. Restart your Repl"
            ]
        }), 400

    try:
        print(f"🔍 Testing Printful API with token: {PRINTFUL_API_KEY[:10]}***")

        # Test basic API connection first
        test_response = requests.get(
            "https://api.printful.com",
            timeout=10
        )
        print(f"🌐 Basic connectivity test: {test_response.status_code}")

        # Test API authentication
        auth_response = requests.get(
            "https://api.printful.com/stores",
            headers={"Authorization": f"Bearer {PRINTFUL_API_KEY}"},
            timeout=15
        )

        print(f"📡 Printful API Response: {auth_response.status_code}")
        print(f"📝 Response headers: {dict(auth_response.headers)}")

        if auth_response.status_code == 200:
            result_data = auth_response.json()
            stores = result_data.get("result", [])

            # Test products endpoint too
            products_response = requests.get(
                "https://api.printful.com/products?limit=5",
                headers={"Authorization": f"Bearer {PRINTFUL_API_KEY}"},
                timeout=15
            )

            products_working = products_response.status_code == 200

            return jsonify({
                "success": True,
                "message": "✅ Printful API connection successful!",
                "stores": stores,
                "store_count": len(stores),
                "api_key_status": "Valid and working",
                "products_api_working": products_working,
                "integration_status": "Ready for t-shirt fulfillment",
                "printful_response": result_data,
                "next_steps": [
                    "1. Test creating a sample order",
                    "2. Orders will auto-create when customers pay $225/month",
                    "3. Webhook notifications will track order progress"
                ]
            })
        elif auth_response.status_code == 401:
            return jsonify({
                "success": False,
                "error": "❌ Invalid or expired API token",
                "fix": "Check your Printful API token in Secrets - it may be incorrect or expired",
                "response_code": auth_response.status_code,
                "response_text": auth_response.text[:200],
                "troubleshooting": [
                    "1. Log into your Printful account",
                    "2. Go to Settings > API",
                    "3. Generate a new API token",
                    "4. Update your Replit Secrets"
                ]
            }), 401
        elif auth_response.status_code == 403:
            return jsonify({
                "success": False,
                "error": "❌ API token doesn't have required permissions",
                "fix": "Your API token needs store access permissions",
                "response_code": auth_response.status_code,
                "response_text": auth_response.text[:200]
            }), 403
        else:
            return jsonify({
                "success": False,
                "error": f"❌ Printful API error: {auth_response.status_code}",
                "response_text": auth_response.text[:300],
                "troubleshooting": [
                    "1. Verify API token has correct permissions",
                    "2. Check if store is properly configured", 
                    "3. Ensure token hasn't expired",
                    "4. Try generating a new token"
                ]
            }), 400

    except requests.exceptions.Timeout:
        return jsonify({
            "success": False,
            "error": "❌ Connection timeout",
            "fix": "Printful API is slow to respond. Try again in a moment.",
            "type": "timeout_error"
        }), 500
    except requests.exceptions.ConnectionError:
        return jsonify({
            "success": False,
            "error": "❌ Cannot connect to Printful API",
            "fix": "Check your internet connection or try again later",
            "type": "connection_error"
        }), 500
    except Exception as e:
        print(f"❌ Exception during Printful test: {e}")
        return jsonify({
            "success": False,
            "error": f"Unexpected error: {str(e)}",
            "type": "unexpected_error",
            "fix": "Try refreshing the page and testing again"
        }), 500

@app.route("/api/test-order", methods=["POST"])
def test_create_order():
    """Test creating a Printful order with sample data"""
    if not PRINTFUL_API_KEY:
        return jsonify({"error": "PRINTFUL_API_KEY not configured"}), 400

    try:
        data = request.get_json()
        test_email = data.get("email", "test@willpowerfitness.com")
        test_name = data.get("name", "Test Customer")
        test_size = data.get("size", "M")
        test_address = data.get("address", "123 Fitness Street\nLos Angeles, CA 90210")

        print(f"🧪 Testing Printful order creation...")
        print(f"📧 Email: {test_email}")
        print(f"👤 Name: {test_name}")
        print(f"👕 Size: {test_size}")
        print(f"📍 Address: {test_address}")

        # Create test order in Printful
        printful_order_id = create_printful_order(
            test_email, 
            test_size, 
            test_address, 
            test_name
        )

        if printful_order_id:
            # Get order status
            status_info = get_printful_order_status(test_email)

            return jsonify({
                "success": True,
                "message": f"✅ Test order created successfully!",
                "printful_order_id": printful_order_id,
                "order_status": status_info,
                "test_data": {
                    "email": test_email,
                    "name": test_name,
                    "size": test_size,
                    "address": test_address
                },
                "next_step": "Check your Printful dashboard to see the draft order"
            })
        else:
            error_msg = db.get(f"printful:{test_email}:error", "Unknown error")
            return jsonify({
                "success": False,
                "message": "❌ Test order creation failed",
                "error": error_msg,
                "troubleshooting": [
                    "1. Check if PRINTFUL_API_KEY is correct",
                    "2. Verify you have a store set up in Printful",
                    "3. Check if the API token has proper permissions"
                ]
            }), 400

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route("/api/meal-plan", methods=["POST"])
def generate_meal_plan():
    """Generate personalized meal plan"""
    try:
        data = request.get_json()
        user_id = data.get("user_id")

        user_context = get_user_context(user_id)
        name = user_context['name']
        goal = user_context['goal']

        meal_plan_prompt = f"""
        Create a detailed 7-day meal plan for {name} whose goal is {goal}.
        Include:
        - Breakfast, lunch, dinner, and 2 snacks per day
        - Exact portions and calories
        - Grocery shopping list
        - Meal prep instructions
        - Macro breakdown (protein, carbs, fats)

        Make it practical and achievable for someone working toward {goal}.
        """

        meal_plan = ask_groq_ai(meal_plan_prompt, user_id)

        # Save meal plan
        db[f"meal_plan:{user_id}:current"] = {
            "plan": meal_plan,
            "created": datetime.utcnow().isoformat()
        }

        return jsonify({"meal_plan": meal_plan, "success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/workout-plan", methods=["POST"])
def generate_custom_workout():
    """Generate custom workout for today"""
    try:
        data = request.get_json()
        user_id = data.get("user_id")
        workout_type = data.get("type", "full_body")
        duration = data.get("duration", 45)

        user_context = get_user_context(user_id)
        name = user_context['name']
        goal = user_context['goal']

        workout_prompt = f"""
        Create a {duration}-minute {workout_type} workout for {name} whose goal is {goal}.
        Include:
        - Proper warm-up (5-10 minutes)
        - Main workout with specific exercises, sets, reps, and rest periods
        - Cool-down and stretching
        - Form cues and safety tips
        - Progression notes for next time

        Make it challenging but achievable for their current level.
        """

        workout = ask_groq_ai(workout_prompt, user_id)

        # Save today's workout
        today = datetime.utcnow().strftime("%Y-%m-%d")
        db[f"workout:{user_id}:{today}"] = {
            "workout": workout,
            "type": workout_type,
            "duration": duration,
            "created": datetime.utcnow().isoformat()
        }

        return jsonify({"workout": workout, "success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

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
        "active_customers": len(customers),
        "status": "Basic API working!",
        "timestamp": datetime.utcnow().isoformat()
    })



@app.route("/api/upload", methods=["POST"])
def upload_file():
    """Handle file uploads (progress photos, documents, etc.)"""
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400

        file = request.files['file']
        user_id = request.form.get('user_id', 'default')
        file_type = request.form.get('type', 'general')
        description = request.form.get('description', '')

        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400

        # Validate file type and size
        allowed_extensions = {
            'progress_photo': ['jpg', 'jpeg', 'png', 'gif', 'webp'],
            'document': ['pdf', 'doc', 'docx', 'txt'],
            'workout_video': ['mp4', 'mov', 'avi', 'webm'],
            'meal_plan': ['pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png'],
            'general': ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx', 'txt', 'mp4', 'mov']
        }

        file_ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
        if file_type in allowed_extensions and file_ext not in allowed_extensions[file_type]:
            return jsonify({"error": f"File type .{file_ext} not allowed for {file_type}"}), 400

        # Check file size (10MB limit)
        file_content = file.read()
        if len(file_content) > 10 * 1024 * 1024:  # 10MB
            return jsonify({"error": "File too large. Maximum size is 10MB"}), 400

        # Save file to attached_assets directory
        import os
        upload_dir = os.path.join('attached_assets', 'uploads', user_id)
        os.makedirs(upload_dir, exist_ok=True)

        # Create unique filename
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        safe_filename = f"{timestamp}_{file.filename}"
        file_path = os.path.join(upload_dir, safe_filename)

        # Write file to disk
        with open(file_path, 'wb') as f:
            f.write(file_content)

        # Save file metadata to database
        file_id = f"file_{user_id}_{timestamp}"
        db[f"file:{file_id}"] = {
            "id": file_id,
            "filename": file.filename,
            "safe_filename": safe_filename,
            "path": file_path,
            "type": file_type,
            "user_id": user_id,
            "description": description,
            "size": len(file_content),
            "timestamp": datetime.utcnow().isoformat(),
            "extension": file_ext,
            "upload_url": f"/api/download/{file_id}"
        }

        # Add to user's file list
        user_files_key = f"user_files:{user_id}"
        if user_files_key not in db:
            db[user_files_key] = []
        db[user_files_key].append(file_id)

        # Generate AI response about the upload
        user_name = db.get(f"user:{user_id}:name", "Friend")
        ai_response = ""

        if file_type == 'progress_photo':
            ai_response = ask_groq_ai(
                f"{user_name} just uploaded a progress photo! Celebrate their commitment to tracking their fitness journey and ask them about what progress they're seeing.",
                user_id
            )
        elif file_type == 'workout_video':
            ai_response = ask_groq_ai(
                f"{user_name} uploaded a workout video! That's awesome - ask them about their workout and give them encouragement.",
                user_id
            )

        return jsonify({
            "success": True,
            "file_id": file_id,
            "filename": file.filename,
            "file_type": file_type,
            "size": len(file_content),
            "download_url": f"/api/download/{file_id}",
            "ai_response": ai_response,
            "message": f"File '{file.filename}' uploaded successfully!"
        })

    except Exception as e:
        print(f"Upload error: {e}")
        return jsonify({"error": f"Upload failed: {str(e)}"}), 500

@app.route("/api/download/<file_id>", methods=["GET"])
def download_file(file_id):
    """Download a specific file by ID"""
    try:
        file_info = db.get(f"file:{file_id}")
        if not file_info:
            return jsonify({"error": "File not found"}), 404

        file_path = file_info['path']
        if not os.path.exists(file_path):
            return jsonify({"error": "File not found on disk"}), 404

        from flask import send_file
        return send_file(
            file_path,
            as_attachment=True,
            download_name=file_info['filename']
        )

    except Exception as e:
        print(f"Download error: {e}")
        return jsonify({"error": "Download failed"}), 500

@app.route("/api/files/<user_id>", methods=["GET"])
def get_user_files(user_id):
    """Get all files uploaded by a user"""
    try:
        user_files_key = f"user_files:{user_id}"
        file_ids = db.get(user_files_key, [])

        files = []
        for file_id in file_ids:
            file_info = db.get(f"file:{file_id}")
            if file_info:
                files.append(file_info)

        # Sort by timestamp (newest first)
        files.sort(key=lambda x: x['timestamp'], reverse=True)

        # Group by type
        files_by_type = {
            'progress_photo': [f for f in files if f['type'] == 'progress_photo'],
            'workout_video': [f for f in files if f['type'] == 'workout_video'],
            'meal_plan': [f for f in files if f['type'] == 'meal_plan'],
            'document': [f for f in files if f['type'] == 'document'],
            'general': [f for f in files if f['type'] == 'general']
        }

        return jsonify({
            "files": files,
            "files_by_type": files_by_type,
            "total_files": len(files),
            "total_size": sum(f['size'] for f in files)
        })

    except Exception as e:
        print(f"Get files error: {e}")
        return jsonify({"error": "Failed to get files"}), 500

@app.route("/api/downloads/<user_id>", methods=["GET"])
def get_user_downloads(user_id):
    """Get downloadable files for a user (workout plans, progress reports)"""
    try:
        # Get user uploaded files
        user_files_response = get_user_files(user_id)
        user_files_data = user_files_response.get_json() if hasattr(user_files_response, 'get_json') else {"files": []}

        # Generate personalized workout plan
        user_name = db.get(f"user:{user_id}:name", "Friend")
        user_goal = db.get(f"user:{user_id}:goal", "fitness goals")

        generated_downloads = [
            {
                "id": "workout_plan",
                "title": f"{user_name}'s Personalized Workout Plan",
                "description": f"Custom workout plan for {user_goal}",
                "type": "generated",
                "size": "2.1 MB",
                "created": datetime.utcnow().isoformat(),
                "download_url": f"/api/generate-workout-plan/{user_id}"
            },
            {
                "id": "nutrition_guide",
                "title": "Nutrition Guidelines",
                "description": "Complete nutrition guide with meal suggestions",
                "type": "generated",
                "size": "1.8 MB",
                "created": datetime.utcnow().isoformat(),
                "download_url": f"/api/generate-nutrition-guide/{user_id}"
            },
            {
                "id": "progress_tracker",
                "title": "Progress Tracking Sheet",
                "description": "Track your workouts and measurements",
                "type": "generated",
                "size": "0.5 MB",
                "created": datetime.utcnow().isoformat(),
                "download_url": f"/api/generate-progress-tracker/{user_id}"
            }
        ]

        return jsonify({
            "uploaded_files": user_files_data.get("files", []),
            "generated_downloads": generated_downloads,
            "total_uploads": len(user_files_data.get("files", [])),
            "files_by_type": user_files_data.get("files_by_type", {})
        })

    except Exception as e:
        print(f"Downloads error: {e}")
        return jsonify({"error": "Failed to get downloads"}), 500

@app.route("/api/delete-file/<file_id>", methods=["DELETE"])
def delete_file(file_id):
    """Delete a user's uploaded file"""
    try:
        file_info = db.get(f"file:{file_id}")
        if not file_info:
            return jsonify({"error": "File not found"}), 404

        user_id = file_info['user_id']

        # Delete physical file
        file_path = file_info['path']
        if os.path.exists(file_path):
            os.remove(file_path)

        # Remove from database
        del db[f"file:{file_id}"]

        # Remove from user's file list
        user_files_key = f"user_files:{user_id}"
        if user_files_key in db and file_id in db[user_files_key]:
            db[user_files_key].remove(file_id)

        return jsonify({
            "success": True,
            "message": f"File '{file_info['filename']}' deleted successfully"
        })

    except Exception as e:
        print(f"Delete file error: {e}")
        return jsonify({"error": "Failed to delete file"}), 500

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

        Format it as a comprehensive document with clear sections and headers.
        """

        workout_plan = ask_groq_ai(plan_prompt, user_id)

        # Create text file content
        content = f"""
WILLPOWERFITNESS AI - PERSONALIZED WORKOUT PLAN
Generated for: {user_name}
Goal: {user_goal}
Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}

{workout_plan}

---
For questions or modifications, chat with Will Power AI at:
https://trainerai-groqapp-willpowerfitness.replit.app/
        """

        from flask import Response
        return Response(
            content,
            mimetype='text/plain',
            headers={'Content-Disposition': f'attachment; filename="{user_name}_workout_plan.txt"'}
        )

    except Exception as e:
        print(f"Workout plan generation error: {e}")
        return jsonify({"error": "Failed to generate workout plan"}), 500

@app.route("/api/generate-nutrition-guide/<user_id>", methods=["GET"])
def generate_nutrition_guide(user_id):
    """Generate personalized nutrition guide"""
    try:
        user_name = db.get(f"user:{user_id}:name", "Friend")
        user_goal = db.get(f"user:{user_id}:goal", "fitness goals")

        nutrition_prompt = f"""
        Create a comprehensive nutrition guide for {user_name} whose goal is {user_goal}.
        Include:
        - Daily calorie targets
        - Macro breakdown (protein, carbs, fats)
        - Meal timing recommendations
        - Sample meal ideas for each meal
        - Hydration guidelines
        - Supplement recommendations
        - Foods to focus on vs avoid

        Make it practical and easy to follow.
        """

        nutrition_guide = ask_groq_ai(nutrition_prompt, user_id)

        content = f"""
WILLPOWERFITNESS AI - NUTRITION GUIDE
Generated for: {user_name}
Goal: {user_goal}
Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}

{nutrition_guide}

---
For questions or meal plan updates, chat with Will Power AI at:
https://trainerai-groqapp-willpowerfitness.replit.app/
        """

        from flask import Response
        return Response(
            content,
            mimetype='text/plain',
            headers={'Content-Disposition': f'attachment; filename="{user_name}_nutrition_guide.txt"'}
        )

    except Exception as e:
        print(f"Nutrition guide generation error: {e}")
        return jsonify({"error": "Failed to generate nutrition guide"}), 500

@app.route("/api/generate-progress-tracker/<user_id>", methods=["GET"])
def generate_progress_tracker(user_id):
    """Generate progress tracking template"""
    try:
        user_name = db.get(f"user:{user_id}:name", "Friend")
        user_goal = db.get(f"user:{user_id}:goal", "fitness goals")

        tracker_content = f"""
WILLPOWERFITNESS AI - PROGRESS TRACKER
Name: {user_name}
Goal: {user_goal}
Start Date: {datetime.utcnow().strftime('%Y-%m-%d')}

WEEKLY PROGRESS LOG
==================

Week 1:
Date: ___________
Weight: ___________
Body Fat %: ___________
Measurements:
- Chest: ___________
- Waist: ___________
- Hips: ___________
- Arms: ___________
- Thighs: ___________

Workouts Completed: _____ / 4
Energy Level (1-10): _____
Sleep Quality (1-10): _____
Notes: _________________________________

Week 2:
Date: ___________
Weight: ___________
Body Fat %: ___________
Measurements:
- Chest: ___________
- Waist: ___________
- Hips: ___________
- Arms: ___________
- Thighs: ___________

Workouts Completed: _____ / 4
Energy Level (1-10): _____
Sleep Quality (1-10): _____
Notes: _________________________________

[Continue for 12 weeks...]

MONTHLY GOALS
=============
Month 1: _________________________________
Month 2: _________________________________
Month 3: _________________________________

PROGRESS PHOTOS
===============
Take photos from front, side, and back views on the same day each week.
Upload to Will Power AI for analysis and encouragement!

For detailed analysis and coaching, chat with Will Power AI at:
https://trainerai-groqapp-willpowerfitness.replit.app/
        """

        from flask import Response
        return Response(
            tracker_content,
            mimetype='text/plain',
            headers={'Content-Disposition': f'attachment; filename="{user_name}_progress_tracker.txt"'}
        )

    except Exception as e:
        print(f"Progress tracker generation error: {e}")
        return jsonify({"error": "Failed to generate progress tracker"}), 500

# Additional missing endpoints for test page functionality
@app.route("/api/files", methods=["GET"])
def get_files():
    """Get user files"""
    return jsonify({
        "files": [],
        "message": "File management coming soon!"
    })

@app.route("/api/videos", methods=["GET"])  
def get_videos():
    """Get workout videos"""
    return jsonify({
        "videos": [],
        "message": "Video library coming soon! Will Power is creating amazing workout content for you.",
        "status": "coming_soon"
    })

@app.route("/api/status", methods=["GET"])
def get_status():
    """Get system status"""
    return jsonify({
        "status": "online",
        "server": "Flask",
        "version": "1.0",
        "message": "WillpowerFitness AI is running!"
    })

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)