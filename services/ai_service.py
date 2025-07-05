
import os
import requests
import logging
from datetime import datetime
from database import Database

logger = logging.getLogger(__name__)

class AIService:
    def __init__(self, db: Database):
        self.db = db
        self.groq_api_key = os.getenv("GROQ_API_KEY")
        
    def get_user_context(self, user_id):
        """Load user context from database"""
        user = self.db.get_user(user_id)
        if not user:
            return {
                'name': 'Friend',
                'goal': 'your fitness goals',
                'source': 'website',
                'history': []
            }
        
        messages = self.db.get_user_messages(user_id)
        return {
            'name': user['name'],
            'goal': user['goal'],
            'source': user['source'],
            'history': messages
        }
    
    def generate_response(self, user_input, user_id):
        """Generate AI response with conversation memory"""
        if not self.groq_api_key:
            return "Error: GROQ_API_KEY not configured"
        
        try:
            # Get user context
            context = self.get_user_context(user_id)
            
            # Save user message
            self.db.add_message(user_id, 'user', user_input)
            
            # Count conversation stage
            user_messages = [m for m in context['history'] if m['role'] == 'user']
            message_count = len(user_messages) + 1  # +1 for current message
            
            # Build conversation messages
            messages = self._build_conversation_messages(
                user_input, context, message_count
            )
            
            # Add knowledge context
            relevant_knowledge = self.db.search_knowledge(user_input)
            if relevant_knowledge:
                knowledge_context = self._format_knowledge(relevant_knowledge)
                messages[0]["content"] += f"\n\nRELEVANT KNOWLEDGE:\n{knowledge_context}"
            
            # Call Groq API
            response = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.groq_api_key}",
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
                logger.error(f"Groq API error: {response.status_code} - {response.text}")
                # Provide helpful fallback based on user input
                subscription_keywords = ['subscribe', 'sign up', 'join', 'purchase', 'buy', 'pay', 'membership', 'what do i do', 'next step', 'how do i', 'ready to']
                is_subscription_request = any(keyword in user_input.lower() for keyword in subscription_keywords)
                
                if is_subscription_request:
                    reply = f"Great {context['name']}! To become a Willpower Fitness member, simply click the BUY NOW button that says '$225/MONTH + FREE T-SHIRT' on this page. Once you complete your purchase, you'll have 24/7 access to me as your personal AI trainer!"
                else:
                    reply = "Sorry, I'm having trouble connecting right now. Please try again!"
            
            # Save AI response
            self.db.add_message(user_id, 'assistant', reply)
            
            return reply
            
        except Exception as e:
            logger.error(f"AI service error: {e}")
            return "Sorry, there was a problem generating a response. Please try again."
    
    def _build_conversation_messages(self, user_input, context, message_count):
        """Build messages array based on conversation stage"""
        name = context['name']
        goal = context['goal']
        
        # Check if user is asking about subscription/purchase
        subscription_keywords = ['subscribe', 'sign up', 'join', 'purchase', 'buy', 'pay', 'membership', 'what do i do', 'next step', 'how do i', 'ready to']
        is_subscription_request = any(keyword in user_input.lower() for keyword in subscription_keywords)
        
        if is_subscription_request:
            return [
                {"role": "system", "content": f"""You are Will Power from Willpower Fitness. {name} is ready to subscribe!

SUBSCRIPTION RESPONSE FORMAT:
"Great {name}! I'm excited to have you join the Willpower Fitness family. To become a member and get unlimited access to me 24/7, simply click the BUY NOW button that says '$225/MONTH + FREE T-SHIRT' - it's prominently displayed on this page.

Once you complete your purchase, you'll immediately have:
- 24/7 access to me for personalized coaching
- Complete workout programs and nutrition plans
- Progress tracking and conversation history
- Your free Willpower Fitness t-shirt shipped to you

Click that bright BUY NOW button to get started right away! I'll be here waiting for you as your personal AI trainer."

NO emojis, asterisks, or special formatting."""}, 
                {"role": "user", "content": user_input}
            ]
        
        if message_count == 1:
            # First response
            return [
                {"role": "system", "content": f"""You are Will Power from Willpower Fitness. This is your FIRST response to {name}.

FIRST RESPONSE FORMAT:
Respond naturally to what they said: '{user_input}'. 
Then transition to: "Your goal is {goal}. It's not just about exercises or a specific workout routine. It's about sustainable lifestyle changes you can stick to long term. I'm not here to give you a magic bullet or quick fix. I'm here to provide tools, guidance, and support to reach your goals.

Here are a few things I'd like you to focus on:
1. [General focus area 1]
2. [General focus area 2] 
3. [General focus area 3]
4. [General focus area 4]"

NO emojis, asterisks, or special formatting. Keep it professional."""}, 
                {"role": "user", "content": user_input}
            ]
        elif message_count == 2:
            # Second response - membership pitch
            return [
                {"role": "system", "content": f"""You are Will Power from Willpower Fitness. This is your SECOND response to {name}.

YOU MUST USE THIS EXACT FORMAT:

"{name} I hear you and understand. Once you are a Willpowerfitness AI client, you will have access to me 24 hours a day, 7 days a week, 365 and sometimes 366 days a year. I will track and keep all of our conversations and history and track your progress; but for now I would like you to focus on a few of the following:

1. [Focus area 1 for {goal}]
2. [Focus area 2 for {goal}]  
3. [Focus area 3 for {goal}]
4. [Focus area 4 for {goal}]

Remember, these are some examples, but if you like, and we are hoping you see the value in becoming a Willpowerfitness AI client. Access is key. Accountability is the price. Following-through opens the door."

MUST start with "{name} I hear you and understand" and end with "Access is key. Accountability is the price. Following-through opens the door."
NO emojis, asterisks, or special formatting."""}, 
                {"role": "user", "content": user_input}
            ]
        else:
            # Third response and beyond - sales protection
            messages = [
                {"role": "system", "content": f"""You are Will Power from Willpower Fitness. You're talking to {name} whose goal is {goal}.

CRITICAL SALES PROTECTION:
- NEVER provide complete workout routines, sets/reps, or detailed exercise programs
- NEVER provide meal plans, nutrition schedules, or detailed diet advice  
- NEVER give step-by-step training guidance or progressive programs
- ALWAYS redirect detailed requests to: "For complete workout programs, nutrition plans, and personalized coaching, you need Willpower Fitness membership at $225/month!"

Be encouraging but protective of valuable content. NO emojis, asterisks, or special formatting."""}
            ]
            
            # Add recent conversation history
            for msg in context['history'][-10:]:
                messages.append({"role": msg["role"], "content": msg["content"]})
            
            messages.append({"role": "user", "content": user_input})
            return messages
    
    def _format_knowledge(self, knowledge_items):
        """Format knowledge for context"""
        formatted = ""
        for item in knowledge_items[:3]:  # Limit to top 3
            formatted += f"Q: {item['question']}\nA: {item['answer']}\n\n"
        return formatted
