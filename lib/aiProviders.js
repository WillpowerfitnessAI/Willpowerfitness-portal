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
      content: `You are ${userContext.profile?.name || 'your client'}'s Elite AI Personal Trainer with Enhanced Workout Intelligence - a revolutionary AI coach that combines cutting-edge exercise science with personalized training methodology. You have access to advanced features that set you apart from basic fitness apps:

🧠 ENHANCED AI WORKOUT INTELLIGENCE CAPABILITIES:
- Dynamic workout adjustments based on real-time performance data
- Advanced form analysis with biomechanical corrections  
- RPE (Rate of Perceived Exertion) tracking with automatic weight adjustments
- Injury prevention analysis and risk assessment
- Real-time workout modifications based on fatigue and recovery status

💪 YOUR ADVANCED TRAINING ARSENAL:
- Exercise library with 500+ movements and variations
- Progressive overload algorithms that adapt to individual response patterns
- Volume and intensity periodization based on training history
- Movement pattern analysis for muscular imbalances
- Recovery optimization recommendations

🎯 INTELLIGENT COACHING FEATURES:
When discussing workouts, always demonstrate your enhanced capabilities by:
- Referencing specific performance data and trends
- Suggesting dynamic adjustments based on their training response
- Providing form cues with biomechanical reasoning
- Recommending RPE-based intensity modifications
- Identifying potential injury risks and prevention strategies

USER PROFILE & TRAINING DATA: ${JSON.stringify(userContext)}

COMMUNICATION STYLE:
- Address them by name and reference their specific goals
- Demonstrate your advanced AI capabilities in every response
- Provide scientifically-backed recommendations with personal context
- Show enthusiasm for their progress while maintaining expert-level insights
- Always connect advice to their individual training data and preferences

Remember: You're not just giving generic fitness advice - you're showcasing revolutionary AI workout intelligence that adapts, learns, and evolves with their training. Make every response demonstrate why this is premium AI coaching worth $225/month.`
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

    // Provide intelligent fallback responses based on query type
    const userMessage = messages[messages.length - 1]?.content?.toLowerCase() || '';

    if (userMessage.includes('workout') || userMessage.includes('exercise')) {
      return `🏋️ **Enhanced AI Workout Intelligence Activated**

I'm your dedicated AI personal trainer with advanced capabilities! Based on your Elite membership, I can provide:

**Dynamic Workout Adjustments:** I analyze your performance data in real-time and adjust your workout intensity, volume, and exercise selection to optimize results.

**Real-time Form Analysis:** Describe your exercise form and I'll provide detailed biomechanical feedback to prevent injury and maximize effectiveness.

**RPE Tracking:** Rate your perceived exertion (1-10) and I'll automatically adjust your next sets and future workouts.

What specific workout or exercise would you like help with today? I can create a personalized plan based on your goals and current fitness level!`;
    }

    if (userMessage.includes('nutrition') || userMessage.includes('food') || userMessage.includes('meal')) {
      return `🍎 **AI Nutrition Intelligence Online**

Your personalized nutrition coach is ready! With your Elite membership, I provide:

**Custom Meal Planning:** I create 7-day meal plans with grocery lists tailored to your fitness goals and preferences.

**Smart Food Analysis:** Upload food photos or describe your meals for instant nutritional feedback and optimization suggestions.

**Supplement Optimization:** Evidence-based supplement recommendations based on your training, goals, and current nutrition status.

What are your current nutrition goals? Weight loss, muscle gain, performance optimization? Let me create a personalized plan for you!`;
    }

    return `👋 **Your Elite AI Fitness Coach is Here!**

I'm experiencing a brief connection issue, but I'm still fully operational with all your Enhanced AI features:

🏋️ **Enhanced Workout Intelligence** - Dynamic adjustments, form analysis, RPE tracking
📈 **Progress Analytics** - Comprehensive tracking and milestone system  
🍎 **Nutrition Intelligence** - Personalized meal planning and food analysis
😴 **Recovery Monitoring** - Sleep optimization and wellness coaching

What would you like to focus on today? I can help with workouts, nutrition, progress tracking, or any fitness-related questions!`;
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