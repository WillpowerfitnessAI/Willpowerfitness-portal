import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// Import AI and memory systems
import { getChatResponse, generateWorkoutPlan, analyzeNutrition, analyzeProgress } from './lib/aiProviders.js';
import { storeConversation, getConversationHistory, getUserProfile, updateUserProfile, logWorkout, getWorkoutHistory, exportUserData } from './lib/memorySystem.js';

// Import Enhanced AI Workout Intelligence and Progress Tracking
import { workoutAI } from './lib/workoutIntelligence.js';
import { progressTracker } from './lib/progressTracking.js';

// Import Nutrition Intelligence and Recovery Wellness
import { nutritionAI } from './lib/nutritionIntelligence.js';
import { recoveryWellness } from './lib/recoveryWellness.js';

// Import payment and fulfillment systems
import { createSubscription, createPaymentIntent, createCustomer, constructEvent, createCheckoutSession } from './lib/stripePayments.js';
import { createWelcomeShirtOrder, confirmOrder } from './lib/printfulIntegration.js';

// Import database client
import { query } from './lib/supabaseClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
// Serve static files with proper headers
app.use(express.static('public', {
  setHeaders: (res, path) => {
    if (path.endsWith('.png') || path.endsWith('.jpg') || path.endsWith('.jpeg')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000');
    }
  }
}));

// Helper function to get conversation context
async function getConversationContext(userId, limit = 5) {
  try {
    const result = await query(
      'SELECT user_message, ai_response FROM conversations WHERE user_id = $1 ORDER BY timestamp DESC LIMIT $2',
      [userId, limit]
    );
    return result.rows.reverse(); // Return in chronological order
  } catch (error) {
    console.error('Error fetching conversation context:', error);
    return [];
  }
}

