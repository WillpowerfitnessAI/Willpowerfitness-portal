// /routes/stripeWebhook.js
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Small helper to keep logs consistent and avoid sensitive data
function log(ev, msg, extra = {}) {
  // ev may be undefined on signature errors; guard it
  const base = ev
    ? {
        event_id: ev.id,
        type: ev.type,
        created: ev.created,
      }
    : {};
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      src: "stripeWebhook",
      msg,
      ...base,
      ...extra,
    })
  );
}

export function stripeWebhook(req, res) {
  const signature = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,              // raw Buffer provided by express.raw
      signature,
      process.env.STRIPE_WEBHOOK_SECRET // whsec_... from Stripe Workbench/Dashboard
    );
    log(event, "Signature verified");
  } catch (err) {
    // Signature validation failed — return 400 so Stripe retries
    console.error("stripeWebhook signature error:", err.message);
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        log(event, "Checkout completed", {
          session_id: session.id,
          customer: session.customer,
          subscription: session.subscription,
          mode: session.mode,
        });
        // TODO: create/confirm account, mark membership active in your DB here
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        log(event, "Invoice payment failed", {
          customer: invoice.customer,
          subscription: invoice.subscription,
          attempt_count: invoice.attempt_count,
        });
        // TODO: email user / flag the account
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        log(event, "Subscription deleted", {
          subscription: sub.id,
          customer: sub.customer,
          status: sub.status,
          cancel_at: sub.cancel_at,
        });
        // TODO: mark membership inactive
        break;
      }

      default: {
        // Keep noise low but still track unknown events
        log(event, "Unhandled event type");
        break;
      }
    }
  } catch (err) {
    // Your own handler logic threw an error
    console.error("stripeWebhook handler error:", err.message);
    return res.status(500).send(`Handler error: ${err.message}`);
  }

  return res.json({ received: true });
}

