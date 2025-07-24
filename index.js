
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// Import AI and memory systems
import { getChatResponse, generateWorkoutPlan, analyzeNutrition, analyzeProgress } from './lib/aiProviders.js';
import { storeConversation, getConversationHistory, getUserProfile, updateUserProfile, logWorkout, getWorkoutHistory, exportUserData } from './lib/memorySystem.js';

// Import payment and fulfillment systems
import { createSubscription, createPaymentIntent, createCustomer, constructEvent } from './lib/stripePayments.js';
import { createWelcomeShirtOrder, confirmOrder } from './lib/printfulIntegration.js';

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
          .input-container {
            display: flex;
            gap: 20px;
            align-items: center;
            background: white;
            padding: 8px;
            border-radius: 30px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            border: 2px solid #e2e8f0;
            transition: border-color 0.3s, box-shadow 0.3s;
            flex-shrink: 0;
            margin-top: auto;
          }
          .input-container:focus-within {
            border-color: #667eea;
            box-shadow: 0 4px 25px rgba(102, 126, 234, 0.2);
          }
          input[type="text"] { 
            flex: 1;
            padding: 18px 25px;
            border: none;
            background: transparent;
            font-size: 16px;
            outline: none;
            font-family: inherit;
            color: #374151;
          }
          input[type="text"]::placeholder {
            color: #9ca3af;
          }
          button { 
            padding: 18px 35px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border: none;
            border-radius: 25px;
            cursor: pointer;
            font-weight: 600;
            font-size: 16px;
            transition: all 0.3s;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
          }
          button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
          }
          button:active {
            transform: translateY(0);
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
          
          @media (max-width: 768px) {
            .container { margin: 10px; height: 95vh; }
            .header { padding: 25px 20px; }
            .header h1 { font-size: 2.2rem; }
            .chat-container { padding: 20px; }
            .message { max-width: 95%; padding: 15px 20px; }
            .input-container { flex-direction: column; gap: 15px; }
            input[type="text"] { width: 100%; }
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
                <div id="chat-box" class="chat-box">
                    <div class="message ai">
                        Welcome to your premium AI fitness coaching experience. I'm your dedicated AI coach, equipped with advanced algorithms and personalized insights to help you achieve exceptional results. 
                        <br><br>
                        <strong>Premium Features Available:</strong>
                        <br>• Advanced workout plan generation
                        <br>• Detailed nutrition analysis 
                        <br>• Progress tracking & analytics
                        <br>• 24/7 expert guidance
                        <br><br>
                        How can I help you dominate your fitness goals today?
                    </div>
                </div>
                <div class="typing-indicator" id="typing-indicator">
                    AI Coach is thinking
                    <div class="typing-dots">
                        <span></span><span></span><span></span>
                    </div>
                </div>
                <div class="input-container">
                    <input type="text" id="user-input" placeholder="Ask about workouts, nutrition, or fitness goals..." />
                    <button id="send-btn">Send Message</button>
                </div>
            </div>
        </div>
        
        <script>
          // Global sendMessage function
          function sendMessage() {
            const input = document.getElementById('user-input');
            const chatBox = document.getElementById('chat-box');
            const typingIndicator = document.getElementById('typing-indicator');
            const message = input.value.trim();
            
            if (!message) return;
            
            // Add user message with animation
            const userMessage = document.createElement('div');
            userMessage.className = 'message user';
            userMessage.textContent = message;
            chatBox.appendChild(userMessage);
            input.value = '';
            
            // Show typing indicator
            typingIndicator.style.display = 'flex';
            chatBox.scrollTop = chatBox.scrollHeight;
            
            fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  message: message,
                  userId: 'premium@client.com'
                })
              })
              .then(response => response.json())
              .then(data => {
                // Hide typing indicator
                typingIndicator.style.display = 'none';
                
                // Add AI response with animation
                const aiMessage = document.createElement('div');
                aiMessage.className = 'message ai';
                aiMessage.innerHTML = data.response.replace(/\n/g, '<br>');
                chatBox.appendChild(aiMessage);
                chatBox.scrollTop = chatBox.scrollHeight;
              })
              .catch(error => {
                typingIndicator.style.display = 'none';
                const errorMessage = document.createElement('div');
                errorMessage.className = 'message ai';
                errorMessage.innerHTML = '<strong>⚠️ Service Temporarily Unavailable</strong><br>Our premium AI coaching service is experiencing high demand. Please try again in a moment.';
                chatBox.appendChild(errorMessage);
                chatBox.scrollTop = chatBox.scrollHeight;
              });
          }
          
          // Wait for DOM to be fully loaded before adding event listeners
          document.addEventListener('DOMContentLoaded', function() {
            // Add send button event listener
            const sendBtn = document.getElementById('send-btn');
            const userInput = document.getElementById('user-input');
            
            if (sendBtn) {
              sendBtn.addEventListener('click', sendMessage);
            }
            
            if (userInput) {
              userInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  sendMessage();
                }
              });
              
              // Auto-focus input
              userInput.focus();
            }
          });
        </script>
    </body>
    </html>
  `);
});

// Chat endpoint using Groq for fast responses
app.post('/api/chat', async (req, res) => {
  try {
    const { message, userId } = req.body;
    
    if (!message || !userId) {
      return res.status(400).json({ error: 'Message and userId required' });
    }

    // Get user context for personalized responses
    const userProfile = await getUserProfile(userId);
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
    
    // Save lead to database
    const result = await query(
      `INSERT INTO leads (name, email, phone, goals, experience, status, source) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       ON CONFLICT (email) DO UPDATE SET 
       name = $1, phone = $3, goals = $4, experience = $5, status = $6
       RETURNING *`,
      [name, email, phone, goal, experience, 'onboarding', 'website']
    );

    res.json({ success: true, leadId: result.rows[0].id });
  } catch (error) {
    console.error('Onboarding Step 1 error:', error);
    res.status(500).json({ error: 'Failed to save information' });
  }
});

// AI Consultation endpoint
app.post('/api/consultation', async (req, res) => {
  try {
    const { message, userData } = req.body;
    
    // Use AI for consultation
    const consultationPrompt = {
      role: "system",
      content: `You are conducting a fitness consultation for ${userData.name}. Their goal is ${userData.goal} and they have ${userData.experience} experience. Ask follow-up questions to understand their schedule, equipment access, injuries, and preferences. After 3-4 exchanges, conclude the consultation and indicate completion.`
    };

    const aiResponse = await getChatResponse([
      consultationPrompt,
      { role: "user", content: message }
    ], userData);

    // Determine if consultation is complete (simple logic)
    const consultationComplete = message.toLowerCase().includes('ready') || 
                                message.toLowerCase().includes('sounds good') ||
                                aiResponse.toLowerCase().includes('perfect') ||
                                aiResponse.toLowerCase().includes('ready to start');

    // Update lead with consultation info
    await query(
      `UPDATE leads SET 
       message = COALESCE(message, '') || $1 || E'\n',
       ai_response = $2,
       status = $3
       WHERE email = $4`,
      [
        `User: ${message}`, 
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
    const { email, name, priceId, userData } = req.body;
    
    // Create Stripe customer
    const customer = await createCustomer(email, name, {
      fitness_goal: userData.goal,
      experience_level: userData.experience,
      phone: userData.phone
    });

    // Create subscription
    const subscription = await createSubscription(customer.id, priceId || 'price_elite_225');

    // Update lead status
    await query(
      `UPDATE leads SET 
       status = 'payment_pending',
       payment_link = $1
       WHERE email = $2`,
      [`subscription_${subscription.subscriptionId}`, email]
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

    res.json({
      customerId: customer.id,
      subscriptionId: subscription.subscriptionId,
      clientSecret: subscription.clientSecret,
      checkoutUrl: `https://checkout.stripe.com/pay/${subscription.clientSecret}`
    });
  } catch (error) {
    console.error('Subscription creation error:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

// Serve onboarding page
app.get('/onboarding', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'onboarding.html'));
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