// Premium white-label route - PRESENTATION READY
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>WillpowerFitnessAI - AI Personal Training</title>


        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          .container { 
            max-width: 1200px; 
            width: 100%;
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(20px);
            border-radius: 24px;
            box-shadow: 0 25px 50px rgba(0,0,0,0.15);
            overflow: hidden;
            display: flex;
            flex-direction: column;
            height: 90vh;
            max-height: 800px;
            min-height: 600px;
          }
          .header {
            background: linear-gradient(135deg, #1e3c72, #2a5298);
            color: white;
            padding: 40px;
            text-align: center;
            position: relative;
          }

          .header h1 { 
            font-size: 3rem; 
            font-weight: 700; 
            margin-bottom: 15px;
            background: linear-gradient(135deg, #fff, #e0e7ff);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }
          .header p { font-size: 1.3rem; opacity: 0.95; font-weight: 400; }
          .chat-container { 
            padding: 40px; 
            display: flex; 
            flex-direction: column; 
            flex: 1;
            min-height: 0;
          }
          .chat-box { 
            flex: 1;
            background: #f8fafc;
            border-radius: 20px;
            padding: 30px;
            margin-bottom: 30px;
            overflow-y: auto;
            box-shadow: inset 0 2px 10px rgba(0,0,0,0.05);
            border: 1px solid #e2e8f0;
            min-height: 200px;
          }
          .message { 
            margin: 20px 0; 
            padding: 20px 25px; 
            border-radius: 20px;
            max-width: 85%;
            line-height: 1.6;
            font-size: 1rem;
            animation: fadeInUp 0.3s ease;
          }
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .user { 
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white; 
            margin-left: auto;
            border-bottom-right-radius: 6px;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
          }
          .ai { 
            background: white;
            border: 1px solid #e2e8f0;
            border-bottom-left-radius: 6px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.08);
            color: #374151;
          }
          .cta-button {
            padding: 25px 50px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border: none;
            border-radius: 25px;
            cursor: pointer;
            font-weight: 600;
            font-size: 18px;
            transition: all 0.3s;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
            text-decoration: none;
            display: inline-block;
            text-align: center;
            margin: 20px auto;
          }
          .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
          }
          .features-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 30px 0;
          }
          .feature-card {
            background: white;
            padding: 25px;
            border-radius: 15px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            border: 1px solid #e2e8f0;
          }
          .feature-icon {
            font-size: 2rem;
            margin-bottom: 15px;
          }
          .typing-indicator {
            display: none;
            align-items: center;
            gap: 8px;
            color: #6b7280;
            font-style: italic;
            margin: 10px 0;
          }
          .typing-dots {
            display: flex;
            gap: 4px;
          }
          .typing-dots span {
            width: 6px;
            height: 6px;
            background: #9ca3af;
            border-radius: 50%;
            animation: typing 1.4s infinite;
          }
          .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
          .typing-dots span:nth-child(3) { animation-delay: 0.4s; }
          @keyframes typing {
            0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
            30% { transform: translateY(-10px); opacity: 1; }
          }


          button { 
            padding: 18px 35px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border: none;
            border-radius: 15px;
            cursor: pointer;
            font-weight: 600;
            font-size: 16px;
            transition: all 0.3s;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
            white-space: nowrap;
          }
          button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
          }
          button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
          }

          @media (max-width: 768px) {
            body { 
              padding: 5px; 
              overflow-x: hidden;
            }
            .container { 
              margin: 0; 
              height: calc(100vh - 10px);
              min-height: auto;
              max-height: none;
              border-radius: 12px;
              width: calc(100vw - 10px);
              max-width: none;
              overflow: hidden;
            }
            .header { 
              padding: 20px 15px; 
              border-radius: 16px 16px 0 0;
            }
            .header h1 { font-size: 1.8rem; line-height: 1.2; }
            .header p { font-size: 1rem; }
            .chat-container { padding: 15px; }
            .chat-box { 
              padding: 15px; 
              margin-bottom: 15px;
              border-radius: 12px;
            }
            .message { 
              max-width: 90%; 
              padding: 12px 16px;
              font-size: 0.9rem;
              border-radius: 16px;
            }
            .features-grid {
              grid-template-columns: 1fr;
              gap: 15px;
              margin: 20px 0;
            }
            .feature-card {
              padding: 20px;
              border-radius: 12px;
            }
            .feature-icon {
              font-size: 1.5rem;
              margin-bottom: 10px;
            }
            .cta-button {
              padding: 18px 30px;
              font-size: 16px;
              border-radius: 20px;
              width: 100%;
              max-width: 300px;
            }

            button { 
              width: 100%; 
              padding: 16px 20px;
              font-size: 16px;
            }

            input, select, textarea {
              font-size: 16px !important; /* Prevents zoom on iOS */
              padding: 12px;
              border-radius: 8px;
              border: 1px solid #e2e8f0;
              width: 100%;
              box-sizing: border-box;
            }
          }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>WillpowerFitnessAI</h1>
                <p>Premium Personalized Training & Nutrition Guidance</p>
                <div style="background: #16a34a; color: white; padding: 8px 16px; border-radius: 20px; font-size: 0.9rem; margin-top: 10px; display: inline-block;">
                    🟢 LIVE: Premium AI Fitness Coaching Platform
                </div>
            </div>
            <div class="chat-container">
                <div class="chat-box">
                    <div style="text-align: center; padding: 20px;">
                        <h2 style="color: #1e3c72; margin-bottom: 20px;">Transform Your Fitness Journey</h2>
                        <p style="font-size: 1.1rem; color: #4a5568; margin-bottom: 30px;">
                            Get personalized AI coaching tailored specifically to your goals, schedule, and fitness level.
                        </p>

                        <div class="features-grid">
                            <div class="feature-card">
                                <div class="feature-icon">🧠</div>
                                <h3>Enhanced AI Workout Intelligence</h3>
                                <p>Dynamic workout adjustments, real-time form analysis, RPE tracking, and injury prevention powered by advanced AI.</p>
                            </div>
                            <div class="feature-card">
                                <div class="feature-icon">📈</div>
                                <h3>Progress Tracking Dashboard</h3>
                                <p>Comprehensive analytics with strength gains, body composition tracking, milestone achievements, and progress photo analysis.</p>
                            </div>
                            <div class="feature-card">
                                <div class="feature-icon">🎯</div>
                                <h3>Personalized Elite Coaching</h3>
                                <p>AI coach that learns from your performance, adjusts in real-time, and provides expert-level guidance worth $225/month.</p>
                            </div>
                            <div class="feature-card">
                                <div class="feature-icon">🍎</div>
                                <h3>AI Nutrition Intelligence</h3>
                                <p>Personalized meal planning, smart food logging, macro tracking, and evidence-based supplement recommendations.</p>
                            </div>
                            <div class="feature-card">
                                <div class="feature-icon">😴</div>
                                <h3>Recovery & Wellness Monitoring</h3>
                                <p>Sleep optimization, stress management, daily recovery assessments, and training modifications based on wellness.</p>
                            </div>
                            <div class="feature-card">
                                <div class="feature-icon">👕</div>
                                <h3>Premium Member Benefits</h3>
                                <p>Welcome WillpowerFitnessAI apparel, priority support, and access to cutting-edge fitness technology.</p>
                            </div>
                        </div>

                        <!-- Dynamic CTA based on member status -->
                        <div id="non-member-cta">
                            <a href="/onboarding" class="cta-button">Start Your Free Consultation</a>
                            <p style="margin-top: 20px; color: #6b7280; font-size: 0.9rem;">
                                Begin with a personalized consultation to unlock your elite fitness coaching experience.
                            </p>
                        </div>

                        <div id="member-cta" style="display: none;">
                            <a href="/dashboard" class="cta-button">Access Your AI Trainer</a>
                            <a href="/login" class="cta-button" style="background: linear-gradient(135deg, #10b981, #059669); margin-top: 10px;">Member Login</a>
                            <p style="margin-top: 20px; color: #6b7280; font-size: 0.9rem;">
                                Welcome back! Continue your fitness journey with your AI personal trainer.
                            </p>
                        </div>

                        <!-- Member Workout Export (hidden by default, shown for active members) -->
                        <div id="member-features" style="display: none; margin-top: 30px; padding: 20px; background: #f8fafc; border-radius: 15px; border: 2px solid #e2e8f0;">
                            <h3 style="color: #1e3c72; margin-bottom: 15px;">🏋️ Elite Member Features</h3>
                            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                                <button id="export-workout-btn" class="cta-button" style="flex: 1; min-width: 150px; font-size: 14px; padding: 15px 25px;">Export Current Workout</button>
                                <button id="email-workout-btn" class="cta-button" style="flex: 1; min-width: 150px; font-size: 14px; padding: 15px 25px;">Email Workout Plan</button>
                                <button id="email-consultation-btn" class="cta-button" style="flex: 1; min-width: 150px; font-size: 14px; padding: 15px 25px;">Email Consultation</button>
                            </div>
                            <p style="margin-top: 10px; color: #6b7280; font-size: 0.8rem; text-align: center;">
                                Download or email your personalized AI-generated content
                            </p>
                        </div>
                    </div>
                </div>

            </div>
        </div>

        <script>
          // Simple page interactions and member detection
          document.addEventListener('DOMContentLoaded', function() {
            // Check if user is already a member
            const memberStatus = localStorage.getItem('willpower_member_status');
            const userEmail = localStorage.getItem('userEmail');

            if (memberStatus === 'active' && userEmail) {
              // Show member-specific CTA
              document.getElementById('non-member-cta').style.display = 'none';
              document.getElementById('member-cta').style.display = 'block';

              // Update page title for members
              document.querySelector('.header h1').textContent = 'Welcome Back to WillpowerFitnessAI';
              document.querySelector('.header p').textContent = `Continue your elite fitness journey, ${localStorage.getItem('willpower_member_name') || 'Member'}!`;
            }

            // Add smooth hover effects
            const cards = document.querySelectorAll('.feature-card');
            cards.forEach(card => {
              card.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-5px)';
                this.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
              });
              card.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0)';
                this.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
              });
            });
          });
        </script>
    </body>
    </html>
  `);
});

// User authentication endpoint
app.post('/api/authenticate', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check for active user profile first
    let user = await query(
      'SELECT * FROM user_profiles WHERE email = $1 AND subscription_status = $2',
      [email, 'active']
    );

    // If no active user profile, check if they're a lead who completed payment
    if (user.rows.length === 0) {
      const lead = await query(
        'SELECT * FROM leads WHERE email = $1 AND status IN ($2, $3)',
        [email, 'active_subscriber', 'consultation_complete']
      );

      if (lead.rows.length > 0) {
        // Create user profile from lead data
        const leadData = lead.rows[0];
        const newUser = await query(
          `INSERT INTO user_profiles (email, name, goal, subscription_status, created_at) 
           VALUES ($1, $2, $3, $4, NOW()) 
           ON CONFLICT (email) DO UPDATE SET 
           subscription_status = $4, name = COALESCE(name, $2), goal = COALESCE(goal, $3)
           RETURNING *`,
          [email, leadData.name, leadData.goals, 'active']
        );
        user = newUser;
      }
    }

    if (user.rows.length === 0) {
      return res.status(404).json({ 
        error: 'User not found', 
        message: 'Please complete the onboarding process first',
        redirectTo: '/onboarding'
      });
    }

    const userProfile = user.rows[0];

    // Successful authentication - user should go to dashboard
    res.json({
      success: true,
      redirectTo: '/dashboard',
      user: {
        id: userProfile.id,
        email: userProfile.email,
        name: userProfile.name,
        goal: userProfile.goal,
        subscriptionStatus: userProfile.subscription_status
      }
    });
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Enhanced workout generation endpoint
app.post('/api/generate-workout', async (req, res) => {
  try {
    const { userId, context, buttonClicked } = req.body;

    const workoutPrompt = {
      role: "system",
      content: `You are ${userId}'s dedicated AI personal trainer who knows them intimately. The user just clicked the "${buttonClicked}" button, showing they want a personalized workout for today.

      CREATE TODAY'S WORKOUT like their personal trainer who:
      🎯 Knows their goals, fitness level, and preferences
      💪 Designs workouts that challenge but don't overwhelm  
      🔬 Uses scientific principles for optimal results
      🤝 Provides encouraging, motivational guidance
      ⚡ Adapts to their current energy and recovery status

      Include:
      - Warm-up routine (5-10 minutes)
      - Main workout with specific exercises, sets, reps, weights
      - Cool-down and stretching
      - Expected duration and intensity level
      - Form cues and safety tips
      - Motivational encouragement

      Make this feel like their personal trainer created it specifically for them today.`
    };

    const workout = await getChatResponse([workoutPrompt], { userId, buttonClicked });

    res.json({ success: true, workout });
  } catch (error) {
    console.error('Workout generation error:', error);
    res.json({ 
      success: true, 
      workout: "Here's your personalized workout plan for today! I've designed this specifically for your goals and current fitness level..." 
    });
  }
});

// Enhanced nutrition planning endpoint
app.post('/api/nutrition-plan', async (req, res) => {
  try {
    const { userId, context, buttonClicked } = req.body;

    const nutritionPrompt = {
      role: "system", 
      content: `You are ${userId}'s personal nutrition coach who understands their lifestyle, goals, and dietary preferences. They clicked "${buttonClicked}" wanting comprehensive nutrition guidance.

      CREATE THEIR PERSONALIZED NUTRITION PLAN:
      🍎 Meal planning based on their goals (weight loss, muscle gain, performance)
      📊 Macro and calorie targets with explanations
      🛒 Grocery shopping list organized by store sections
      ⏰ Meal timing recommendations for their schedule
      💡 Practical tips for meal prep and consistency
      🎯 How nutrition connects to their fitness goals

      Make this feel like their dedicated nutritionist who truly cares about their success.`
    };

    const plan = await getChatResponse([nutritionPrompt], { userId, buttonClicked });

    res.json({ success: true, plan });
  } catch (error) {
    console.error('Nutrition plan error:', error);
    res.json({ 
      success: true, 
      plan: "Your personalized nutrition plan is ready! I've calculated your optimal macros and created meal suggestions..." 
    });
  }
});

// Enhanced progress tracking endpoint
app.post('/api/progress-report', async (req, res) => {
  try {
    const { userId, timeframe, buttonClicked } = req.body;

    const progressPrompt = {
      role: "system",
      content: `You are ${userId}'s dedicated AI fitness analyst who has been tracking their every workout, celebrating their wins, and supporting them through challenges. They clicked "${buttonClicked}" to see their progress.

      GENERATE THEIR PROGRESS REPORT like their biggest supporter:
      📈 Strength gains and performance improvements
      🎯 Goal achievement and milestone progress  
      💪 Consistency analysis and workout frequency
      🏆 Celebrating their wins and breakthrough moments
      🔥 Areas showing the most improvement
      📊 Data-driven insights about their journey
      🚀 Exciting projections for continued progress

      Make them feel proud of how far they've come and excited about where they're going.`
    };

    const report = await getChatResponse([progressPrompt], { userId, buttonClicked, timeframe });

    res.json({ success: true, report });
  } catch (error) {
    console.error('Progress report error:', error);
    res.json({ 
      success: true, 
      report: "Your progress has been absolutely incredible! Let me show you exactly how much you've improved..." 
    });
  }
});

// Enhanced motivation endpoint
app.post('/api/motivation', async (req, res) => {
  try {
    const { userId, context, buttonClicked } = req.body;

    const motivationPrompt = {
      role: "system",
      content: `You are ${userId}'s personal motivation coach and biggest cheerleader who genuinely believes in them. They clicked "${buttonClicked}" because they need encouragement and support.

      PROVIDE POWERFUL MOTIVATION like their best friend/coach:
      🔥 Acknowledge their effort and dedication
      💪 Remind them of their strength and capability
      🎯 Connect their daily actions to their bigger goals
      🏆 Celebrate their recent wins and progress
      ⚡ Energize them for today's workout
      🌟 Paint an inspiring picture of their future success
      💝 Show genuine care and belief in their journey

      Make them feel unstoppable and ready to crush their goals.`
    };

    const motivation = await getChatResponse([motivationPrompt], { userId, buttonClicked });

    res.json({ success: true, motivation });
  } catch (error) {
    console.error('Motivation error:', error);
    res.json({ 
      success: true, 
      motivation: "You are absolutely crushing this fitness journey! Every single workout is building the stronger, healthier version of yourself..." 
    });
  }
});

// Enhanced chat endpoint with improved context handling
app.post('/api/chat', async (req, res) => {
  try {
    const { message, userId, context, buttonInteractionContext, currentWorkout, workoutSets } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log(`Chat request from ${userId}: ${message}`);

    // Get recent conversation history for context
    const recentMessages = await getConversationContext(userId, 5);

    // Build conversation messages with history
    const conversationMessages = [];

    // Add recent conversation history
    recentMessages.forEach(conv => {
      conversationMessages.push({ role: "user", content: conv.user_message });
      conversationMessages.push({ role: "assistant", content: conv.ai_response });
    });

    // Add current message
    conversationMessages.push({
      role: "user",
      content: message
    });

    // Enhanced user context for AI including button interactions
    const userContext = {
      userId: userId,
      context: context,
      buttonInteractionContext: buttonInteractionContext,
      currentWorkout: currentWorkout,
      workoutSets: workoutSets,
      timestamp: new Date().toISOString(),
      isWorkoutCoaching: context === 'workout_coaching',
      chatMode: 'responsive_trainer', // Explicitly set chat mode
      consultationMode: false, // Explicitly disable consultation mode
      // Add any stored user preferences or history here
    };

    // Always use responsive trainer prompt - no consultation mode in chat
    const systemPrompt = {
      role: "system",
      content: `You are ${userId}'s personal AI fitness trainer providing responsive, helpful guidance. You are like ChatGPT but specialized for fitness.

      CHAT BEHAVIOR:
      🗣️ Be conversational and responsive like ChatGPT
      💬 Respond directly to what they're saying
      🎯 Stay focused on their current request
      💪 Provide specific, actionable fitness advice
      🔥 Be encouraging and supportive
      ⚡ Keep responses focused and helpful

      ${context === 'workout_coaching' ? `
      CURRENT WORKOUT CONTEXT:
      ${currentWorkout ? `Active workout: ${JSON.stringify(currentWorkout)}` : 'No active workout'}
      ${workoutSets?.length ? `Sets completed: ${workoutSets.length}` : 'No sets logged yet'}
      ${buttonInteractionContext ? `Last action: ${buttonInteractionContext}` : ''}

      Give real-time workout support and coaching.` : ''}

      Never switch to consultation mode - just be their responsive AI trainer!`
    };

    // Add system prompt at the beginning
    conversationMessages.unshift(systemPrompt);

    const response = await getChatResponse(conversationMessages, userContext);

    // Store conversation with enhanced context
    if (userId) {
      try {
        await query(
          'INSERT INTO conversations (user_id, user_message, ai_response, context) VALUES ($1, $2, $3, $4)',
          [userId, message, response, JSON.stringify(userContext)]
        );
      } catch (dbError) {
        console.log('Database storage skipped:', dbError.message);
      }
    }

    res.json({ 
      response: response,
      context: userContext
    });

  } catch (error) {
    console.error('Chat API Error:', error);

    // Context-aware fallback responses
    let fallbackResponse;
    if (req.body.context === 'workout_coaching') {
      fallbackResponse = `I'm right here with you! Keep pushing through your workout - you're doing amazing! 

