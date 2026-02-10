import { Hono } from "hono";
import { getEvmAdapter, DERIVATION_PATHS } from "../utils/ethereum";

const app = new Hono();

/**
 * GET /api/eth-account?chain=Ethereum
 * Returns the derived EVM address and balance for the agent on a given chain.
 * This is the address that holds funds for payouts.
 */
app.get("/", async (c) => {
  const chain = c.req.query("chain") || "Ethereum";
  const contractId = process.env.NEXT_PUBLIC_contractId;

  if (!contractId) {
    return c.json({ error: "Contract ID not configured" }, 500);
  }

  try {
    const evm = getEvmAdapter(chain);
    const path = DERIVATION_PATHS[chain] || DERIVATION_PATHS.Ethereum;

    const { address } = await evm.deriveAddressAndPublicKey(contractId, path);
    const { balance } = await evm.getBalance(address);

    return c.json({ address, balance: Number(balance), chain });
  } catch (error) {
    console.error("Error getting ETH account:", error);
    return c.json({ error: "Failed to get derived ETH account" }, 500);
  }
});

export default app;
