import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// Import AI and memory systems
import { getChatResponse, generateWorkoutPlan, analyzeNutrition, analyzeProgress } from './lib/aiProviders.js';
import { storeConversation, getConversationHistory, getUserProfile, updateUserProfile, logWorkout, getWorkoutHistory, exportUserData } from './lib/memorySystem.js';

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
            .container { margin: 10px; height: 95vh; }
            .header { padding: 25px 20px; }
            .header h1 { font-size: 2.2rem; }
            .chat-container { padding: 20px; }
            .message { max-width: 95%; padding: 15px 20px; }

            button { width: 100%; }
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
                                <div class="feature-icon">🎯</div>
                                <h3>Personalized Plans</h3>
                                <p>Custom workout and nutrition plans designed for your specific goals and lifestyle.</p>
                            </div>
                            <div class="feature-card">
                                <div class="feature-icon">🤖</div>
                                <h3>24/7 AI Coach</h3>
                                <p>Your dedicated AI personal trainer available whenever you need guidance or motivation.</p>
                            </div>
                            <div class="feature-card">
                                <div class="feature-icon">📊</div>
                                <h3>Progress Tracking</h3>
                                <p>Advanced analytics to monitor your progress and optimize your training approach.</p>
                            </div>
                            <div class="feature-card">
                                <div class="feature-icon">👕</div>
                                <h3>Welcome Gear</h3>
                                <p>Complimentary WillpowerFitnessAI apparel to kickstart your journey in style.</p>
                            </div>
                        </div>

                        <a href="/onboarding" class="cta-button">Start Your Free Consultation</a>

                        <p style="margin-top: 20px; color: #6b7280; font-size: 0.9rem;">
                            Begin with a personalized consultation to unlock your elite fitness coaching experience.
                        </p>
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

// Chat endpoint - restricted to paying members only
app.post('/api/chat', async (req, res) => {
  try {
    const { message, userId } = req.body;

    if (!message || !userId) {
      return res.status(400).json({ error: 'Message and userId required' });
    }

    // Check if user has active subscription
    const userProfile = await getUserProfile(userId);

    if (!userProfile || userProfile.subscription_status !== 'active') {
      return res.json({ 
        response: "🔒 **Premium Feature Access Required**\n\nTo access your personal AI fitness coach and receive detailed workout plans, nutrition guidance, and 24/7 support, please upgrade to WillpowerFitness AI Elite membership.\n\n**Elite Benefits:**\n• Personalized workout plans\n• Advanced nutrition coaching\n• Real-time form feedback\n• Progress analytics\n• Welcome fitness apparel\n• Priority support\n\n[Start your consultation](/onboarding) to begin your fitness journey!",
        requiresUpgrade: true
      });
    }

    // Get user context for personalized responses
    const recentHistory = await getConversationHistory(userId, 5);

    // Prepare context for AI
    const context = {
      profile: userProfile,
      recentConversations: recentHistory.length
    };

    // Get fast response from Groq
    const messages = recentHistory.map(conv => [
      { role: 'user', content: conv.user_message },
      { role: 'assistant', content: conv.ai_response }
    ]).flat();

    messages.push({ role: 'user', content: message });

    const aiResponse = await getChatResponse(messages, context);

    if (!aiResponse || aiResponse.trim() === '') {
      throw new Error('Empty response from AI');
    }

    // Store conversation in memory
    await storeConversation(userId, message, aiResponse, context);

    res.json({ response: aiResponse });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process chat message' });
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

// Export user data endpoint
app.get('/api/export/:userId', async (req, res) => {
  try {
    const userData = await exportUserData(req.params.userId);
    res.json(userData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to export data' });
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

          console.log(`Welcome t-shirt ordered for customer ${customerId}`);
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

// Serve onboarding page
app.get('/onboarding', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'onboarding.html'));
});

// Serve success page
app.get('/success', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'success.html'));
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

          console.log(`✓ Welcome shirt ordered for ${userProfile.name}`);
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

// Send consultation copy via email endpoint
app.post('/api/send-consultation-copy', async (req, res) => {
  try {
    const { email } = req.body;

    // Get consultation data
    const response = await fetch(`${req.protocol}://${req.get('host')}/api/consultation-export/${email}`);
    const consultationData = await response.json();

    if (!response.ok) {
      return res.status(404).json({ error: 'Consultation not found' });
    }

    // Here you would integrate with your email service (SendGrid, etc.)
    // For now, we'll just return the data that would be emailed
    const emailContent = {
      to: email,
      subject: `Your WillpowerFitness AI Consultation Summary - ${consultationData.consultationSummary.consultationId}`,
      content: consultationData,
      message: "Thank you for your consultation! Here's a summary of our conversation and next steps to transform your fitness journey."
    };

    // Update lead to mark consultation copy sent
    await query(
      `UPDATE leads SET status = 'consultation_copy_sent' WHERE email = $1`,
      [email]
    );

    res.json({ 
      success: true, 
      message: 'Consultation copy prepared',
      emailContent 
    });
  } catch (error) {
    console.error('Send consultation copy error:', error);
    res.status(500).json({ error: 'Failed to send consultation copy' });
  }
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