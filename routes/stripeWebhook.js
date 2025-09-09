// routes/stripeWebhook.js
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Handler expects a RAW Buffer (not parsed JSON).
 * server.js mounts it with express.raw({ type: "application/json" }).
 */
export function stripeWebhook(req, res) {
  const signature = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,                                // raw Buffer from express.raw
      signature,
      process.env.STRIPE_WEBHOOK_SECRET        // whsec_... from Stripe dashboard
    );
  } catch (err) {
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  // Handle events you care about
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        // TODO: create/confirm account, mark membership active in your DB here
        break;
      }
      case "invoice.payment_failed": {
        // TODO: email user / flag the account
        break;
      }
      case "customer.subscription.deleted": {
        // TODO: mark membership inactive
        break;
      }
      default:
        // ignore unhandled types
        break;
    }
  } catch (err) {
    return res.status(500).send(`Handler error: ${err.message}`);
  }

  return res.json({ received: true });
}
