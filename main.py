import os
import logging
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from datetime import datetime

# Import our services
from config import Config, setup_logging
from database import Database
from services.ai_service import AIService
from services.payment_service import PaymentService
import stripe
from supabase import create_client, Client

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
CORS(app, origins=["*"])

# Initialize services
db = Database(Config.DATABASE_PATH)
ai_service = AIService(db)
payment_service = PaymentService(db)

# Environment variables
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL",
                         "https://jxylbuwtjvsdavetryjx.supabase.co")
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
            <style>
                body { 
                    margin: 0; 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh;
                }
                .buy-button {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: linear-gradient(45deg, #FF6B6B, #4ECDC4);
                    color: white;
                    border: none;
                    padding: 15px 25px;
                    border-radius: 50px;
                    font-size: 18px;
                    font-weight: bold;
                    cursor: pointer;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                    transition: all 0.3s ease;
                    z-index: 1000;
                    text-decoration: none;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .buy-button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(0,0,0,0.3);
                }
                .buy-button::before {
                    content: "💪";
                    font-size: 20px;
                }
                @media (max-width: 768px) {
                    .buy-button {
                        top: 10px;
                        right: 10px;
                        padding: 12px 20px;
                        font-size: 16px;
                    }
                }
            </style>
        </head>
        <body>
            <a href="https://buy.stripe.com/4gw8wVcGh0qkc4o7ss" class="buy-button" target="_blank">
                Join $225/month
            </a>
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
    try:
        if '/' in filename:
            directory_parts = filename.split('/')
            subdirectory = '/'.join(directory_parts[:-1])
            file_name = directory_parts[-1]
            full_path = os.path.join('attached_assets', subdirectory)
            return send_from_directory(full_path, file_name)
        else:
            return send_from_directory('attached_assets', filename)
    except FileNotFoundError:
        return "File not found", 404


@app.route("/static/<path:filename>")
def static_files(filename):
    """Serve static files"""
    try:
        if filename.endswith('.jsx'):
            return send_from_directory('.', filename)
        return send_from_directory('static', filename)
    except FileNotFoundError:
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

        reply_text = ai_service.generate_response(user_input, user_id)
        return jsonify({"reply": reply_text})

    except Exception as e:
        logger.error(f"Chat error: {e}")
        return jsonify({"error": "Server error occurred"}), 500


@app.route("/api/onboard", methods=["POST"])
def onboard():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data received"}), 400

        user_id = data.get("user_id", "default")
        name = data.get(
            "name",
            "client").strip().split()[0] if data.get("name") else "client"
        goal = data.get("goal", "your fitness goals")
        source = data.get("source", "website")
        email = data.get("email")

        # Create user in database
        db.create_user(user_id, name, goal, email, source)

        welcome_message = (
            f"Hey! {name}. Thanks for checking us out. Hopefully at the end of this consultation you will see the benefits of becoming a Willpowerfitness AI client. "
            f"I see your goals and have committed them to my memory: {goal}. "
            f"I need you to understand I'm here to keep you focused on the reward from the perseverance that comes from the Blood, Sweat, and Tears of seeing this through to a successful, Victorious finish. "
            f"So, now, tell me how can I assist you along this journey. What do you expect from me, so we can get started?"
        )

        return jsonify({"message": welcome_message}), 200

    except Exception as e:
        logger.error(f"Onboard error: {e}")
        return jsonify({"error": "Server error occurred"}), 500


@app.route("/api/stripe-webhook", methods=["POST"])
def stripe_webhook():
    """Handle Stripe webhook events"""
    try:
        payload = request.get_data()
        event = request.get_json()

        success = payment_service.process_stripe_webhook(event)

        if success:
            return jsonify({"status": "success"}), 200
        else:
            return jsonify({"status": "ignored"}), 200

    except Exception as e:
        logger.error(f"Stripe webhook error: {e}")
        return jsonify({"error": "Webhook processing failed"}), 500


@app.route("/api/lead-capture", methods=["POST"])
def lead_capture():
    """Handle lead capture form submissions"""
    try:
        data = request.get_json()

        customer_name = data.get("name", "Friend")
        customer_email = data.get("email")
        customer_phone = data.get("phone", "")
        goals = data.get("goals", "general fitness")
        experience = data.get("experience", "beginner")
        message = data.get("message", "")

        if not customer_email:
            return jsonify({"error": "Email is required"}), 400

        # Generate AI consultation response
        consultation_prompt = f"""
        A potential client named {customer_name} submitted a fitness consultation request:
        - Goals: {goals}
        - Experience: {experience}
        - Message: {message}

        Create a personalized, professional response that:
        1. Addresses their specific goals and experience level
        2. Explains how our AI coaching can help them
        3. Mentions our $225/month membership program
        4. Creates excitement about their fitness transformation

        Keep it encouraging, professional, and action-oriented.
        """

        ai_response = ai_service.generate_response(consultation_prompt,
                                                   customer_email)

        # Store lead in database
        db.create_lead(email=customer_email,
                       name=customer_name,
                       phone=customer_phone,
                       goals=goals,
                       experience=experience,
                       message=message,
                       source="website_form",
                       ai_response=ai_response)

        payment_link = payment_service.create_payment_link(
            customer_email, customer_name)

        return jsonify({
            "success": True,
            "message": "Lead captured successfully",
            "ai_response": ai_response,
            "payment_link": payment_link,
            "next_action": "email_consultation_sent"
        })

    except Exception as e:
        logger.error(f"Lead capture error: {e}")
        return jsonify({"error": "Server error occurred"}), 500


@app.route("/api/status", methods=["GET"])
def get_status():
    """Get system status"""
    return jsonify({
        "status":
        "online",
        "server":
        "Flask",
        "version":
        "2.0",
        "database":
        "SQLite",
        "message":
        "WillpowerFitness AI is running with professional architecture!"
    })


# Error handlers
@app.errorhandler(404)
def not_found_error(error):
    return jsonify({"error": "Not found"}), 404


@app.errorhandler(500)
def internal_error(error):
    logger.error(f"Internal server error: {error}")
    return jsonify({"error": "Internal server error"}), 500


if __name__ == "__main__":
    logger.info(f"Starting WillpowerFitness AI on {Config.HOST}:{Config.PORT}")
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=Config.DEBUG)
