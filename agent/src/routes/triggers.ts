import { Hono } from "hono";
import { getActiveTriggers } from "../utils/near-contract";

const app = new Hono();

/**
 * GET /api/triggers
 * Returns all active triggers from the TriggerPay contract.
 * Useful for the frontend to show what the agent is monitoring.
 */
app.get("/", async (c) => {
  try {
    const triggers = await getActiveTriggers();
    return c.json({ count: triggers.length, triggers });
  } catch (error) {
    console.error("Error fetching triggers:", error);
    return c.json({ error: "Failed to fetch active triggers" }, 500);
  }
});

export default app;
