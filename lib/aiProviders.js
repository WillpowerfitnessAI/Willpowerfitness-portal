
import Groq from 'groq-sdk';

// Groq for fast chat interactions
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// OpenAI for complex reasoning (using fetch since we're in Node.js)
class OpenAIProvider {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.baseURL = 'https://api.openai.com/v1';
  }

  async createCompletion(messages, options = {}) {
    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: options.model || 'gpt-4',
        messages,
        max_tokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.7,
        ...options
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    return await response.json();
  }
}

const openai = new OpenAIProvider();

// Fast chat responses using Groq
export async function getChatResponse(messages, userContext = {}) {
  try {
    const systemPrompt = {
      role: "system",
      content: `You are ${userContext.profile?.name || 'your client'}'s expert AI personal trainer and fitness coach. You have elite-level knowledge and provide practical, actionable fitness advice.

CORE PRINCIPLES:
🏋️ EXPERT KNOWLEDGE: You understand exercise physiology, biomechanics, injury prevention, and safe training progressions
💪 PRACTICAL SOLUTIONS: You give specific, actionable advice for real fitness problems and questions
🎯 PERSONALIZED GUIDANCE: You tailor responses to the user's specific situation and fitness level
🤝 SUPPORTIVE COACH: You're encouraging but realistic about safety and proper form

RESPONSE GUIDELINES:
- ALWAYS address the user's specific question or concern directly
- Provide practical, actionable fitness advice
- If they mention pain or injury, prioritize safety and suggest modifications
- Give specific exercise recommendations when appropriate
- Be encouraging but emphasize proper form and safety
- Don't give generic sales pitches - focus on their actual fitness needs

USER CONTEXT: ${JSON.stringify(userContext)}

When users ask specific fitness questions, give them expert coaching advice that directly addresses their concern. Be their knowledgeable, supportive trainer who helps them achieve their goals safely.`
    };

    const completion = await groq.chat.completions.create({
      messages: [systemPrompt, ...messages],
      model: "llama3-70b-8192", // Fast model for chat
      max_tokens: 300,
      temperature: 0.7,
      stream: false,
    });

    return completion.choices[0]?.message?.content || "I'm here to help with your fitness journey!";
  } catch (error) {
    console.error('Groq chat error:', error);
    throw new Error('Failed to get chat response');
  }
}

// Complex reasoning using OpenAI
export async function generateWorkoutPlan(userProfile, goals, preferences) {
  try {
    const messages = [
      {
        role: "system",
        content: "You are an expert personal trainer creating detailed, personalized workout plans. Analyze the user's profile, goals, and preferences to create a comprehensive fitness program."
      },
      {
        role: "user",
        content: `Create a detailed workout plan for:
        Profile: ${JSON.stringify(userProfile)}
        Goals: ${JSON.stringify(goals)}
        Preferences: ${JSON.stringify(preferences)}
        
        Include: weekly schedule, exercise descriptions, sets/reps, progression plan, and safety considerations.`
      }
    ];

    const completion = await openai.createCompletion(messages, {
      model: 'gpt-4',
      maxTokens: 2000,
      temperature: 0.3 // Lower temperature for more consistent plans
    });

    return completion.choices[0]?.message?.content;
  } catch (error) {
    console.error('OpenAI workout plan error:', error);
    throw new Error('Failed to generate workout plan');
  }
}

// Nutrition analysis using OpenAI
export async function analyzeNutrition(foodLog, userGoals) {
  try {
    const messages = [
      {
        role: "system",
        content: "You are a certified nutritionist providing detailed dietary analysis and recommendations."
      },
      {
        role: "user",
        content: `Analyze this food log and provide recommendations:
        Food Log: ${JSON.stringify(foodLog)}
        User Goals: ${JSON.stringify(userGoals)}
        
        Include: calorie breakdown, macro analysis, nutritional gaps, and specific recommendations.`
      }
    ];

    const completion = await openai.createCompletion(messages, {
      model: 'gpt-4',
      maxTokens: 1500,
      temperature: 0.4
    });

    return completion.choices[0]?.message?.content;
  } catch (error) {
    console.error('OpenAI nutrition analysis error:', error);
    throw new Error('Failed to analyze nutrition');
  }
}

// Progress analysis using OpenAI
export async function analyzeProgress(userHistory, currentMetrics) {
  try {
    const messages = [
      {
        role: "system",
        content: "You are a data-driven fitness coach analyzing user progress and providing insights."
      },
      {
        role: "user",
        content: `Analyze this user's fitness progress:
        History: ${JSON.stringify(userHistory)}
        Current Metrics: ${JSON.stringify(currentMetrics)}
        
        Provide insights on progress, trends, achievements, and areas for improvement.`
      }
    ];

    const completion = await openai.createCompletion(messages, {
      model: 'gpt-4',
      maxTokens: 1200,
      temperature: 0.3
    });

    return completion.choices[0]?.message?.content;
  } catch (error) {
    console.error('OpenAI progress analysis error:', error);
    throw new Error('Failed to analyze progress');
  }
}
