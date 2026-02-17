/**
 * Catch-all Agent API Route
 *
 * All agent endpoints in a single serverless function so they share
 * the same in-memory trigger store within a warm Lambda container.
 *
 * Routes:
 *   GET    /api/agent/triggers          — list all triggers
 *   POST   /api/agent/triggers          — create trigger
 *   GET    /api/agent/triggers/stats    — trigger counts
 *   GET    /api/agent/triggers/:id      — single trigger
 *   DELETE /api/agent/triggers/:id      — delete trigger
 *   GET    /api/agent/monitor           — run monitor cycle
 *   GET    /api/agent/monitor/activity  — recent activity log
 *   GET    /api/agent/eth-account       — derived ETH address + balance
 */

import { NextRequest, NextResponse } from "next/server";
import {
  createTrigger,
  getTrigger,
  getTriggers,
  deleteTrigger,
  getActiveTriggers,
  markExecuted,
  incrementAttestationCount,
  getStats,
  type Trigger,
} from "@/lib/agent/trigger-store";
import {
  getEvmAdapter,
  DERIVATION_PATHS,
  signWithMPC,
} from "@/lib/agent/ethereum";
import { logActivity, getActivity } from "@/lib/agent/activity-log";

// Allow up to 60s for MPC signing (Vercel Pro); Hobby caps at 10s
export const maxDuration = 60;

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, ctx: RouteContext) {
  const { path } = await ctx.params;
  const route = path.join("/");

  // GET /api/agent/triggers
  if (route === "triggers") {
    const owner = req.nextUrl.searchParams.get("owner") || undefined;
    return NextResponse.json(getTriggers(owner));
  }

  // GET /api/agent/triggers/stats
  if (route === "triggers/stats") {
    const stats = getStats();
    return NextResponse.json([stats.total, stats.active, stats.executed]);
  }

  // GET /api/agent/triggers/:id
  if (path[0] === "triggers" && path.length === 2) {
    const trigger = getTrigger(path[1]);
    if (!trigger) {
      return NextResponse.json({ error: "Trigger not found" }, { status: 404 });
    }
    return NextResponse.json(trigger);
  }

  // GET /api/agent/monitor
  if (route === "monitor") {
    return handleMonitor();
  }

  // GET /api/agent/monitor/activity
  if (route === "monitor/activity") {
    return NextResponse.json({ activity: getActivity() });
  }

  // GET /api/agent/eth-account
  if (route === "eth-account") {
    return handleEthAccount();
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const { path } = await ctx.params;
  const route = path.join("/");

  // POST /api/agent/triggers
  if (route === "triggers") {
    return handleCreateTrigger(req);
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const { path } = await ctx.params;

  // DELETE /api/agent/triggers/:id
  if (path[0] === "triggers" && path.length === 2) {
    const deleted = deleteTrigger(path[1]);
    if (!deleted) {
      return NextResponse.json({ error: "Trigger not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, id: path[1] });
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

// ── Handlers ────────────────────────────────────────────────────────

async function handleCreateTrigger(req: NextRequest) {
  let body: {
    owner?: string;
    condition?: Trigger["condition"];
    payout?: Trigger["payout"];
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.owner || !body.condition || !body.payout) {
    return NextResponse.json(
      { error: "Missing owner, condition, or payout" },
      { status: 400 }
    );
  }

  if (!body.condition.flight_number || !body.condition.flight_date) {
    return NextResponse.json(
      { error: "Missing flight_number or flight_date" },
      { status: 400 }
    );
  }

  if (
    !body.payout.address?.startsWith("0x") ||
    body.payout.address.length !== 42
  ) {
    return NextResponse.json(
      { error: "Invalid EVM payout address" },
      { status: 400 }
    );
  }

  const trigger = createTrigger({
    owner: body.owner,
    condition: body.condition,
    payout: body.payout,
  });

  return NextResponse.json(trigger, { status: 201 });
}

async function handleMonitor() {
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

async function handleEthAccount() {
  const contractId = process.env.NEXT_PUBLIC_contractId;
  if (!contractId) {
    return NextResponse.json(
      { error: "Contract ID not configured" },
      { status: 500 }
    );
  }

  try {
    const chain = "Ethereum";
    const evm = getEvmAdapter(chain);
    const path = DERIVATION_PATHS[chain];
    const { address } = await evm.deriveAddressAndPublicKey(contractId, path);
    const { balance } = await evm.getBalance(address);
    return NextResponse.json({ address, balance: Number(balance), chain });
  } catch (error) {
    console.error("ETH account error:", error);
    return NextResponse.json(
      { error: `Failed to get derived ETH account: ${error}` },
      { status: 500 }
    );
  }
}

// ── Monitor helpers ─────────────────────────────────────────────────

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
    // Call our own flight API (same Vercel deployment)
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

    // Condition met — execute payout via Chain Signatures
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
