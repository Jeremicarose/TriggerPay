/**
 * Agent API Client
 *
 * Talks to the embedded agent API routes (same origin).
 * All agent endpoints live at /api/agent/* on the same Vercel deployment.
 *
 * Uses localStorage as a client-side cache to prevent trigger flickering
 * caused by Vercel spinning up multiple Lambda instances (each with its
 * own empty in-memory store).
 */

import type {
  Condition,
  Payout,
  TriggerView,
  ContractStats,
} from "@/types/contract";

const AGENT_BASE = "/api/agent";
const CACHE_KEY = "triggerpay_triggers";

// ── localStorage cache helpers ─────────────────────────────────────

function getCached(): TriggerView[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || "[]");
  } catch {
    return [];
  }
}

function setCached(triggers: TriggerView[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CACHE_KEY, JSON.stringify(triggers));
}

// ── API functions ──────────────────────────────────────────────────

/**
 * Create a new trigger via the agent API.
 */
export async function createTrigger(
  condition: Condition,
  payout: Payout,
  _depositNear: string
): Promise<void> {
  const res = await fetch(`${AGENT_BASE}/triggers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      owner: "demo.testnet",
      condition,
      payout,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `Agent API returned ${res.status}`);
  }

  // Cache the newly created trigger locally
  const trigger: TriggerView = await res.json();
  const cached = getCached();
  cached.push(trigger);
  setCached(cached);
}

/**
 * Get a single trigger by ID.
 */
export async function getTrigger(triggerId: string): Promise<TriggerView | null> {
  const res = await fetch(`${AGENT_BASE}/triggers/${triggerId}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Agent API returned ${res.status}`);
  return res.json();
}

/**
 * Get all triggers, optionally filtered by owner.
 */
export async function getUserTriggers(accountId: string): Promise<TriggerView[]> {
  const res = await fetch(
    `${AGENT_BASE}/triggers?owner=${encodeURIComponent(accountId)}`
  );
  if (!res.ok) throw new Error(`Agent API returned ${res.status}`);
  return res.json();
}

/**
 * Get all triggers (no filter).
 * Merges server data with localStorage cache so triggers don't flicker
 * when Vercel routes requests to a cold Lambda instance.
 */
export async function getAllTriggers(): Promise<TriggerView[]> {
  const res = await fetch(`${AGENT_BASE}/triggers`);
  if (!res.ok) throw new Error(`Agent API returned ${res.status}`);
  const serverTriggers: TriggerView[] = await res.json();

  if (serverTriggers.length > 0) {
    // Server has data — it's the source of truth
    setCached(serverTriggers);
    return serverTriggers;
  }

  // Server returned empty (likely cold Lambda) — use cached data
  return getCached();
}

/**
 * Get contract stats: [total, active, executed].
 * Falls back to deriving stats from cached triggers.
 */
export async function getStats(): Promise<ContractStats> {
  const res = await fetch(`${AGENT_BASE}/triggers/stats`);
  if (!res.ok) throw new Error(`Agent API returned ${res.status}`);
  const result: [number, number, number] = await res.json();

  // If server reports 0 but we have cached triggers, derive stats from cache
  if (result[0] === 0) {
    const cached = getCached();
    if (cached.length > 0) {
      return {
        total: cached.length,
        active: cached.filter((t) => t.status === "Active").length,
        executed: cached.filter((t) => t.status === "Executed").length,
      };
    }
  }

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
  const res = await fetch(`${AGENT_BASE}/monitor/activity`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.activity || [];
}

/**
 * Trigger a manual monitoring cycle (for the demo button).
 * Updates cache if any triggers were executed.
 */
export async function runMonitorCycle(): Promise<any> {
  const res = await fetch(`${AGENT_BASE}/monitor`);
  if (!res.ok) throw new Error(`Monitor cycle failed: ${res.status}`);
  const data = await res.json();

  // Update cache with execution results
  if (data.results) {
    const cached = getCached();
    let changed = false;
    for (const result of data.results) {
      if (result.conditionMet && result.txHash) {
        const trigger = cached.find((t: TriggerView) => t.id === result.triggerId);
        if (trigger) {
          trigger.status = "Executed";
          trigger.executed_tx = result.txHash;
          changed = true;
        }
      }
    }
    if (changed) setCached(cached);
  }

  return data;
}

/**
 * Claim refund — deletes the trigger from the agent store.
 */
export async function claimRefund(triggerId: string): Promise<void> {
  const res = await fetch(`${AGENT_BASE}/triggers/${triggerId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`Failed to cancel trigger: ${res.status}`);

  // Remove from cache
  setCached(getCached().filter((t) => t.id !== triggerId));
}
