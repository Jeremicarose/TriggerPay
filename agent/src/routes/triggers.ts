import { Hono } from "hono";
import {
  createTrigger,
  getTriggers,
  getTrigger,
  deleteTrigger,
  getStats,
  type Trigger,
} from "../utils/trigger-store";

const app = new Hono();

/**
 * GET /api/triggers
 * List all triggers. Optionally filter by owner with ?owner=alice.testnet
 * The frontend calls this to populate the dashboard.
 */
app.get("/", async (c) => {
  const owner = c.req.query("owner");
  const triggers = getTriggers(owner || undefined);
  return c.json(triggers);
});

/**
 * GET /api/triggers/stats
 * Returns { total, active, executed } for the header stats display.
 */
app.get("/stats", async (c) => {
  const stats = getStats();
  return c.json([stats.total, stats.active, stats.executed]);
});

/**
 * GET /api/triggers/:id
 * Get a single trigger by ID.
 */
app.get("/:id", async (c) => {
  const trigger = getTrigger(c.req.param("id"));
  if (!trigger) {
    return c.json({ error: "Trigger not found" }, 404);
  }
  return c.json(trigger);
});

/**
 * POST /api/triggers
 * Create a new trigger. Body:
 * {
 *   "owner": "alice.testnet",
 *   "condition": { "condition_type": "FlightCancellation", "flight_number": "AA1234", "flight_date": "2026-02-15" },
 *   "payout": { "amount": "500000000000000000", "token": "ETH", "address": "0x...", "chain": "Ethereum" }
 * }
 */
app.post("/", async (c) => {
  let body: {
    owner?: string;
    condition?: Trigger["condition"];
    payout?: Trigger["payout"];
  };

  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }

  if (!body.owner || !body.condition || !body.payout) {
    return c.json({ error: "Missing owner, condition, or payout" }, 400);
  }

  // Validate
  if (!body.condition.flight_number || !body.condition.flight_date) {
    return c.json({ error: "Missing flight_number or flight_date" }, 400);
  }
  if (!body.payout.address?.startsWith("0x") || body.payout.address.length !== 42) {
    return c.json({ error: "Invalid EVM payout address" }, 400);
  }

  const trigger = createTrigger({
    owner: body.owner,
    condition: body.condition,
    payout: body.payout,
  });

  console.log(
    `[triggers] Created ${trigger.id} for ${trigger.condition.flight_number} by ${trigger.owner}`
  );

  return c.json(trigger, 201);
});

/**
 * DELETE /api/triggers/:id
 * Cancel a trigger (remove it).
 */
app.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const deleted = deleteTrigger(id);

  if (!deleted) {
    return c.json({ error: "Trigger not found" }, 404);
  }

  console.log(`[triggers] Deleted ${id}`);
  return c.json({ success: true, id });
});

export default app;
