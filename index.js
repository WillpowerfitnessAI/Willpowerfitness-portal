
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

// Basic route
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Willpower Fitness AI</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
          .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; }
          .chat-box { border: 1px solid #ddd; height: 400px; overflow-y: auto; padding: 10px; margin: 20px 0; }
          .message { margin: 10px 0; padding: 10px; border-radius: 5px; }
          .user { background: #007bff; color: white; text-align: right; }
          .ai { background: #f1f1f1; }
          input[type="text"] { width: 70%; padding: 10px; }
          button { padding: 10px 20px; background: #007bff; color: white; border: none; cursor: pointer; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🏋️ WillPower Fitness AI Assistant</h1>
            <p>Your 24/7 Personal Training Companion</p>
            <div id="chat-box" class="chat-box">
                <div class="message ai">Hi! I'm WillPower, your AI fitness coach. How can I help you reach your goals today?</div>
            </div>
            <div>
                <input type="text" id="user-input" placeholder="Ask me about workouts, nutrition, or your fitness goals..." />
                <button onclick="sendMessage()">Send</button>
            </div>
        </div>
        
        <script>
          async function sendMessage() {
            const input = document.getElementById('user-input');
            const chatBox = document.getElementById('chat-box');
            const message = input.value.trim();
            
            if (!message) return;
            
            // Add user message
            chatBox.innerHTML += '<div class="message user">' + message + '</div>';
            input.value = '';
            
            try {
              const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  message: message,
                  userId: 'demo-user' // In production, get from auth
                })
              });
              
              const data = await response.json();
              chatBox.innerHTML += '<div class="message ai">' + data.response + '</div>';
              chatBox.scrollTop = chatBox.scrollHeight;
            } catch (error) {
              chatBox.innerHTML += '<div class="message ai">Sorry, I had trouble responding. Please try again.</div>';
            }
          }
          
          document.getElementById('user-input').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') sendMessage();
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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Listen on 0.0.0.0 for deployment
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
