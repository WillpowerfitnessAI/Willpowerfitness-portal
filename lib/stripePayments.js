import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Create subscription for fitness coaching
export async function createSubscription(customerId, priceId) {
  try {
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    });

    return {
      subscriptionId: subscription.id,
      clientSecret: subscription.latest_invoice.payment_intent.client_secret,
    };
  } catch (error) {
    console.error('Stripe subscription error:', error);
    throw error;
  }
}

// Create one-time payment for premium features
export async function createPaymentIntent(amount, currency = 'usd', metadata = {}) {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // Convert to cents
      currency,
      metadata,
      automatic_payment_methods: { enabled: true },
    });

    return paymentIntent;
  } catch (error) {
    console.error('Stripe payment intent error:', error);
    throw error;
  }
}

// Create customer
export async function createCustomer(email, name, metadata = {}) {
  try {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata,
    });

    return customer;
  } catch (error) {
    console.error('Stripe customer creation error:', error);
    throw error;
  }
}

// Create checkout session for subscription
export async function createCheckoutSession(customerId, email, userData) {
  try {
    // Use custom domain for production
    const domain = 'https://app.willpowerfitnessai.com';

    console.log('Creating checkout session with domain:', domain);

    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('Stripe secret key not configured');
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'WillpowerFitness AI Elite Membership',
            description: 'Premium AI Personal Training & Nutrition Coaching - 7-Day Free Trial',
            images: ['https://via.placeholder.com/400x300/667eea/ffffff?text=WillpowerFitness+AI']
          },
          unit_amount: 22500, // $225.00
          recurring: {
            interval: 'month'
          }
        },
        quantity: 1
      }],
      subscription_data: {
        trial_period_days: 7,
        trial_settings: {
          end_behavior: {
            missing_payment_method: 'pause'
          }
        }
      },
      mode: 'subscription',
      success_url: `${domain}/success?session_id={CHECKOUT_SESSION_ID}&customer_id=${customerId}&email=${encodeURIComponent(email)}`,
      cancel_url: `${domain}/onboarding?cancelled=true`,
      metadata: {
        user_goal: userData.goal,
        user_experience: userData.experience,
        user_email: email,
        customer_id: customerId
      },
      billing_address_collection: 'required',
      custom_text: {
        submit: {
          message: 'Start your 7-day FREE trial now! Your AI personal trainer activates immediately - no charges for 7 days.'
        }
      },
      allow_promotion_codes: true,
      automatic_tax: {
        enabled: false,
      }
    });

    return session;
  } catch (error) {
    console.error('Stripe checkout session error:', error);
    throw error;
  }
}

// Handle webhook events
export function constructEvent(body, signature) {
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  return stripe.webhooks.constructEvent(body, signature, endpointSecret);
}