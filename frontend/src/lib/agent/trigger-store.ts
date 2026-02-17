/**
 * In-Memory Trigger Store (Serverless)
 *
 * Stores triggers in module-level state. On Vercel, this persists
 * as long as the Lambda container stays warm (typically minutes).
 * Fine for hackathon demo.
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

// Module-level state (persists within warm Lambda)
const triggers = new Map<string, Trigger>();
let counter = 0;

export function createTrigger(params: {
  owner: string;
  condition: Trigger["condition"];
  payout: Trigger["payout"];
}): Trigger {
  counter++;
  const id = `trig_${counter.toString(16).padStart(8, "0")}`;
  const now = Date.now() * 1_000_000;
  const thirtyDaysNs = 30 * 24 * 60 * 60 * 1_000_000_000;

  const trigger: Trigger = {
    id,
    owner: params.owner,
    condition: params.condition,
    payout: params.payout,
    funded_amount: "0",
    status: "Active",
    created_at: now,
    expires_at: now + thirtyDaysNs,
    executed_tx: null,
    attestation_count: 0,
  };

  triggers.set(id, trigger);
  return trigger;
}

export function getTrigger(id: string): Trigger | undefined {
  return triggers.get(id);
}

export function getTriggers(owner?: string): Trigger[] {
  const all = Array.from(triggers.values());
  if (owner) return all.filter((t) => t.owner === owner);
  return all;
}

export function getActiveTriggers(): Trigger[] {
  return Array.from(triggers.values()).filter((t) => t.status === "Active");
}

export function markExecuted(id: string, txHash: string): void {
  const trigger = triggers.get(id);
  if (trigger) {
    trigger.status = "Executed";
    trigger.executed_tx = txHash;
  }
}

export function incrementAttestationCount(id: string): void {
  const trigger = triggers.get(id);
  if (trigger) trigger.attestation_count++;
}

export function getStats(): { total: number; active: number; executed: number } {
  const all = Array.from(triggers.values());
  return {
    total: all.length,
    active: all.filter((t) => t.status === "Active").length,
    executed: all.filter((t) => t.status === "Executed").length,
  };
}

export function deleteTrigger(id: string): boolean {
  return triggers.delete(id);
}
