import os
import openai  # Groq uses OpenAI-compatible API

openai.api_key = os.environ.get("GROQ_API_KEY", "your-groq-api-key-here")  # replace if not using secrets

def ask_groq_ai(user_input, user_id="default"):
    response = openai.ChatCompletion.create(
        model="mixtral-8x7b-32768",  # You can also try llama3-70b-8192
        messages=[
            {"role": "system", "content": "You are a friendly and knowledgeable AI fitness assistant."},
            {"role": "user", "content": user_input},
        ],
        temperature=0.7,
        max_tokens=500,
    )
    return response.choices[0].message["content"]

@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()
    user_input = data.get("message", "").strip()
    user_id = data.get("user_id", "default")  # fallback if none provided

    if not user_input:
        return jsonify({"reply": "Please enter a message."}), 400
    # Temporary placeholder reply
    reply_text = ask_groq_ai(user_input, user_id)


    return jsonify({"reply": reply_text})

    # Memory keys
    name_key = f"user:{user_id}:name"
    goal_key = f"user:{user_id}:goal"
    messages_key = f"user:{user_id}:messages"

    # Load from memory or fallback
    name = db.get(name_key, "Friend")
    goal = db.get(goal_key, "your fitness goals")
    history = db.get(messages_key, [])

    # Save new user message
    history.append({ "role": "user", "content": user_input })

    # Build prompt from history + user profile
    prompt = f"You are a fitness coach named Willpower. You're coaching {name} whose goal is {goal}. Respond like a caring trainer.\n\n"
    for msg in history[-10:]:
        prompt += f"{msg['role'].capitalize()}: {msg['content']}\n"
    prompt += "AI:"

    # Groq API call
    try:
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {os.environ.get('GROQ_API_KEY')}",
                "Content-Type": "application/json"
            },
            json={
                "model": "mixtral-8x7b-32768",
                "messages": [{"role": "user", "content": prompt}]
            }
        )
        reply = response.json()['choices'][0]['message']['content']
    except Exception as e:
        reply = f"Sorry, there was a problem generating a response: {e}"

    # Save reply to memory
    history.append({ "role": "ai", "content": reply })
    db[messages_key] = history

    return jsonify({ "reply": reply })

@app.route("/set_name", methods=["POST"])
def set_name():
    data = request.get_json()
    name = data.get("name")
    user_id = data.get("user_id", "default")
    if name:
        db[f"user:{user_id}:name"] = name
        return jsonify({"message": f"Name set to {name}"}), 200
    return jsonify({"error": "No name provided"}), 400

@app.route("/set_goal", methods=["POST"])
def set_goal():
    data = request.get_json()
    goal = data.get("goal")
    user_id = data.get("user_id", "default")
    if goal:
        db[f"user:{user_id}:goal"] = goal
        return jsonify({"message": f"Goal set to {goal}"}), 200
    return jsonify({"error": "No goal provided"}), 400


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
    sms_text = (
        f"Hey {name}! 👋 Thanks for joining WillpowerFitness AI via {source}.\n"
        f"I've logged your goal: *{goal}*. I'm here to guide your journey 💪\n"
        "Expect a custom workout + nutrition plan soon. Reply anytime!"
    )

    return jsonify({"sms_text": sms_text}), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