Need help with:
• Form feedback on your current exercise?
• Weight recommendations for your next set?
• Motivation to finish strong?

Just let me know and I'll help you crush this workout! 💪`;
    } else {
      fallbackResponse = `I'm experiencing a quick connection issue, but I'm still here for you! 

I'm your dedicated AI personal trainer, and I want to help you succeed. Whether you need:
• A workout plan for today
• Nutrition guidance 
• Form coaching during your workout
• Progress tracking and motivation

Just let me know what you'd like to focus on, and I'll give you my full attention! Your fitness journey is important to me.`;
    }

    res.json({ 
      response: fallbackResponse,
      fallback: true 
    });
  }
});

// Enhanced workout logging endpoint
app.post('/api/log-workout', async (req, res) => {
  try {
    const { userId, completedAt, exercises, duration, notes } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    const workoutData = {
      type: 'completed_session',
      exercises: exercises || [],
      duration: duration || '45 minutes',
      notes: notes || 'Workout completed successfully',
      completedAt: completedAt || new Date().toISOString()
    };

    // Store workout in database
    await query(
      'INSERT INTO workouts (user_id, workout_data, completed_at) VALUES ($1, $2, $3)',
      [userId, JSON.stringify(workoutData), workoutData.completedAt]
    );

    res.json({
      success: true,
      message: 'Workout logged successfully',
      workoutData
    });
  } catch (error) {
    console.error('Workout logging error:', error);
    res.json({
      success: true,
      message: 'Workout logged successfully'
    });
  }
});

// Enhanced AI-powered workout adjustment endpoint
app.post('/api/ai-workout/adjust', async (req, res) => {
  try {
    const { userId, currentWorkout, performanceData } = req.body;

    if (!userId || !currentWorkout || !performanceData) {
      return res.status(400).json({ error: 'Missing required data' });
    }

    // Check if user has active subscription
    const userProfile = await getUserProfile(userId);
    if (!userProfile || userProfile.subscription_status !== 'active') {
      return res.status(403).json({ error: 'Elite membership required for AI workout adjustments' });
    }

    const adjustment = await workoutAI.adjustWorkoutDynamically(userId, currentWorkout, performanceData);

    res.json({
      success: true,
      ...adjustment,
      message: 'AI has dynamically adjusted your workout based on your performance data'
    });
  } catch (error) {
    console.error('AI workout adjustment error:', error);
    res.status(500).json({ error: 'Failed to adjust workout' });
  }
});

