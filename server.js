import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { stripeWebhook } from "./routes/stripeWebhook.js";

dotenv.config();

const app = express();

// Stripe webhook route MUST use raw body, not JSON
app.post(
  "/api/webhooks/stripe",
  express.raw({ type: "application/json" }),
  stripeWebhook
);

// All other routes can use JSON normally
app.use(express.json());
app.use(cors());

// Simple health check
app.get("/health", (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`API listening on ${PORT}`);
});
