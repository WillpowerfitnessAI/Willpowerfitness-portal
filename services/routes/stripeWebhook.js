// routes/stripeWebhook.js
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * This handler expects a RAW body (Buffer), not parsed JSON.
 * Your server.js mounts it with express.raw({ type: "application/json" }).
 */
export function stripeWebhook(req, res) {
  const signature = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,                              // raw Buffer provided by express.raw
      signature,
      process.env.STRIPE_WEBHOOK_SECRET      // whsec_... from Stripe Workbench
    );
  } catch (err) {
    // Signature validation failed
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  // Handle the events you care about
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        // TODO: If desired, look up the customer/session and mark membership active in Supabase here.
        // Example: session.customer, session.customer_email, session.subscription, etc.
        break;
      }
      case "invoice.payment_failed": {
        // optional: notify or flag the account
        break;
      }
      case "customer.subscription.deleted": {
        // optional: mark membership inactive
        break;
      }
      default:
        // Ignore unhandled types
        break;
    }
  } catch (err) {
    // Your business logic threw an error
    return res.status(500).send(`Handler error: ${err.message}`);
  }

  // Acknowledge receipt
  return res.json({ received: true });
}
