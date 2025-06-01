
import os
from groq import Groq

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def ask_agent(prompt):
    chat_completion = client.chat.completions.create(
        messages=[
            {
                "role": "system",
                "content": "You are Will Power, a no-nonsense personal trainer who gives tough love, clear answers, and daily motivation to fitness clients.",
            },
            {
                "role": "user",
                "content": prompt,
            }
        ],
        model="mixtral-8x7b-32768",
    )
    return chat_completion.choices[0].message.content

if __name__ == "__main__":
    print("💬 Ask Will Power anything:")
    while True:
        user_input = input(">> ")
        if user_input.lower() in ["exit", "quit"]:
            print("👋 Stay strong. Will Power out.")
            break
        response = ask_agent(user_input)
        print(f"🏋️ Will Power: {response}\n")
