/**
 * NEAR Contract View Calls
 *
 * Read-only calls to the TriggerPay contract for fetching
 * active triggers. Uses JSON-RPC directly (no signing needed).
 */

import { providers } from "near-api-js";

const NODE_URL = "https://rpc.testnet.near.org";
const CONTRACT_ID = process.env.TRIGGERPAY_CONTRACT_ID || "triggerpay.testnet";

const rpcProvider = new providers.JsonRpcProvider({ url: NODE_URL });

// Types matching the contract
export interface TriggerView {
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
    chain: "Ethereum" | "Base" | "Arbitrum";
  };
  funded_amount: string;
  status: "Active" | "Executed" | "Refunded" | "Expired";
  created_at: number;
  expires_at: number;
  executed_tx: string | null;
  attestation_count: number;
}

async function viewMethod<T>(method: string, args: object = {}): Promise<T> {
  const result = await rpcProvider.query({
    request_type: "call_function",
    account_id: CONTRACT_ID,
    method_name: method,
    args_base64: Buffer.from(JSON.stringify(args)).toString("base64"),
    finality: "final",
  });

  const bytes = (result as unknown as { result: number[] }).result;
  const text = String.fromCharCode(...bytes);
  return JSON.parse(text) as T;
}

export async function getActiveTriggers(): Promise<TriggerView[]> {
  return viewMethod<TriggerView[]>("get_active_triggers");
}

export async function getTrigger(triggerId: string): Promise<TriggerView | null> {
  return viewMethod<TriggerView | null>("get_trigger", { trigger_id: triggerId });
}