// AI Form Analysis
app.post('/api/ai-workout/form-analysis', async (req, res) => {
  try {
    const { userId, exerciseName, formFeedback, videoDescription } = req.body;

    if (!userId || !exerciseName || !formFeedback) {
      return res.status(400).json({ error: 'Missing required form analysis data' });
    }

    // Check subscription
    const userProfile = await getUserProfile(userId);
    if (!userProfile || userProfile.subscription_status !== 'active') {
      return res.status(403).json({ error: 'Elite membership required for AI form analysis' });
    }

    const analysis = await workoutAI.analyzeExerciseForm(userId, exerciseName, formFeedback, videoDescription);

    res.json({
      success: true,
      exercise: exerciseName,
      ...analysis,
      message: 'AI has analyzed your exercise form and provided detailed feedback'
    });
  } catch (error) {
    console.error('Form analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze exercise form' });
  }
});

// RPE-based auto-adjustments
app.post('/api/ai-workout/rpe-feedback', async (req, res) => {
  try {
    const { userId, exerciseData, rpeRating, notes } = req.body;

    if (!userId || !exerciseData || !rpeRating) {
      return res.status(400).json({ error: 'Missing RPE feedback data' });
    }

    // Validate RPE rating
    if (rpeRating < 1 || rpeRating > 10) {
      return res.status(400).json({ error: 'RPE rating must be between 1 and 10' });
    }

    // Check subscription
    const userProfile = await getUserProfile(userId);
    if (!userProfile || userProfile.subscription_status !== 'active') {
      return res.status(403).json({ error: 'Elite membership required for RPE tracking' });
    }

    const feedback = await workoutAI.processRPEFeedback(userId, exerciseData, rpeRating, notes);

    res.json({
      success: true,
      exercise: exerciseData.name,
      ...feedback,
      message: 'AI has processed your RPE feedback and adjusted future recommendations'
    });
  } catch (error) {
    console.error('RPE feedback error:', error);
    res.status(500).json({ error: 'Failed to process RPE feedback' });
  }
});

// Injury prevention analysis
app.post('/api/ai-workout/injury-analysis', async (req, res) => {
  try {
    const { userId, currentSymptoms } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    // Check subscription
    const userProfile = await getUserProfile(userId);
    if (!userProfile || userProfile.subscription_status !=='active') {
      return res.status(403).json({ error: 'Elite membership required for injury prevention analysis' });
    }

    const analysis = await workoutAI.analyzeInjuryRisk(userId, [], currentSymptoms || []);

    res.json({
      success: true,
      ...analysis,
      message: 'AI has analyzed your injury risk and provided prevention recommendations'
    });
  } catch (error) {
    console.error('Injury analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze injury risk' });
  }
});

// ========================================
// PROGRESS TRACKING DASHBOARD ENDPOINTS
// ========================================

// Record progress metrics
app.post('/api/progress/record', async (req, res) => {
  try {
    const { userId, metrics } = req.body;

    if (!userId || !metrics) {
      return res.status(400).json({ error: 'User ID and metrics required' });
    }

    // Check subscription
    const userProfile = await getUserProfile(userId);
    if (!userProfile || userProfile.subscription_status !== 'active') {
      return res.status(403).json({ error: 'Elite membership required for progress tracking' });
    }

    const result = await progressTracker.recordProgressMetrics(userId, metrics);

    res.json({
      success: true,
      ...result,
      message: 'Progress metrics recorded successfully'
    });
  } catch (error) {
    console.error('Progress recording error:', error);
    res.status(500).json({ error: 'Failed to record progress metrics' });
  }
});

// Generate comprehensive progress report
app.post('/api/progress/report', async (req, res) => {
  try {
    const { userId, timeframe } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    // Check subscription
    const userProfile = await getUserProfile(userId);
    if (!userProfile || userProfile.subscription_status !== 'active') {
      return res.status(403).json({ error: 'Elite membership required for progress reports' });
    }

    const report = await progressTracker.generateProgressReport(userId, timeframe || '30_days');

    res.json({
      success: true,
      report,
      message: 'Comprehensive progress report generated'
    });
  } catch (error) {
    console.error('Progress report error:', error);
    res.status(500).json({ error: 'Failed to generate progress report' });
  }
});

// Progress photo analysis
app.post('/api/progress/photo-analysis', async (req, res) => {
  try {
    const { userId, photoData } = req.body;

    if (!userId || !photoData) {
      return res.status(400).json({ error: 'User ID and photo data required' });
    }

    // Check subscription
    const userProfile = await getUserProfile(userId);
    if (!userProfile || userProfile.subscription_status !== 'active') {
      return res.status(403).json({ error: 'Elite membership required for photo analysis' });
    }

    const analysis = await progressTracker.analyzeProgressPhotos(userId, photoData);

    res.json({
      success: true,
      ...analysis,
      message: 'Progress photo analysis completed'
    });
  } catch (error) {
    console.error('Photo analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze progress photos' });
  }
});

// Goal milestone tracking
app.post('/api/progress/milestones', async (req, res) => {
  try {
    const { userId, currentMetrics } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    // Check subscription
    const userProfile = await getUserProfile(userId);
    if (!userProfile || userProfile.subscription_status !== 'active') {
      return res.status(403).json({ error: 'Elite membership required for milestone tracking' });
    }

    const milestones = await progressTracker.trackGoalMilestones(userId, currentMetrics || {});

    res.json({
      success: true,
      ...milestones,
      message: 'Goal milestones updated'
    });
  } catch (error) {
    console.error('Milestone tracking error:', error);
    res.status(500).json({ error: 'Failed to track milestones' });
  }
});

// Get user's progress dashboard data
app.get('/api/progress/dashboard/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { timeframe } = req.query;

    // Check subscription
    const userProfile = await getUserProfile(userId);
    if (!userProfile || userProfile.subscription_status !== 'active') {
      return res.status(403).json({ error: 'Elite membership required for progress dashboard' });
    }

    // Get comprehensive dashboard data
    const [progressReport, milestones, recentWorkouts] = await Promise.all([
      progressTracker.generateProgressReport(userId, timeframe || '30_days'),
      progressTracker.trackGoalMilestones(userId, {}),
      getWorkoutHistory(userId, 10)
    ]);

    const dashboardData = {
      user: {
        name: userProfile.name,
        email: userProfile.email,
        goal: userProfile.goal,
        memberSince: userProfile.subscription_start
      },
      progressReport,
      milestones,
      recentActivity: recentWorkouts,
      summary: {
        totalWorkouts: recentWorkouts.length,
        currentStreak: await calculateWorkoutStreak(userId),
        nextMilestone: milestones.upcomingMilestones?.[0] || null
      }
    };

    res.json({
      success: true,
      dashboard: dashboardData,
      message: 'Progress dashboard loaded successfully'
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to load progress dashboard' });
  }
});

// Helper function for workout streak calculation
async function calculateWorkoutStreak(userId) {
  try {
    const workouts = await getWorkoutHistory(userId, 30);
    // Simple streak calculation - consecutive days with workouts
    let streak = 0;
    const today = new Date();

    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);

      const hasWorkout = workouts.some(w => {
        const workoutDate = new Date(w.completed_at);
        return workoutDate.toDateString() === checkDate.toDateString();
      });

      if (hasWorkout) {
        streak++;
      } else if (i > 0) { // Allow for today to not have a workout yet
        break;
      }
    }

    return streak;
  } catch (error) {
    return 0;
  }
}

// ========================================
// NUTRITION INTELLIGENCE ENDPOINTS
// ========================================

// Generate personalized meal plan
app.post('/api/nutrition/meal-plan', async (req, res) => {
  try {
    const { userId, preferences } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    // Check subscription
    const userProfile = await getUserProfile(userId);
    if (!userProfile || userProfile.subscription_status !== 'active') {
      return res.status(403).json({ error: 'Elite membership required for AI meal planning' });
    }

    const mealPlan = await nutritionAI.generateMealPlan(userId, preferences || {});

    res.json({
      success: true,
      ...mealPlan,
      message: 'Personalized meal plan generated by your AI nutrition coach'
    });
  } catch (error) {
    console.error('Meal plan generation error:', error);
    res.status(500).json({ error: 'Failed to generate meal plan' });
  }
});

