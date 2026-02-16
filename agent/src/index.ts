import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import dotenv from "dotenv";

// Load env — .env.development.local overrides .env (dotenv won't overwrite existing vars)
dotenv.config({ path: ".env.development.local" });
dotenv.config(); // fallback to .env

// Import routes
import agentAccount from "./routes/agentAccount";
import ethAccount from "./routes/ethAccount";
import triggers from "./routes/triggers";
import monitor from "./routes/monitor";

const app = new Hono();

app.use(cors());

// Health check
app.get("/", (c) =>
  c.json({
    name: "TriggerPay Shade Agent",
    status: "running",
    version: "1.0.0",
  })
);

// Routes
app.route("/api/agent-account", agentAccount);
app.route("/api/eth-account", ethAccount);
app.route("/api/triggers", triggers);
app.route("/api/monitor", monitor);

// Start the server
const port = Number(process.env.PORT || "3001");

console.log("========================================");
console.log("  TriggerPay Shade Agent");
console.log("========================================");
console.log(`Server running on port ${port}`);
console.log(`Contract: ${process.env.TRIGGERPAY_CONTRACT_ID || "triggerpay.testnet"}`);
console.log(`Flight API: ${process.env.FLIGHT_API_URL || "http://localhost:3000"}`);
console.log("");

serve({ fetch: app.fetch, port });

// Polling loop — periodically checks triggers
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL_MS || "15000", 10);

async function poll() {
  try {
    const res = await fetch(`http://localhost:${port}/api/monitor`);
    const data = await res.json();

    if (data.results && data.results.length > 0) {
      for (const r of data.results as any[]) {
        const icon = r.conditionMet ? "!!!" : "  ";
        console.log(
          `[poll] ${icon} ${r.triggerId} | ${r.flight}: ${r.flightStatus} | action=${r.action}${r.txHash ? ` | tx=${r.txHash}` : ""}`
        );
      }
    } else if (data.message) {
      console.log(`[poll] ${data.message}`);
    }
  } catch (err) {
    console.error("[poll] Error:", err);
  }
}

// Start polling after a short delay to let the server start
setTimeout(() => {
  console.log(`[poll] Starting monitor loop (every ${POLL_INTERVAL / 1000}s)`);
  poll();
  setInterval(poll, POLL_INTERVAL);
}, 2000);
