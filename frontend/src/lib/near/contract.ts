/**
 * Agent API Client
 *
 * Talks to the TriggerPay Shade Agent API for trigger management.
 * Replaces direct NEAR contract calls — the agent handles storage
 * and Chain Signatures payouts from inside the TEE.
 */

import type {
  Condition,
  Payout,
  TriggerView,
  ContractStats,
} from "@/types/contract";

const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL || "http://localhost:3001";

/**
 * Create a new trigger via the agent API.
 */
export async function createTrigger(
  condition: Condition,
  payout: Payout,
  _depositNear: string // kept for interface compatibility, not used in agent mode
): Promise<void> {
  const res = await fetch(`${AGENT_URL}/api/triggers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      owner: "demo.testnet", // placeholder — wallet integration optional for demo
      condition,
      payout,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `Agent API returned ${res.status}`);
  }
}

/**
 * Get a single trigger by ID.
 */
export async function getTrigger(triggerId: string): Promise<TriggerView | null> {
  const res = await fetch(`${AGENT_URL}/api/triggers/${triggerId}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Agent API returned ${res.status}`);
  return res.json();
}

/**
 * Get all triggers, optionally filtered by owner.
 */
export async function getUserTriggers(accountId: string): Promise<TriggerView[]> {
  const res = await fetch(
    `${AGENT_URL}/api/triggers?owner=${encodeURIComponent(accountId)}`
  );
  if (!res.ok) throw new Error(`Agent API returned ${res.status}`);
  return res.json();
}

/**
 * Get all triggers (no filter).
 */
export async function getAllTriggers(): Promise<TriggerView[]> {
  const res = await fetch(`${AGENT_URL}/api/triggers`);
  if (!res.ok) throw new Error(`Agent API returned ${res.status}`);
  return res.json();
}

/**
 * Get contract stats: [total, active, executed].
 */
export async function getStats(): Promise<ContractStats> {
  const res = await fetch(`${AGENT_URL}/api/triggers/stats`);
  if (!res.ok) throw new Error(`Agent API returned ${res.status}`);
  const result: [number, number, number] = await res.json();
  return {
    total: result[0],
    active: result[1],
    executed: result[2],
  };
}

/**
 * Get recent monitoring activity from the agent.
 */
export async function getMonitorActivity(): Promise<
  Array<{
    timestamp: string;
    triggerId: string;
    flight: string;
    status: string;
    conditionMet: boolean;
    txHash?: string;
  }>
> {
  const res = await fetch(`${AGENT_URL}/api/monitor/activity`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.activity || [];
}

/**
 * Trigger a manual monitoring cycle (for the demo button).
 */
export async function runMonitorCycle(): Promise<any> {
  const res = await fetch(`${AGENT_URL}/api/monitor`);
  if (!res.ok) throw new Error(`Monitor cycle failed: ${res.status}`);
  return res.json();
}

/**
 * Claim refund — deletes the trigger from the agent store.
 */
export async function claimRefund(triggerId: string): Promise<void> {
  const res = await fetch(`${AGENT_URL}/api/triggers/${triggerId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`Failed to cancel trigger: ${res.status}`);
}
