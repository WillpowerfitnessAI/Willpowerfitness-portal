
import os
import requests
from flask import Flask, request, jsonify

app = Flask(__name__)

# Set environment variable for your Groq API key
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
MODEL = "llama3-70b-8192"
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

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
