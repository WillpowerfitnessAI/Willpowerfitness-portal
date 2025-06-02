
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

@app.route("/webhook", methods=["POST"])
def webhook():
    data = request.get_json()
    prompt = data.get("prompt", "")
    reply = ask_agent(prompt)
    return jsonify({"response": reply})

# For terminal use:
if __name__ == "__main__":
    print("💬 Ask Will Power anything:")
    while True:
        user_input = input(">> ")
        if user_input.lower() in ["exit", "quit"]:
            print("👋 Stay strong. Will Power out.")
            break
        response = ask_agent(user_input)
        print(f"💪 Will Power: {response}\n")

    # Start Flask server for external webhook use (Zapier)
    app.run(host="0.0.0.0", port=5000)