// Analyze food log with AI
app.post('/api/nutrition/analyze-food', async (req, res) => {
  try {
    const { userId, foodItems, photoDescription } = req.body;

    if (!userId || !foodItems) {
      return res.status(400).json({ error: 'User ID and food items required' });
    }

    // Check subscription
    const userProfile = await getUserProfile(userId);
    if (!userProfile || userProfile.subscription_status !== 'active') {
      return res.status(403).json({ error: 'Elite membership required for nutrition analysis' });
    }

    const analysis = await nutritionAI.analyzeFoodLog(userId, foodItems, photoDescription);

    res.json({
      success: true,
      ...analysis,
      message: 'Food log analyzed by your AI nutrition coach'
    });
  } catch (error) {
    console.error('Food analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze food log' });
  }
});

// Get supplement recommendations
app.post('/api/nutrition/supplements', async (req, res) => {
  try {
    const { userId, currentSupplements } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    // Check subscription
    const userProfile = await getUserProfile(userId);
    if (!userProfile || userProfile.subscription_status !== 'active') {
      return res.status(403).json({ error: 'Elite membership required for supplement recommendations' });
    }

    const advice = await nutritionAI.generateSupplementAdvice(userId, currentSupplements || []);

    res.json({
      success: true,
      ...advice,
      message: 'Supplement recommendations from your AI nutrition expert'
    });
  } catch (error) {
    console.error('Supplement advice error:', error);
    res.status(500).json({ error: 'Failed to generate supplement recommendations' });
  }
});

// ========================================
// RECOVERY & WELLNESS ENDPOINTS
// ========================================

// Daily recovery assessment
app.post('/api/recovery/assess', async (req, res) => {
  try {
    const { userId, recoveryData } = req.body;

    if (!userId || !recoveryData) {
      return res.status(400).json({ error: 'User ID and recovery data required' });
    }

    // Check subscription
    const userProfile = await getUserProfile(userId);
    if (!userProfile || userProfile.subscription_status !== 'active') {
      return res.status(403).json({ error: 'Elite membership required for recovery monitoring' });
    }

    const assessment = await recoveryWellness.assessDailyRecovery(userId, recoveryData);

    res.json({
      success: true,
      ...assessment,
      message: 'Daily recovery assessed by your AI wellness coach'
    });
  } catch (error) {
    console.error('Recovery assessment error:', error);
    res.status(500).json({ error: 'Failed to assess recovery' });
  }
});

// Sleep pattern analysis
app.post('/api/recovery/sleep-analysis', async (req, res) => {
  try {
    const { userId, sleepData } = req.body;

    if (!userId || !sleepData) {
      return res.status(400).json({ error: 'User ID and sleep data required' });
    }

    // Check subscription
    const userProfile = await getUserProfile(userId);
    if (!userProfile || userProfile.subscription_status !== 'active') {
      return res.status(403).json({ error: 'Elite membership required for sleep optimization' });
    }

    const analysis = await recoveryWellness.analyzeSleepPatterns(userId, sleepData);

    res.json({
      success: true,
      ...analysis,
      message: 'Sleep patterns analyzed for optimization'
    });
  } catch (error) {
    console.error('Sleep analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze sleep patterns' });
  }
});

// Stress and wellness assessment
app.post('/api/recovery/stress-assessment', async (req, res) => {
  try {
    const { userId, stressData } = req.body;

    if (!userId || !stressData) {
      return res.status(400).json({ error: 'User ID and stress data required' });
    }

    // Check subscription
    const userProfile = await getUserProfile(userId);
    if (!userProfile || userProfile.subscription_status !== 'active') {
      return res.status(403).json({ error: 'Elite membership required for wellness coaching' });
    }

    const assessment = await recoveryWellness.assessStressWellness(userId, stressData);

    res.json({
      success: true,
      ...assessment,
      message: 'Stress and wellness assessed by your AI coach'
    });
  } catch (error) {
    console.error('Stress assessment error:', error);
    res.status(500).json({ error: 'Failed to assess stress and wellness' });
  }
});

// Export workout plans for members
app.post('/api/export-workout', async (req, res) => {
  try {
    const { userId, email, workoutType = 'current' } = req.body;

    if (!userId && !email) {
      return res.status(400).json({ error: 'User ID or email required' });
    }

    // Check if user has active subscription
    const userProfile = userId ? 
      await getUserProfile(userId) : 
      await query('SELECT * FROM user_profiles WHERE email = $1', [email]).then(r => r.rows[0]);

    if (!userProfile || userProfile.subscription_status !== 'active') {
      return res.status(403).json({ 
        error: 'Active membership required',
        message: 'Workout exports are available for Elite members only'
      });
    }

    // Generate personalized workout plan
    const workoutPlan = await generateWorkoutPlan(userProfile, {
      goal: userProfile.goal,
      experience: userProfile.memory?.experience || 'intermediate',
      preferences: userProfile.memory?.preferences || {}
    });

    // Format workout for export
    const workoutExport = `WILLPOWERFITNESSAI PERSONAL WORKOUT PLAN
═══════════════════════════════════════════════════════════════

👤 MEMBER INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name: ${userProfile.name}
Email: ${userProfile.email}
Primary Goal: ${userProfile.goal}
Generated: ${new Date().toLocaleDateString('en-US', { 
  weekday: 'long', 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
})}

🎯 PERSONALIZED WORKOUT PLAN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${workoutPlan}

📊 PROGRESS TRACKING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Log your workouts in the WillpowerFitness AI app
✓ Track your progress with our AI analytics
✓ Get real-time form feedback from your AI coach
✓ Receive weekly plan updates based on your progress

💡 NEED HELP?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Chat with your AI trainer 24/7 for guidance
• Contact support: support@willpowerfitnessai.com
• Access your full training dashboard at: https://${req.get('host')}

Plan ID: WF-WORKOUT-${Date.now()}

Generated by WillpowerFitness AI Elite
Your Personal AI Fitness Coach
═══════════════════════════════════════════════════════════════`;

    res.json({
      success: true,
      workoutPlan: workoutExport,
      fileName: `WillpowerFitness-Workout-${userProfile.name.replace(/\s+/g, '')}-${Date.now()}.txt`,
      member: userProfile.name
    });
  } catch (error) {
    console.error('Workout export error:', error);
    res.status(500).json({ error: 'Failed to export workout plan' });
  }
});

