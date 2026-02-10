/**
 * In-Memory Trigger Store
 *
 * Stores triggers in the agent's memory. For the hackathon demo
 * this is sufficient — triggers persist for the lifetime of the
 * agent process. In production, triggers would live on-chain.
 */

export type Chain = "Ethereum" | "Base" | "Arbitrum";
export type TriggerStatus = "Active" | "Executed" | "Refunded" | "Expired";

export interface Trigger {
  id: string;
  owner: string;
  condition: {
    condition_type: "FlightCancellation";
    flight_number: string;
    flight_date: string;
  };
  payout: {
    amount: string;
    token: string;
    address: string;
    chain: Chain;
  };
  funded_amount: string;
  status: TriggerStatus;
  created_at: number;
  expires_at: number;
  executed_tx: string | null;
  attestation_count: number;
}

// In-memory store
const triggers = new Map<string, Trigger>();
let counter = 0;

/**
 * Create a new trigger. Returns the trigger ID.
 */
export function createTrigger(params: {
  owner: string;
  condition: Trigger["condition"];
  payout: Trigger["payout"];
  funded_amount?: string;
}): Trigger {
  counter++;
  const id = `trig_${counter.toString(16).padStart(8, "0")}`;
  const now = Date.now() * 1_000_000; // nanoseconds
  const thirtyDaysNs = 30 * 24 * 60 * 60 * 1_000_000_000;

  const trigger: Trigger = {
    id,
    owner: params.owner,
    condition: params.condition,
    payout: params.payout,
    funded_amount: params.funded_amount || "0",
    status: "Active",
    created_at: now,
    expires_at: now + thirtyDaysNs,
    executed_tx: null,
    attestation_count: 0,
  };

  triggers.set(id, trigger);
  return trigger;
}

/**
 * Get a trigger by ID.
 */
export function getTrigger(id: string): Trigger | undefined {
  return triggers.get(id);
}

/**
 * Get all triggers, optionally filtered by owner.
 */
export function getTriggers(owner?: string): Trigger[] {
  const all = Array.from(triggers.values());
  if (owner) {
    return all.filter((t) => t.owner === owner);
  }
  return all;
}

/**
 * Get only active triggers (for the monitoring loop).
 */
export function getActiveTriggers(): Trigger[] {
  return Array.from(triggers.values()).filter((t) => t.status === "Active");
}

/**
 * Mark a trigger as executed with the payout tx hash.
 */
export function markExecuted(id: string, txHash: string): void {
  const trigger = triggers.get(id);
  if (trigger) {
    trigger.status = "Executed";
    trigger.executed_tx = txHash;
  }
}

/**
 * Mark a trigger as refunded.
 */
export function markRefunded(id: string): void {
  const trigger = triggers.get(id);
  if (trigger) {
    trigger.status = "Refunded";
  }
}

/**
 * Increment attestation count (for display).
 */
export function incrementAttestationCount(id: string): void {
  const trigger = triggers.get(id);
  if (trigger) {
    trigger.attestation_count++;
  }
}

/**
 * Get stats: total, active, executed.
 */
export function getStats(): { total: number; active: number; executed: number } {
  const all = Array.from(triggers.values());
  return {
    total: all.length,
    active: all.filter((t) => t.status === "Active").length,
    executed: all.filter((t) => t.status === "Executed").length,
  };
}

/**
 * Delete a trigger (cancel).
 */
export function deleteTrigger(id: string): boolean {
  return triggers.delete(id);
}
