import { Hono } from "hono";
import { requestSignature } from "@neardefi/shade-agent-js";
import { getEvmAdapter, DERIVATION_PATHS } from "../utils/ethereum";
import {
  getActiveTriggers,
  markExecuted,
  incrementAttestationCount,
  type Trigger,
} from "../utils/trigger-store";
import { getFlightStatus, isConditionMet } from "../utils/flight-api";
import { utils } from "chainsig.js";
const { toRSV, uint8ArrayToHex } = utils.cryptography;

const app = new Hono();

// In-memory log of recent monitoring activity (visible in demo terminal)
const recentActivity: Array<{
  timestamp: string;
  triggerId: string;
  flight: string;
  status: string;
  conditionMet: boolean;
  txHash?: string;
}> = [];

function logActivity(entry: (typeof recentActivity)[0]) {
  recentActivity.unshift(entry);
  if (recentActivity.length > 50) recentActivity.pop();
}

/**
 * GET /api/monitor
 * Runs one monitoring cycle: checks all active triggers against the flight API.
 * If a condition is met, signs and broadcasts an ETH payout via Chain Signatures.
 *
 * Called by the polling loop AND can be hit manually during the demo.
 */
app.get("/", async (c) => {
  const contractId = process.env.NEXT_PUBLIC_contractId;
  if (!contractId) {
    return c.json({ error: "Contract ID not configured" }, 500);
  }

  const results: Array<{
    triggerId: string;
    flight: string;
    flightStatus: string;
    conditionMet: boolean;
    action: string;
    txHash?: string;
  }> = [];

  try {
    const triggers = getActiveTriggers();

    if (triggers.length === 0) {
      return c.json({ message: "No active triggers", results: [] });
    }

    console.log(`[monitor] Checking ${triggers.length} active trigger(s)`);

    for (const trigger of triggers) {
      const result = await processTrigger(trigger, contractId);
      results.push(result);

      logActivity({
        timestamp: new Date().toISOString(),
        triggerId: result.triggerId,
        flight: result.flight,
        status: result.flightStatus,
        conditionMet: result.conditionMet,
        txHash: result.txHash,
      });
    }

    return c.json({ checked: triggers.length, results });
  } catch (error) {
    console.error("[monitor] Cycle failed:", error);
    return c.json({ error: "Monitoring cycle failed" }, 500);
  }
});

/**
 * GET /api/monitor/activity
 * Returns recent monitoring activity for the demo terminal view.
 */
app.get("/activity", async (c) => {
  return c.json({ activity: recentActivity });
});

/**
 * Process a single trigger: check flight, optionally sign payout.
 */
async function processTrigger(
  trigger: Trigger,
  contractId: string
): Promise<{
  triggerId: string;
  flight: string;
  flightStatus: string;
  conditionMet: boolean;
  action: string;
  txHash?: string;
}> {
  const flightNumber = trigger.condition.flight_number;

  try {
    const flight = await getFlightStatus(flightNumber);
    const conditionMet = isConditionMet(flight);

    // Count every check as an attestation (visible on trigger card)
    incrementAttestationCount(trigger.id);

    console.log(
      `[monitor] ${trigger.id} | ${flightNumber}: ${flight.status} | met=${conditionMet}`
    );

    if (!conditionMet) {
      return {
        triggerId: trigger.id,
        flight: flightNumber,
        flightStatus: flight.status,
        conditionMet: false,
        action: "none",
      };
    }

    // Condition met — execute cross-chain payout via Chain Signatures
    console.log(`[monitor] CONDITION MET for ${trigger.id} — initiating payout`);

    try {
      const txHash = await executeChainSignaturePayout(trigger, contractId);
      markExecuted(trigger.id, txHash);

      return {
        triggerId: trigger.id,
        flight: flightNumber,
        flightStatus: flight.status,
        conditionMet: true,
        action: "payout_signed",
        txHash,
      };
    } catch (payoutError) {
      // Payout failed but condition WAS met — report accurately
      console.error(`[monitor] Payout failed for ${trigger.id}:`, payoutError);
      return {
        triggerId: trigger.id,
        flight: flightNumber,
        flightStatus: flight.status,
        conditionMet: true,
        action: `payout_failed: ${payoutError}`,
      };
    }
  } catch (error) {
    console.error(`[monitor] Error processing ${trigger.id}:`, error);
    return {
      triggerId: trigger.id,
      flight: flightNumber,
      flightStatus: "error",
      conditionMet: false,
      action: `error: ${error}`,
    };
  }
}

/**
 * Sign and broadcast an ETH transfer to the user's payout address
 * using NEAR Chain Signatures via the Shade Agent sidecar.
 */
async function executeChainSignaturePayout(
  trigger: Trigger,
  contractId: string
): Promise<string> {
  const chain = trigger.payout.chain;
  const path = DERIVATION_PATHS[chain] || DERIVATION_PATHS.Ethereum;
  const evm = getEvmAdapter(chain);

  // Derive the sender address (agent's derived EVM address for this chain)
  const { address: senderAddress } = await evm.deriveAddressAndPublicKey(
    contractId,
    path
  );

  console.log(`[payout] From: ${senderAddress}`);
  console.log(`[payout] To: ${trigger.payout.address}`);
  console.log(`[payout] Amount: ${trigger.payout.amount} wei`);
  console.log(`[payout] Chain: ${chain}`);

  // Prepare an ETH transfer transaction
  const { transaction, hashesToSign } = await evm.prepareTransactionForSigning({
    from: senderAddress,
    to: trigger.payout.address,
    value: BigInt(trigger.payout.amount),
  });

  // Request Chain Signature from MPC network via Shade Agent sidecar
  const signRes = await requestSignature({
    path,
    payload: uint8ArrayToHex(hashesToSign[0]),
    keyType: "Ecdsa",
  });

  console.log("[payout] Signature received from MPC network");

  // Attach the signature to the transaction
  const signedTransaction = evm.finalizeTransactionSigning({
    transaction,
    rsvSignatures: [toRSV(signRes)],
  });

  // Broadcast to the target EVM chain
  const txResult = await evm.broadcastTx(signedTransaction);
  const txHash = txResult.hash;

  console.log(`[payout] Broadcast success: ${txHash}`);
  return txHash;
}

export default app;
