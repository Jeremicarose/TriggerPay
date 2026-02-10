import { Hono } from "hono";
import { agentAccountId, agent } from "@neardefi/shade-agent-js";

const app = new Hono();

/**
 * GET /api/agent-account
 * Returns the agent's NEAR account ID and balance.
 */
app.get("/", async (c) => {
  try {
    const accountId = await agentAccountId();
    const balance = await agent("getBalance");

    return c.json({
      accountId: accountId.accountId,
      balance: balance.balance,
    });
  } catch (error) {
    console.error("Error getting agent account:", error);
    return c.json({ error: "Failed to get agent account" }, 500);
  }
});

export default app;
