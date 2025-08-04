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

// Fast chat responses using Groq with enhanced context handling
export async function getChatResponse(messages, userContext = {}) {
  try {
    // Use different system prompts based on context to prevent cutoffs
    let systemPrompt;
    
    // Check if this is explicitly a consultation or if we should use responsive chat mode
    const isConsultation = userContext.consultationMode === true && userContext.chatMode !== 'responsive_trainer';

    if (isConsultation) {
      // Consultation mode - limit to 3 interactions maximum
      systemPrompt = {
        role: "system",
        content: `You are WillpowerFitnessAI — an upscale, fully autonomous AI fitness and nutrition assistant. You are not a chatbot. You are a personal trainer, nutritionist, and motivational coach in one. Your tone is intelligent, supportive, and motivating — like a trusted expert who becomes a friend over time. You do not use emojis or cartoons.

Conduct a professional consultation limited to no more than 3 smart interactions. Collect: name, phone, email, age, workout history, injuries/medical history. Gently nudge the user to become a WillpowerFitnessAI member using professional, persuasive language.`
      };
    } else {
      // Main dashboard functions - structured button-driven experience
      if (!messages[0] || messages[0].role !== "system") {
        systemPrompt = {
          role: "system",
          content: `You are WillpowerFitnessAI — an upscale, fully autonomous AI fitness and nutrition assistant. You are not a chatbot. You are a personal trainer, nutritionist, and motivational coach in one. Your tone is intelligent, supportive, and motivating — like a trusted expert who becomes a friend over time. You do not use emojis or cartoons.

Provide seamless, premium experience. Always offer structured options:
• Get a Workout
• Get a Nutrition Plan or Advice  
• View Progress Report

Always provide a "Back" button after each selection. Allow specific workout requests. Enable logging sets, reps, RPE, and workout export/download.`
        };
      } else {
        systemPrompt = null;
      }
    }

    // Adjust token limits based on context
    const maxTokens = userContext.maxTokens || (isConsultation ? 800 : 400);
    const temperature = userContext.temperature || 0.7;

    const completion = await groq.chat.completions.create({
      messages: systemPrompt ? [systemPrompt, ...messages] : messages,
      model: "llama3-70b-8192",
      max_tokens: maxTokens,
      temperature: temperature,
      stream: false,
      stop: null, // Don't use stop sequences that might cut off responses
    });

    const response = completion.choices[0]?.message?.content;
    
    if (!response) {
      throw new Error('Empty response from AI');
    }

    // Log response length for debugging
    console.log(`AI Response length: ${response.length} characters`);
    
    return response;

  } catch (error) {
    console.error('Groq chat error:', error);

    // Enhanced fallback responses based on context
    const userMessage = messages[messages.length - 1]?.content?.toLowerCase() || '';
    const userName = userContext.name || userContext.profile?.name || 'there';

    if (userMessage.includes('schedule') || userMessage.includes('time') || userMessage.includes('workout')) {
      return `Hi ${userName}! I'd love to help you create the perfect workout schedule. 

Tell me about your weekly routine - what days work best for you to exercise? Are you more of a morning person or do you prefer evening workouts? 

Also, how much time can you realistically dedicate to each workout session? Whether it's 20 minutes or 2 hours, I can create something effective that fits your lifestyle.

Understanding your schedule is crucial for building a sustainable fitness plan that you'll actually stick to!`;
    }

    if (userMessage.includes('equipment') || userMessage.includes('gym') || userMessage.includes('home')) {
      return `Great question about equipment access, ${userName}!

Do you have access to a commercial gym with full equipment, or are you planning to work out at home? I can create effective programs for either situation.

If you're working out at home, what equipment do you have available? Even bodyweight exercises can be incredibly effective - I just want to tailor everything specifically to your setup.

Also, do you have any physical limitations, previous injuries, or health considerations I should know about when designing your program?`;
    }

    if (userMessage.includes('nutrition') || userMessage.includes('diet') || userMessage.includes('meal')) {
      return `Excellent question about nutrition, ${userName}! This is where we can really accelerate your results.

What does your current eating routine look like? Are you someone who likes to meal prep, or do you prefer more flexible approaches?

Also, do you have any dietary restrictions, food allergies, or preferences I should consider when creating your personalized nutrition plan?

Understanding your relationship with food helps me create a sustainable approach that fits your lifestyle and supports your fitness goals!`;
    }

    // General fallback
    return `Hi ${userName}! I'm Willie, your AI fitness consultant, and I'm here to create a completely personalized fitness plan just for you.

I want to understand your unique situation so I can design the perfect program. What's most important to you right now in your fitness journey?

Whether it's your schedule, equipment access, current routine, or nutrition questions - I'm here to help build something that truly works for your lifestyle!`;
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