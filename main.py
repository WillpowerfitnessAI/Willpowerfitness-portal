import os
import requests
from flask import Flask, request, jsonify
from supabase import create_client, Client
from datetime import datetime

app = Flask(__name__)

# Set environment variable for your Groq API key
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
MODEL = "llama3-70b-8192"
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

# Supabase config
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://jxylbuwtjvsdavetryjx.supabase.co")
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

def save_message_to_supabase(user_id, sender, message, timestamp):
    try:
        supabase.table("messages").insert({
            "user_id": user_id,
            "sender": sender,
            "message": message,
            "timestamp": timestamp
        }).execute()
    except Exception as e:
        print(f"Error saving to Supabase: {e}")

@app.route("/", methods=["GET"])
def health_check():
    return "Trainer AI is live!", 200

@app.route("/webhook", methods=["POST"])
def webhook():
    data = request.get_json()
    user_id = data.get("user_id", "unknown")
    user_input = data.get("message", "Hello")

    ai_reply = ask_agent(user_input)

    # Save message with timestamp
    timestamp = datetime.utcnow().isoformat()
    save_message_to_supabase(user_id, "user", user_input, timestamp)
    save_message_to_supabase(user_id, "ai", ai_reply, timestamp)

    return jsonify({"reply": ai_reply})

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

