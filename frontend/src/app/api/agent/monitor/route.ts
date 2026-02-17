import { NextResponse } from "next/server";
import {
  getActiveTriggers,
  markExecuted,
  incrementAttestationCount,
  type Trigger,
} from "@/lib/agent/trigger-store";
import {
  getEvmAdapter,
  DERIVATION_PATHS,
  signWithMPC,
} from "@/lib/agent/ethereum";
import { logActivity } from "@/lib/agent/activity-log";

// Allow up to 60s for MPC signing (requires Vercel Pro; Hobby caps at 10s)
export const maxDuration = 60;

export async function GET() {
  const contractId = process.env.NEXT_PUBLIC_contractId;
  if (!contractId) {
    return NextResponse.json(
      { error: "Contract ID not configured" },
      { status: 500 }
    );
  }

  const triggers = getActiveTriggers();
  if (triggers.length === 0) {
    return NextResponse.json({ message: "No active triggers", results: [] });
  }

  const results = [];

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

  return NextResponse.json({ checked: triggers.length, results });
}

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
    // Call our own flight API (same origin)
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";
    const res = await fetch(
      `${baseUrl}/api/flight/${encodeURIComponent(flightNumber)}`
    );
    if (!res.ok) throw new Error(`Flight API ${res.status}`);
    const flight = await res.json();

    const conditionMet = flight.status === "cancelled";
    incrementAttestationCount(trigger.id);

    if (!conditionMet) {
      return {
        triggerId: trigger.id,
        flight: flightNumber,
        flightStatus: flight.status,
        conditionMet: false,
        action: "none",
      };
    }

    // Condition met — execute payout
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
      return {
        triggerId: trigger.id,
        flight: flightNumber,
        flightStatus: flight.status,
        conditionMet: true,
        action: `payout_failed: ${payoutError}`,
      };
    }
  } catch (error) {
    return {
      triggerId: trigger.id,
      flight: flightNumber,
      flightStatus: "error",
      conditionMet: false,
      action: `error: ${error}`,
    };
  }
}

async function executeChainSignaturePayout(
  trigger: Trigger,
  contractId: string
): Promise<string> {
  const chain = trigger.payout.chain;
  const path = DERIVATION_PATHS[chain] || DERIVATION_PATHS.Ethereum;
  const evm = getEvmAdapter(chain);

  const { address: senderAddress } = await evm.deriveAddressAndPublicKey(
    contractId,
    path
  );

  const { transaction, hashesToSign } = await evm.prepareTransactionForSigning({
    from: senderAddress,
    to: trigger.payout.address,
    value: BigInt(trigger.payout.amount),
  });

  const rsvSignature = await signWithMPC({
    path,
    payload: hashesToSign[0],
    keyType: "Ecdsa",
  });

  const signedTransaction = evm.finalizeTransactionSigning({
    transaction,
    rsvSignatures: [rsvSignature],
  });

  const txResult = await evm.broadcastTx(signedTransaction);
  return txResult.hash;
}
