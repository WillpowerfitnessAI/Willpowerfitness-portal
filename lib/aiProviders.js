
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
      content: `You are an elite AI fitness coach providing premium, high-value training and nutrition guidance worth $225/month. Your expertise includes:

- Advanced exercise physiology and biomechanics
- Personalized periodization and program design  
- Comprehensive nutritional optimization
- Evidence-based training methodologies
- Injury prevention and mobility work

Provide detailed, professional responses that demonstrate advanced knowledge. Include specific recommendations, scientific backing when relevant, and actionable insights. Your tone should be authoritative yet approachable - like a world-class personal trainer.

User context: ${JSON.stringify(userContext)}

Always focus on delivering exceptional value that justifies premium pricing.`
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
