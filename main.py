
import os
import requests
from flask import Flask, request, jsonify

app = Flask(__name__)

# Set environment variable for your Groq API key
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
MODEL = "llama3-70b-8192"
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

def ask_agent(prompt):
  from supabase import create_client, Client

SUPABASE_URL = "https://jxylbuwtjvsdavetryjx.supabase.co"  # Replace this with your actual Supabase URL
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": "You are Will Power, a no-nonsense personal trainer who gives tough love, clear answers, and daily motivation to fitness clients."},
            {"role": "user", "content": prompt}
        ]
    }
    response = requests.post(GROQ_URL, headers=headers, json=payload)
    response.raise_for_status()
    return response.json()["choices"][0]["message"]["content"]

@app.route("/", methods=["GET"])
def health_check():
    return "Trainer AI is live!", 200

@app.route("/webhook", methods=["POST"])
def webhook():
    data = request.get_json()
    # Extract appointment-related info
    client_name = data.get("name", "Client")
    email = data.get("email", "")
    appt_type = data.get("appointment_type", "")
    appt_time = data.get("appointment_time", "")
    prompt_type = data.get("prompt_type", "welcome")

    # Build a custom AI prompt based on type
    if prompt_type == "motivation":
        prompt = f"Give a motivational message for a client named {client_name} who just booked a {appt_type} at {appt_time}."
    elif prompt_type == "recovery":
        prompt = f"What are the best recovery foods for someone who just finished a {appt_type} session?"
    else:
        prompt = f"Welcome {client_name}! Craft a personalized welcome message for their {appt_type} appointment on {appt_time}."

    # Ask the AI
    reply = ask_agent(prompt)

    # Return JSON response
    return jsonify({
        "status": "ok",
        "client": client_name,
        "response": reply
    })

@app.route("/onboard", methods=["POST"])
def onboard():
    data = request.get_json()
    name = data.get("name", "client").strip().split()[0] if data.get("name") else "client"
    goal = data.get("goal", "your fitness goals")
    source = data.get("source", "website")

    # Build welcome message
    sms_text = (
        f"Hey {name}! 👋 Thanks for joining WillpowerFitness AI via {source}.\n"
        f"I've logged your goal: *{goal}*. I'm here to guide your journey 💪\n"
        "Expect a custom workout + nutrition plan soon. Reply anytime!"
    )

    return jsonify({"sms_text": sms_text}), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)

import os
import requests
from flask import Flask, request, jsonify
from supabase import create_client, Client

app = Flask(__name__)

# Set environment variable for your Groq API key
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
MODEL = "llama3-70b-8192"
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

# Supabase config
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def ask_agent(prompt):
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": "You are Will Power, a no-nonsense personal trainer who gives tough love, clear answers, and daily motivation to fitness clients."},
            {"role": "user", "content": prompt}
        ]
    }
    response = requests.post(GROQ_URL, headers=headers, json=payload)
    if response.status_code == 200:
        return response.json()["choices"][0]["message"]["content"].strip()
    else:
        return "Sorry, something went wrong."

@app.route("/webhook", methods=["POST"])
def handle_message():
    data = request.json
    user_id = data.get("user_id")
    user_input = data.get("message")

    ai_reply = ask_agent(user_input)

   from datetime import datetime
timestamp = datetime.utcnow().isoformat()

# Save both user and AI messages to Supabase
save_message_to_supabase(user_id, "user", user_input, timestamp)
save_message_to_supabase(user_id, "ai", ai_reply, timestamp)

    return jsonify({"reply": ai_reply})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