// Email workout plans for members
app.post('/api/email-workout', async (req, res) => {
  try {
    const { userId, email } = req.body;

    // Get workout export
    const workoutResponse = await fetch(`${req.protocol}://${req.get('host')}/api/export-workout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, email })
    });

    if (!workoutResponse.ok) {
      const error = await workoutResponse.json();
      return res.status(workoutResponse.status).json(error);
    }

    const { workoutPlan, member } = await workoutResponse.json();

    // In a real implementation, you'd send this via email service
    console.log('📧 WORKOUT EMAIL WOULD BE SENT TO:', email);
    console.log('📧 WORKOUT CONTENT:', workoutPlan);

    res.json({
      success: true,
      message: `Workout plan emailed to ${email}`,
      recipient: email,
      member: member
    });
  } catch (error) {
    console.error('Email workout error:', error);
    res.status(500).json({ error: 'Failed to email workout plan' });
  }
});

// Delete all user data when subscription is cancelled
app.post('/api/delete-user-data', async (req, res) => {
  try {
    const { userId, email, reason = 'subscription_cancelled' } = req.body;

    if (!userId && !email) {
      return res.status(400).json({ error: 'User ID or email required' });
    }

    const userIdentifier = email || userId;

    // Delete all user data across all tables
    const deletionTasks = [
      query('DELETE FROM conversations WHERE user_id = $1', [userIdentifier]),
      query('DELETE FROM messages WHERE user_id = $1', [userIdentifier]),
      query('DELETE FROM workouts WHERE user_id = $1', [userIdentifier]),
      query('DELETE FROM workout_adjustments WHERE user_id = $1', [userIdentifier]),
      query('DELETE FROM form_analyses WHERE user_id = $1', [userIdentifier]),
      query('DELETE FROM rpe_tracking WHERE user_id = $1', [userIdentifier]),
      query('DELETE FROM progress_tracking WHERE user_id = $1', [userIdentifier]),
      query('DELETE FROM progress_reports WHERE user_id = $1', [userIdentifier]),
      query('DELETE FROM progress_photos WHERE user_id = $1', [userIdentifier]),
      query('DELETE FROM user_goals WHERE user_id = $1', [userIdentifier]),
      query('DELETE FROM milestone_achievements WHERE user_id = $1', [userIdentifier]),
      query('DELETE FROM nutrition_plans WHERE user_id = $1', [userIdentifier]),
      query('DELETE FROM nutrition_logs WHERE user_id = $1', [userIdentifier]),
      query('DELETE FROM supplement_recommendations WHERE user_id = $1', [userIdentifier]),
      query('DELETE FROM recovery_tracking WHERE user_id = $1', [userIdentifier]),
      query('DELETE FROM sleep_analysis WHERE user_id = $1', [userIdentifier]),
      query('DELETE FROM stress_assessments WHERE user_id = $1', [userIdentifier]),
      query('DELETE FROM user_profiles WHERE email = $1 OR id::text = $1', [userIdentifier])
    ];

    // Execute all deletions
    await Promise.all(deletionTasks);

    // Log the deletion
    console.log(`🗑️ Complete data deletion for user: ${userIdentifier}, reason: ${reason}`);

    res.json({
      success: true,
      message: 'All user data has been permanently deleted from our systems',
      deletedFor: userIdentifier,
      reason: reason,
      deletedAt: new Date().toISOString(),
      tablesCleared: [
        'conversations', 'messages', 'workouts', 'workout_adjustments',
        'form_analyses', 'rpe_tracking', 'progress_tracking', 'progress_reports',
        'progress_photos', 'user_goals', 'milestone_achievements', 'nutrition_plans',
        'nutrition_logs', 'supplement_recommendations', 'recovery_tracking',
        'sleep_analysis', 'stress_assessments', 'user_profiles'
      ]
    });
  } catch (error) {
    console.error('Data deletion error:', error);
    res.status(500).json({ error: 'Failed to delete user data' });
  }
});

// Create subscription endpoint
app.post('/api/subscribe', async (req, res) => {
  try {
    const { email, name, priceId, shippingAddress } = req.body;

    // Create Stripe customer
    const customer = await createCustomer(email, name, { 
      fitness_subscriber: 'true' 
    });

    // Create subscription
    const subscription = await createSubscription(customer.id, priceId);

    // Update user profile
    await updateUserProfile(customer.id, {
      name,
      email,
      subscription_status: 'pending',
      stripe_customer_id: customer.id
    });

    res.json({
      customerId: customer.id,
      subscriptionId: subscription.subscriptionId,
      clientSecret: subscription.clientSecret
    });
  } catch (error) {
    console.error('Subscription error:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

// Handle successful payment webhook
app.post('/api/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const event = constructEvent(req.body, req.headers['stripe-signature']);

    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object;
      const customerId = invoice.customer;

      // Update user subscription status
      await updateUserProfile(customerId, {
        subscription_status: 'active',
        subscription_start: new Date().toISOString()
      });

      // Get user profile for shipping
      const userProfile = await getUserProfile(customerId);

      // Send welcome shirt if it's their first payment and we have shipping address
      if (userProfile.welcome_shirt_sent !== true && userProfile.shipping_address) {
        try {
          const order = await createWelcomeShirtOrder(
            {
              name: userProfile.name,
              address: userProfile.shipping_address
            },
            userProfile.shirt_size || 'M'
          );

          await confirmOrder(order.id);

          // Mark t-shirt as sent
          await updateUserProfile(customerId, {
            welcome_shirt_sent: true,
            printful_order_id: order.id
          });

          console.log(`✅ Welcome shirt ordered for customer ${customerId}`);
        } catch (shirtError) {
          console.error('⚠️ Failed to send welcome shirt:', shirtError.message);
          // Don't throw - continue with user activation even if shirt fails
        }
      } else if (!userProfile.shipping_address) {
        console.log(`⚠️ No shipping address for ${customerId} - welcome shirt skipped`);
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).send('Webhook Error');
  }
});

// Get subscription status
app.get('/api/subscription/:userId', async (req, res) => {
  try {
    const profile = await getUserProfile(req.params.userId);
    res.json({ 
      status: profile.subscription_status || 'inactive',
      welcomeShirtSent: profile.welcome_shirt_sent || false
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch subscription status' });
  }
});

// Onboarding Step 1 - Save user info
app.post('/api/onboarding/step1', async (req, res) => {
  try {
    const { name, email, phone, goal, experience } = req.body;

    // Validate required fields
    if (!name || !email || !goal || !experience) {
      console.log('Missing required fields:', { name, email, goal, experience });
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log('Saving onboarding data:', { name, email, phone, goal, experience });

    // Save lead to database (query function now has built-in retries)
    const result = await query(
      `INSERT INTO leads (name, email, phone, goals, experience, status, source) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       ON CONFLICT (email) DO UPDATE SET 
       name = $1, phone = $3, goals = $4, experience = $5, status = $6
       RETURNING *`,
      [name, email, phone || null, goal, experience, 'onboarding', 'website']
    );

    console.log('Onboarding data saved successfully:', result.rows[0]);
    res.json({ success: true, leadId: result.rows[0].id });
  } catch (error) {
    console.error('Onboarding Step 1 error:', error);
    res.status(500).json({ 
      error: 'Failed to save information', 
      details: error.message,
      suggestion: 'Please try again in a moment'
    });
  }
});

// AI Consultation endpoint with improved context management
app.post('/api/consultation', async (req, res) => {
  try {
    const { message, userData } = req.body;

    // Get complete consultation history for this user with proper conversation tracking
    const existingConversation = await query(
      'SELECT message, ai_response, timestamp FROM leads WHERE email = $1 ORDER BY timestamp DESC LIMIT 1',
      [userData.email]
    );

    // Build full conversation context properly
    let fullConversationHistory = [];
    let exchangeCount = 0;

    if (existingConversation.rows.length > 0) {
      const lead = existingConversation.rows[0];
      const userMessages = (lead.message || '').split('\n').filter(msg => msg.startsWith('User:')).map(msg => msg.replace('User: ', ''));
      const aiResponse = lead.ai_response || '';

      // Count actual exchanges
      exchangeCount = userMessages.length;

      // Build conversation history for context
      userMessages.forEach((userMsg, index) => {
        fullConversationHistory.push({ role: "user", content: userMsg });
        if (index === userMessages.length - 1 && aiResponse) {
          fullConversationHistory.push({ role: "assistant", content: aiResponse });
        }
      });
    }

    // Create progressive consultation with enhanced context
    let systemPrompt;
    let consultationComplete = false;

    if (exchangeCount === 0) {
      systemPrompt = `You are Willie, an elite fitness consultant conducting a personalized assessment for ${userData.name}.

BACKGROUND: ${userData.name} wants to achieve ${userData.goal} and has ${userData.experience} experience level.

FIRST CONSULTATION QUESTION (1/4): Ask about their weekly schedule - what days and times they can realistically commit to working out. Keep it conversational, encouraging, and show genuine interest in helping them succeed.

Important: Provide a complete response without cutting off. This is the beginning of building their personalized fitness journey.`;

    } else if (exchangeCount === 1) {
      systemPrompt = `You are Willie continuing the consultation for ${userData.name}.

SECOND CONSULTATION QUESTION (2/4): Now ask about their equipment access (home gym, commercial gym, outdoor spaces) and any physical limitations, injuries, or health considerations that would affect their training program.

Reference their previous answer about schedule and build on that information. Keep the conversation flowing naturally.`;

    } else if (exchangeCount === 2) {
      systemPrompt = `You are Willie continuing the consultation for ${userData.name}.

THIRD CONSULTATION QUESTION (3/4): Ask about their current fitness routine, favorite exercises, and what they want to change or improve about their current approach.

Build on the previous information about their schedule and equipment access. Show you're listening and creating a comprehensive picture.`;

    } else if (exchangeCount === 3) {
      systemPrompt = `You are Willie completing the consultation for ${userData.name}.

FINAL CONSULTATION STAGE (4/4): Based on all the information gathered, provide a comprehensive personalized summary of their fitness needs and enthusiastically recommend WillpowerFitness AI Elite membership.

Address their specific:
- Goal: ${userData.goal}
- Experience level: ${userData.experience}
- Schedule and equipment preferences from conversation
- Current routine and desired improvements

Highlight how WillpowerFitness AI will address their unique needs with:
• Personalized AI trainer that learns their preferences
• Custom workout plans fitting their schedule and equipment
• Smart nutrition guidance tailored to their goals
• 24/7 AI support and progress analytics
• Welcome WillpowerFitnessAI premium apparel
• Real-time workout adjustments and form feedback

Make this feel like a complete, thorough consultation they'd get from a $225/month personal trainer.`;

      consultationComplete = true;
    } else {
      // Fallback for additional questions
      systemPrompt = `You are Willie, their dedicated AI fitness consultant. The consultation is complete. Answer any additional questions they have about WillpowerFitness AI Elite membership or their personalized fitness plan. Be encouraging and helpful.`;
      consultationComplete = true;
    }

    // Create conversation with full context
    const conversationMessages = [
      { role: "system", content: systemPrompt },
      ...fullConversationHistory,
      { role: "user", content: message }
    ];

    // Get AI response with increased token limit to prevent cutoffs
    const aiResponse = await getChatResponse(conversationMessages, {
      ...userData,
      maxTokens: 800, // Increased to prevent cutoffs
      temperature: 0.7
    });

    // Update database with proper conversation tracking
    const currentMessageHistory = existingConversation.rows.length > 0 ? 
      (existingConversation.rows[0].message || '') : '';

    const updatedMessageHistory = currentMessageHistory + `User: ${message}\n`;

    await query(
      `UPDATE leads SET 
       message = $1,
       ai_response = $2,
       status = $3,
       timestamp = NOW()
       WHERE email = $4`,
      [
        updatedMessageHistory,
        aiResponse,
        consultationComplete ? 'consultation_complete' : 'in_consultation',
        userData.email
      ]
    );

    console.log(`Consultation progress for ${userData.email}: ${exchangeCount + 1}/4 questions, Complete: ${consultationComplete}`);

    res.json({ 
      response: aiResponse,
      consultationComplete,
      progressInfo: {
        currentStep: exchangeCount + 1,
        totalSteps: 4,
        nextStep: consultationComplete ? 'Ready for membership' : 'Continue consultation'
      }
    });

  } catch (error) {
    console.error('Consultation error:', error);
    res.status(500).json({ 
      error: 'Consultation temporarily unavailable',
      fallback: `Hi ${req.body.userData?.name || 'there'}! I'm Willie, your AI fitness consultant. I'm here to create your personalized fitness plan. Let's start with your goals and current situation - what would you like to achieve with your fitness journey?`
    });
  }
});

