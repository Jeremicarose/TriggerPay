/**
 * NEAR Client
 *
 * Connects to NEAR testnet and provides typed methods
 * for interacting with the TriggerPay contract.
 */

import { connect, keyStores, KeyPair, Account, providers } from "near-api-js";
import { log } from "./index.js";

// Types mirroring the contract
export interface Condition {
  condition_type: "FlightCancellation";
  flight_number: string;
  flight_date: string;
}

export interface Payout {
  amount: string;
  token: string;
  address: string;
  chain: "Ethereum" | "Base" | "Arbitrum";
}

export interface TriggerView {
  id: string;
  owner: string;
  condition: Condition;
  payout: Payout;
  funded_amount: string;
  status: "Active" | "Executed" | "Refunded" | "Expired";
  created_at: number;
  expires_at: number;
  executed_tx: string | null;
  attestation_count: number;
}

export interface AttestationData {
  trigger_id: string;
  timestamp: number;
  api_response_hash: string;
  flight_status: string;
  condition_met: boolean;
  signature: string;
}

let account: Account | null = null;
let rpcProvider: providers.JsonRpcProvider | null = null;

const CONTRACT_ID = process.env.CONTRACT_ID || "triggerpay.testnet";
const NETWORK_ID = process.env.NEAR_NETWORK_ID || "testnet";
const NODE_URL = process.env.NEAR_NODE_URL || "https://rpc.testnet.near.org";
const AGENT_ACCOUNT_ID = process.env.AGENT_ACCOUNT_ID || "";
const AGENT_PRIVATE_KEY = process.env.AGENT_PRIVATE_KEY || "";

/**
 * Initialize the NEAR connection and agent account.
 */
export async function initNear(): Promise<void> {
  const keyStore = new keyStores.InMemoryKeyStore();

  if (AGENT_ACCOUNT_ID && AGENT_PRIVATE_KEY) {
    const keyPair = KeyPair.fromString(AGENT_PRIVATE_KEY);
    await keyStore.setKey(NETWORK_ID, AGENT_ACCOUNT_ID, keyPair);
    log("info", `Agent account: ${AGENT_ACCOUNT_ID}`);
  } else {
    log("warn", "No agent credentials configured — view-only mode");
  }

  const near = await connect({
    networkId: NETWORK_ID,
    keyStore,
    nodeUrl: NODE_URL,
  });

  if (AGENT_ACCOUNT_ID) {
    account = await near.account(AGENT_ACCOUNT_ID);
  }

  rpcProvider = new providers.JsonRpcProvider({ url: NODE_URL });
  log("info", `Connected to NEAR ${NETWORK_ID} (${NODE_URL})`);
}

/**
 * View call — free, no signing required.
 */
async function viewMethod<T>(method: string, args: object = {}): Promise<T> {
  if (!rpcProvider) throw new Error("NEAR not initialized");

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

/**
 * Fetch all active triggers from the contract.
 */
export async function getActiveTriggers(): Promise<TriggerView[]> {
  return viewMethod<TriggerView[]>("get_active_triggers");
}

/**
 * Submit an attestation to the contract (change call — requires gas).
 */
export async function submitAttestation(attestation: AttestationData): Promise<string> {
  if (!account) {
    throw new Error("Agent account not configured — cannot submit attestations");
  }

  const result = await account.functionCall({
    contractId: CONTRACT_ID,
    methodName: "submit_attestation",
    args: { attestation },
    gas: BigInt("100000000000000"), // 100 TGas
  });

  const txHash =
    result.transaction_outcome?.id ??
    result.transaction?.hash ??
    "unknown";

  return String(txHash);
}
