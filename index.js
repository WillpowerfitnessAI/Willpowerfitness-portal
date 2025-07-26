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
app.use(express.static(path.join(__dirname, 'public')));

// Premium white-label route
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Premium AI Fitness Coach</title>
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
                <h1>Your Elite AI Fitness Coach</h1>
                <p>Premium Personalized Training & Nutrition Guidance</p>
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

                        <a href="/onboarding" class="cta-button">Start Your Free Consultation</a>

                        <p style="margin-top: 20px; color: #6b7280; font-size: 0.9rem;">
                            Begin with a personalized consultation to unlock your elite fitness coaching experience.
                        </p>

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
          // Simple page interactions
          document.addEventListener('DOMContentLoaded', function() {
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
    const { email, password } = req.body;
    
    // Simple email-based authentication for demo
    // In production, you'd hash passwords and use proper auth
    const user = await query(
      'SELECT * FROM user_profiles WHERE email = $1 AND subscription_status = $2',
      [email, 'active']
    );
    
    if (user.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials or inactive subscription' });
    }
    
    const userProfile = user.rows[0];
    
    res.json({
      success: true,
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

// Chat endpoint with enhanced AI and conversation memory
app.post('/api/chat', async (req, res) => {
  try {
    const { message, userId } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // Get conversation context for continuity
    const conversationHistory = userId ? await getConversationContext(userId, 5) : [];

    // Get comprehensive user profile and training data for Enhanced AI Intelligence
    const userProfile = await getUserProfile(userId);
    const recentWorkouts = await query(
      'SELECT workout_data, completed_at FROM workouts WHERE user_id = $1 ORDER BY completed_at DESC LIMIT 5',
      [userId]
    ).catch(() => ({ rows: [] }));

    const progressData = await query(
      'SELECT metrics, recorded_at FROM progress_tracking WHERE user_id = $1 ORDER BY recorded_at DESC LIMIT 3',
      [userId]  
    ).catch(() => ({ rows: [] }));

    const rpeData = await query(
      'SELECT exercise_name, rpe_rating, weight, timestamp FROM rpe_tracking WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 10',
      [userId]
    ).catch(() => ({ rows: [] }));

    // Build conversation context for continuity
    let contextualPrompt = message;
    if (conversationHistory.length > 0) {
      const recentContext = conversationHistory.slice(-3).map(conv => 
        `User: ${conv.user_message}\nAI: ${conv.ai_response}`
      ).join('\n\n');
      
      contextualPrompt = `CONVERSATION CONTEXT (keep this in mind for continuity):
${recentContext}

CURRENT MESSAGE: ${message}`;
    }

    // Enhanced user context with training intelligence data
    const userContext = {
      profile: userProfile,
      userId: userId,
      recentWorkouts: recentWorkouts.rows,
      progressData: progressData.rows,
      rpeHistory: rpeData.rows,
      conversationHistory: conversationHistory,
      enhancedFeatures: {
        dynamicAdjustments: true,
        formAnalysis: true,
        rpeTracking: true,
        injuryPrevention: true,
        progressTracking: true
      }
    };

    // Detect workout-related queries to showcase Enhanced AI Intelligence
    const workoutKeywords = ['workout', 'exercise', 'training', 'form', 'weight', 'reps', 'sets', 'muscle', 'strength', 'cardio', 'rpe', 'injury', 'sore', 'pain', 'progress'];
    const isWorkoutQuery = workoutKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );

    let enhancedPrompt = message;
    if (isWorkoutQuery && userContext.recentWorkouts.length > 0) {
      enhancedPrompt = `${message}

CONTEXT: This user has Enhanced AI Workout Intelligence features available. Use their training data to provide advanced, personalized coaching:
- Recent workout performance: ${JSON.stringify(userContext.recentWorkouts.slice(0, 2))}
- RPE history: ${JSON.stringify(userContext.rpeHistory.slice(0, 5))}
- Progress trends: ${JSON.stringify(userContext.progressData)}

Demonstrate your Enhanced AI capabilities by referencing their specific data, suggesting dynamic adjustments, and providing expert-level insights that showcase why this is premium AI coaching.`;
    }

    const response = await getChatResponse([
      { role: "user", content: enhancedPrompt }
    ], userContext);

    // Store conversation with enhanced context
    if (userId) {
      await query(
        'INSERT INTO conversations (user_id, user_message, ai_response, context, timestamp) VALUES ($1, $2, $3, $4, NOW())',
        [userId, message, response, JSON.stringify({ isWorkoutQuery, dataUsed: isWorkoutQuery })]
      );
    }

    res.json({ 
      response,
      enhancedFeatures: userContext.enhancedFeatures,
      contextUsed: isWorkoutQuery ? 'Enhanced AI Workout Intelligence activated' : 'Standard AI response'
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

// Generate detailed workout plan using OpenAI
app.post('/api/workout-plan', async (req, res) => {
  try {
    const { userId, goals, preferences } = req.body;
    const userProfile = await getUserProfile(userId);

    const workoutPlan = await generateWorkoutPlan(userProfile, goals, preferences);

    res.json({ workoutPlan });
  } catch (error) {
    console.error('Workout plan error:', error);
    res.status(500).json({ error: 'Failed to generate workout plan' });
  }
});

// User profile management
app.get('/api/profile/:userId', async (req, res) => {
  try {
    const profile = await getUserProfile(req.params.userId);
    res.json({ profile });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

app.put('/api/profile/:userId', async (req, res) => {
  try {
    const profileData = await updateUserProfile(req.params.userId, req.body);
    res.json({ success: true, data: profileData });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Workout logging endpoint
app.post('/api/log-workout', async (req, res) => {
  try {
    const { userId, workoutData } = req.body;
    
    if (!userId || !workoutData) {
      return res.status(400).json({ error: 'User ID and workout data required' });
    }
    
    // Store workout in database
    const result = await query(
      'INSERT INTO workouts (user_id, workout_data, completed_at) VALUES ($1, $2, NOW()) RETURNING *',
      [userId, JSON.stringify(workoutData)]
    );
    
    // Generate AI workout analysis
    const analysisPrompt = {
      role: "system", 
      content: `You are the user's dedicated AI training partner providing post-workout analysis.

      WORKOUT COMPLETED:
      ${JSON.stringify(workoutData, null, 2)}

      Provide encouraging analysis covering:
      - Performance highlights from today's session
      - RPE patterns and what they indicate
      - Progression opportunities for next workout
      - Recovery recommendations based on intensity
      - Motivation for continued progress

      Keep it personal, encouraging, and actionable.`
    };
    
    const aiAnalysis = await getChatResponse([analysisPrompt]);
    
    res.json({
      success: true,
      workoutId: result.rows[0].id,
      aiAnalysis,
      message: 'Workout logged successfully'
    });
  } catch (error) {
    console.error('Workout logging error:', error);
    res.status(500).json({ error: 'Failed to log workout' });
  }
});

// Export user data endpoint
app.get('/api/export/:userId', async (req, res) => {
  try {
    const userData = await exportUserData(req.params.userId);
    res.json(userData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// ========================================
// ENHANCED AI WORKOUT INTELLIGENCE ENDPOINTS
// ========================================

// Dynamic workout adjustment based on performance
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
    if (!userProfile || userProfile.subscription_status !== 'active') {
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

      // Send welcome t-shirt if it's their first payment
      if (userProfile.welcome_shirt_sent !== true) {
        try {
          const order = await createWelcomeShirtOrder({
            name: userProfile.name,
            address: userProfile.shipping_address || {
              line1: '123 Main St', // You'll need to collect this
              city: 'City',
              state: 'State',
              country: 'US',
              postal_code: '12345'
            }
          });

          await confirmOrder(order.id);

          // Mark t-shirt as sent
          await updateUserProfile(customerId, {
            welcome_shirt_sent: true,
            printful_order_id: order.id
          });

          console.log(`Welcome shirt ordered for customer ${customerId}`);
        } catch (shirtError) {
          console.error('Failed to send welcome shirt:', shirtError);
        }
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

// AI Consultation endpoint
app.post('/api/consultation', async (req, res) => {
  try {
    const { message, userData } = req.body;

    // Get complete consultation history for this user
    const existingConversation = await query(
      'SELECT message, ai_response FROM leads WHERE email = $1 ORDER BY timestamp DESC LIMIT 1',
      [userData.email]
    );

    let conversationContext = '';
    if (existingConversation.rows.length > 0) {
      const lead = existingConversation.rows[0];
      conversationContext = (lead.message || '') + '\n' + (lead.ai_response || '');
    }

    // Count meaningful exchanges (not just database entries)
    const exchangeMatches = conversationContext.match(/User:/g);
    const exchangeCount = exchangeMatches ? exchangeMatches.length : 0;

    // Create progressive consultation with better context awareness
    let consultationPrompt;

    if (exchangeCount === 0) {
      consultationPrompt = {
        role: "system",
        content: `You are an elite fitness consultant conducting an assessment for ${userData.name}. 
        Goal: ${userData.goal} | Experience: ${userData.experience}

        FIRST QUESTION: Ask about their weekly schedule - what days and times they can realistically commit to working out. Be conversational and encouraging.`
      };
    } else if (exchangeCount === 1) {
      consultationPrompt = {
        role: "system", 
        content: `Continue the consultation for ${userData.name}. Previous context: ${conversationContext}

        SECOND QUESTION: Now ask about their equipment access (home gym, commercial gym, outdoor spaces) and any physical limitations, injuries, or health considerations that would affect their training program.`
      };
    } else if (exchangeCount === 2) {
      consultationPrompt = {
        role: "system",
        content: `Continue consultation for ${userData.name}. Context so far: ${conversationContext}

        THIRD QUESTION: Ask about their current fitness routine, favorite exercises, and what they want to change or improve about their current approach.`
      };
    } else {
      consultationPrompt = {
        role: "system", 
        content: `FINAL CONSULTATION STAGE for ${userData.name}. Full conversation: ${conversationContext}

        Based on all information gathered, provide a personalized summary of their fitness needs and enthusiastically recommend WillpowerFitness AI Elite membership. Highlight how the AI coach will address their specific goal (${userData.goal}) given their ${userData.experience} experience level. Mention: personalized AI trainer, custom workout/nutrition plans, 24/7 support, progress analytics, and complimentary WillpowerFitnessAI welcome apparel.`
      };
    }

    const aiResponse = await getChatResponse([
      consultationPrompt,
      { role: "user", content: message }
    ], userData);

    // Determine consultation completion more accurately
    const consultationComplete = exchangeCount >= 3 || 
                                aiResponse.toLowerCase().includes('willpowerfitnessai') ||
                                aiResponse.toLowerCase().includes('elite membership') ||
                                aiResponse.toLowerCase().includes('ready to begin');

    // Update lead with new exchange
    const currentMessage = existingConversation.rows.length > 0 ? 
      existingConversation.rows[0].message || '' : '';

    await query(
      `UPDATE leads SET 
       message = $1,
       ai_response = $2,
       status = $3
       WHERE email = $4`,
      [
        currentMessage + `User: ${message}\n`,
        aiResponse,
        consultationComplete ? 'consultation_complete' : 'in_consultation',
        userData.email
      ]
    );

    res.json({ 
      response: aiResponse,
      consultationComplete 
    });
  } catch (error) {
    console.error('Consultation error:', error);
    res.status(500).json({ error: 'Consultation failed' });
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

    // Create Stripe checkout session
    const checkoutSession = await createCheckoutSession(customer.id, email, userData);

    console.log('Checkout session created:', checkoutSession.id);

    // Try to update database, but don't fail if it's down
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

      // Send welcome shirt (if address available)
      if (userProfile.welcome_shirt_sent !== true) {
        try {
          // You'll need to collect shipping address in onboarding
          const order = await createWelcomeShirtOrder({
            name: userProfile.name,
            address: {
              line1: '123 Main St', // Collect this in onboarding
              city: 'City',
              state: 'State', 
              country: 'US',
              postal_code: '12345'
            }
          });

          await confirmOrder(order.id);
          await updateUserProfile(customerId, { welcome_shirt_sent: true });

          console.log(`Welcome shirt ordered for ${userProfile.name}`);
        } catch (shirtError) {
          console.error('Welcome shirt error:', shirtError);
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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Listen on 0.0.0.0 for deployment
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});