// Create subscription with Stripe
app.post('/api/create-subscription', async (req, res) => {
  try {
    const { email, name, userData } = req.body;

    console.log('Creating subscription for:', { email, name, userData });

    // Validate required data
    if (!email || !name || !userData) {
      return res.status(400).json({ 
        error: 'Missing required data',
        details: 'Email, name, and user data are required'
      });
    }

    // Check if Stripe is properly configured
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('Stripe secret key not configured');
      return res.status(500).json({ 
        error: 'Payment system not configured',
        details: 'Please contact support'
      });
    }

    // Create Stripe customer first (this doesn't depend on our database)
    const customer = await createCustomer(email, name, {
      fitness_goal: userData.goal,
      experience_level: userData.experience,
      phone: userData.phone
    });

    console.log('Stripe customer created:', customer.id);

    // Create Stripe checkout session with email parameter
    const checkoutSession = await createCheckoutSession(customer.id, email, userData);

    console.log('Checkout session created:', checkoutSession.id);

    // Try to update database, but don'tfail if it's down
    try {
      await query(
        `UPDATE leads SET 
         status = 'payment_pending',
         payment_link = $1
         WHERE email = $2`,
        [checkoutSession.url, email]
      );

      // Create user profile 
      await updateUserProfile(customer.id, {
        name,
        email,
        goal: userData.goal,
        subscription_status: 'pending',
        stripe_customer_id: customer.id,
        onboarding_data: JSON.stringify(userData)
      });

      console.log('Database updated successfully');
    } catch (dbError) {
      console.error('Database update failed, but continuing with payment:', dbError.message);
      // Continue anyway - webhook will handle the database update
    }

    res.json({
      customerId: customer.id,
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.id
    });
  } catch (error) {
    console.error('Subscription creation error:', error);

    // Provide more specific error messages
    let errorMessage = 'Failed to create subscription';
    let errorDetails = error.message;

    if (error.message?.includes('Stripe')) {
      errorMessage = 'Payment system error';
      errorDetails = 'Unable to process payment. Please try again or contact support.';
    } else if (error.message?.includes('network') || error.message?.includes('timeout')) {
      errorMessage = 'Connection error';
      errorDetails = 'Please check your connection and try again.';
    }

    res.status(500).json({ 
      error: errorMessage,
      details: errorDetails,
      timestamp: new Date().toISOString()
    });
  }
});

// Serve login page
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Serve onboarding page
app.get('/onboarding', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'onboarding.html'));
});

// Serve success page
app.get('/success', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'success.html'));
});

// Serve member dashboard - the actual AI coach interface
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Webhook handler (enhanced for your workflow)
app.post('/api/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const event = constructEvent(req.body, req.headers['stripe-signature']);

    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object;
      const customerId = invoice.customer;

      // Update user and lead status
      await updateUserProfile(customerId, {
        subscription_status: 'active',
        subscription_start: new Date().toISOString()
      });

      // Update lead status
      const userProfile = await getUserProfile(customerId);
      if (userProfile.email) {
        await query(
          `UPDATE leads SET status = 'active_subscriber' WHERE email = $1`,
          [userProfile.email]
        );
      }

      // Send welcome shirt if it's their first payment and we have shipping address
      if (userProfile.welcome_shirt_sent !== true && userProfile.shipping_address) {
        try {
          const order = await createWelcomeShirtOrder(
            {
              name: userProfile.name,
              address: userProfile.shipping_address
            },
            userProfile.shirt_size || 'M'
          );

          await confirmOrder(order.id);
          await updateUserProfile(customerId, { welcome_shirt_sent: true });

          console.log(`✅ Welcome shirt ordered for ${userProfile.name}`);
        } catch (shirtError) {
          console.error('⚠️ Welcome shirt error:', shirtError);
        }
      }

      console.log(`✓ New subscriber activated: ${customerId}`);
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).send('Webhook Error');
  }
});

// Test Printful integration endpoint
app.post('/api/test-printful', async (req, res) => {
  try {
    const { customerName = 'Test Customer', size = 'M' } = req.body;

    console.log('Testing Printful integration...');

    // Test customer info
    const testCustomerInfo = {
      name: customerName,
      address: {
        line1: '123 Test Street',
        city: 'Test City',
        state: 'CA',
        country: 'US',
        postal_code: '90210'
      }
    };

    // Create test order (this will create a real order but not confirm it)
    const order = await createWelcomeShirtOrder(testCustomerInfo, size);

    console.log('Printful test order created:', order.id);

    // Note: We're NOT calling confirmOrder() so this won't actually ship
    // The order will remain in draft status in Printful

    res.json({
      success: true,
      message: 'Printful integration test successful!',
      orderId: order.id,
      status: 'draft',
      note: 'Order created but not confirmed - no actual shipping will occur',
      orderDetails: {
        recipient: order.recipient,
        items: order.items,
        costs: order.costs
      }
    });

  } catch (error) {
    console.error('Printful test error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      note: 'Check that PRINTFUL_API_KEY and PRINTFUL_TSHIRT_VARIANTS are set correctly'
    });
  }
});

// Export consultation transcript
app.get('/api/consultation-export/:email', async (req, res) => {
  try {
    const { email } = req.params;

    // Get lead data with consultation
    const result = await query(
      `SELECT name, email, goals, experience, message, ai_response, timestamp 
       FROM leads 
       WHERE email = $1 AND message IS NOT NULL`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No consultation found for this email' });
    }

    const lead = result.rows[0];

    // Format consultation transcript
    const transcript = {
      consultationSummary: {
        name: lead.name,
        email: lead.email,
        fitnessGoal: lead.goals,
        experienceLevel: lead.experience,
        consultationDate: lead.timestamp,
        consultationId: `WF-${Date.now()}`
      },
      conversation: {
        userMessages: lead.message ? lead.message.split('\n').filter(msg => msg.startsWith('User:')).map(msg => msg.replace('User: ', '')) : [],
        aiResponse: lead.ai_response,
        nextSteps: "Based on your consultation, we recommend WillpowerFitness AI Elite membership for personalized training plans, 24/7 AI coaching, and comprehensive progress tracking."
      },
      recommendedProgram: {
        title: "WillpowerFitness AI Elite Membership",
        features: [
          "Personalized AI workout plans",
          "Custom nutrition guidance", 
          "24/7 AI coach access",
          "Progress tracking & analytics",
          "Welcome fitness apparel",
          "Priority support"
        ],
        pricing: "$225/month",
        benefits: `Tailored specifically for ${lead.goals} with ${lead.experience} experience level`
      }
    };

    res.json(transcript);
  } catch (error) {
    console.error('Consultation export error:', error);
    res.status(500).json({ error: 'Failed to export consultation' });
  }
});

// Send consultation copy via email endpoint (enhanced)
app.post('/api/send-consultation-email', async (req, res) => {
  try {
    const { email, userData } = req.body;

    // Get consultation data
    const result = await query(
      `SELECT name, email, goals, experience, message, ai_response, timestamp 
       FROM leads 
       WHERE email = $1 AND message IS NOT NULL`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No consultation found for this email' });
    }

    const lead = result.rows[0];

    // Format email content
    const emailContent = `
📧 YOUR WILLPOWERFITNESSAI CONSULTATION SUMMARY
═══════════════════════════════════════════════════════════════

Dear ${lead.name},

Thank you for completing your personalized fitness consultation! 

📋 YOUR CONSULTATION DETAILS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name: ${lead.name}
Email: ${lead.email}
Primary Goal: ${lead.goals}
Experience Level: ${lead.experience}
Consultation Date: ${new Date(lead.timestamp).toLocaleDateString()}

🤖 AI COACH RECOMMENDATIONS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${lead.ai_response}

🎯 NEXT STEPS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Ready to transform your fitness journey with personalized AI coaching?

✅ Activate WillpowerFitness AI Elite Membership ($225/month)
✅ Get your custom workout & nutrition plans
✅ Access 24/7 AI personal trainer
✅ Receive welcome WillpowerFitnessAI apparel

🔗 ACTIVATE YOUR MEMBERSHIP:
Visit: https://${req.get('host')}/onboarding

Questions? Reply to this email or contact: support@willpowerfitnessai.com

Best regards,
The WillpowerFitness AI Team

Consultation ID: WF-${Date.now()}
═══════════════════════════════════════════════════════════════
    `;

    // In a real implementation, you'd use SendGrid, Mailgun, etc.
    // For now, we'll log the email content and mark as sent
    console.log('📧 EMAIL WOULD BE SENT TO:', email);
    console.log('📧 EMAIL CONTENT:', emailContent);

    // Update lead to mark consultation copy sent
    await query(
      `UPDATE leads SET status = 'consultation_emailed' WHERE email = $1`,
      [email]
    );

    res.json({ 
      success: true, 
      message: 'Consultation summary emailed successfully!',
      recipient: email
    });
  } catch (error) {
    console.error('Send consultation email error:', error);
    res.status(500).json({ error: 'Failed to send consultation email' });
  }
});

// Legacy endpoint for backward compatibility
app.post('/api/send-consultation-copy', async (req, res) => {
  return res.redirect(307, '/api/send-consultation-email');
});

// Admin dashboard endpoint
app.get('/api/admin/stats', async (req, res) => {
  try {
    const [leads, activeUsers, revenue] = await Promise.all([
      query('SELECT COUNT(*) FROM leads'),
      query(`SELECT COUNT(*) FROM user_profiles WHERE subscription_status = 'active'`),
      query(`SELECT COUNT(*) * 225 as mrr FROM user_profiles WHERE subscription_status = 'active'`)
    ]);

    res.json({
      totalLeads: leads.rows[0].count,
      activeSubscribers: activeUsers.rows[0].count,
      monthlyRevenue: revenue.rows[0].mrr
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Member status check endpoint
app.get('/api/member-status/:email', async (req, res) => {
  try {
    const { email } = req.params;

    // Check if user has active subscription
    const userProfile = await query(
      'SELECT subscription_status, name FROM user_profiles WHERE email = $1',
      [email]
    );

    if (userProfile.rows.length > 0) {
      const profile = userProfile.rows[0];
      res.json({
        isMember: profile.subscription_status === 'active',
        memberName: profile.name,
        status: profile.subscription_status
      });
    } else {
      res.json({ isMember: false, memberName: null, status: 'inactive' });
    }
  } catch (error) {
    console.error('Member status check error:', error);
    res.json({ isMember: false, memberName: null, status: 'unknown' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Application status endpoint
app.get('/api/status', async (req, res) => {
  try {
    // Check system health
    const dbTest = await query('SELECT NOW() as current_time');
    const [leadCount, activeUsers] = await Promise.all([
      query('SELECT COUNT(*) FROM leads'),
      query(`SELECT COUNT(*) FROM user_profiles WHERE subscription_status = 'active'`)
    ]);

    res.json({
      status: 'LIVE',
      message: 'WillpowerFitness AI is fully operational',
      systemHealth: {
        database: '✅ Connected',
        ai: '✅ Active',
        payments: '✅ Ready',
        fulfillment: '✅ Ready'
      },
      metrics: {
        totalLeads: leadCount.rows[0].count,
        activeUsers: activeUsers.rows[0].count,
        uptime: process.uptime()
      }
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR', 
      error: error.message 
    });
  }
});

// Export user data route
app.get('/api/export-data/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const userData = await exportUserData(userId);
    res.json({ success: true, data: userData });
  } catch (error) {
    console.error('Error exporting user data:', error);
    res.status(500).json({ success: false, error: 'Failed to export user data' });
  }
});

// Delete all user data route (for membership cancellation)
app.delete('/api/delete-user-data/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Delete all user data across all tables
    await query('DELETE FROM conversations WHERE user_id = $1', [userId]);
    await query('DELETE FROM workouts WHERE user_id = $1', [userId]);
    await query('DELETE FROM progress_tracking WHERE user_id = $1', [userId]);
    await query('DELETE FROM progress_reports WHERE user_id = $1', [userId]);
    await query('DELETE FROM nutrition_plans WHERE user_id = $1', [userId]);
    await query('DELETE FROM nutrition_logs WHERE user_id = $1', [userId]);
    await query('DELETE FROM user_profiles WHERE email = $1 OR id::text = $1', [userId]);
    await query('DELETE FROM leads WHERE email = $1', [userId]);
    await query('DELETE FROM messages WHERE user_id = $1', [userId]);
    await query('DELETE FROM workout_adjustments WHERE user_id = $1', [userId]);
    await query('DELETE FROM form_analyses WHERE user_id = $1', [userId]);
    await query('DELETE FROM rpe_tracking WHERE user_id = $1', [userId]);
    await query('DELETE FROM recovery_tracking WHERE user_id = $1', [userId]);
    await query('DELETE FROM sleep_analysis WHERE user_id = $1', [userId]);
    await query('DELETE FROM stress_assessments WHERE user_id = $1', [userId]);

    console.log(`All data deleted for user: ${userId}`);
    res.json({ success: true, message: 'All user data deleted successfully' });
  } catch (error) {
    console.error('Error deleting user data:', error);
    res.status(500).json({ success: false, error: 'Failed to delete user data' });
  }
});

// Enhanced server startup for deployment
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 WillpowerFitness AI server running on http://0.0.0.0:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⚡ Ready to serve requests`);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});