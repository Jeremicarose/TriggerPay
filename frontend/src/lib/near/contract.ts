/**
 * Smart Contract Interaction Functions
 *
 * This module provides typed functions to interact with the TriggerPay
 * smart contract deployed at triggerpay.testnet
 */

import { providers } from "near-api-js";
import type { Action } from "@near-wallet-selector/core";
import { getWallet } from "./wallet";
import {
  CONTRACT_ID,
  NODE_URL,
  GAS_FOR_CREATE_TRIGGER,
  GAS_FOR_CLAIM_REFUND,
  parseNearAmount,
} from "./config";
import type {
  Condition,
  Payout,
  TriggerView,
  ContractStats,
  Attestation,
} from "@/types/contract";

// Create a provider for view calls (no wallet needed)
const provider = new providers.JsonRpcProvider({ url: NODE_URL });

/**
 * Helper to make view calls to the contract
 * View calls are free and don't require a wallet
 */
async function viewMethod<T>(methodName: string, args: object = {}): Promise<T> {
  const result = await provider.query({
    request_type: "call_function",
    account_id: CONTRACT_ID,
    method_name: methodName,
    args_base64: Buffer.from(JSON.stringify(args)).toString("base64"),
    finality: "final",
  });

  // Parse the result
  const resultBytes = (result as unknown as { result: number[] }).result;
  const resultString = String.fromCharCode(...resultBytes);
  return JSON.parse(resultString) as T;
}

/**
 * Create a new trigger with attached NEAR deposit
 *
 * @param condition - The condition that triggers payout (flight cancellation)
 * @param payout - Where to send funds when triggered
 * @param depositNear - Amount of NEAR to deposit (minimum 1 NEAR)
 * @returns Transaction result
 */
export async function createTrigger(
  condition: Condition,
  payout: Payout,
  depositNear: string
): Promise<void> {
  const wallet = await getWallet();

  // Convert NEAR to yoctoNEAR (1 NEAR = 10^24 yoctoNEAR)
  const deposit = parseNearAmount(depositNear);

  await wallet.signAndSendTransaction({
    receiverId: CONTRACT_ID,
    actions: [
      {
        type: "FunctionCall",
        params: {
          methodName: "create_trigger",
          args: { condition, payout },
          gas: GAS_FOR_CREATE_TRIGGER,
          deposit: deposit,
        },
      } as unknown as Action,
    ],
  });
}

/**
 * Get a single trigger by ID
 *
 * @param triggerId - The trigger ID (e.g., "trig_00000001")
 * @returns Trigger details or null if not found
 */
export async function getTrigger(triggerId: string): Promise<TriggerView | null> {
  return viewMethod<TriggerView | null>("get_trigger", { trigger_id: triggerId });
}

/**
 * Get all triggers for a specific user
 *
 * @param accountId - The NEAR account ID
 * @returns Array of user's triggers
 */
export async function getUserTriggers(accountId: string): Promise<TriggerView[]> {
  return viewMethod<TriggerView[]>("get_user_triggers", { account_id: accountId });
}

/**
 * Get all active triggers (for monitoring)
 *
 * @returns Array of active triggers
 */
export async function getActiveTriggers(): Promise<TriggerView[]> {
  return viewMethod<TriggerView[]>("get_active_triggers", {});
}

/**
 * Get contract statistics
 *
 * @returns Tuple of [total, active, executed] counts
 */
export async function getStats(): Promise<ContractStats> {
  const result = await viewMethod<[number, number, number]>("get_stats", {});
  return {
    total: result[0],
    active: result[1],
    executed: result[2],
  };
}

/**
 * Get attestations for a trigger
 *
 * @param triggerId - The trigger ID
 * @returns Array of attestations
 */
export async function getAttestations(triggerId: string): Promise<Attestation[]> {
  return viewMethod<Attestation[]>("get_attestations", { trigger_id: triggerId });
}

/**
 * Claim refund for an expired trigger
 *
 * @param triggerId - The trigger ID to refund
 */
export async function claimRefund(triggerId: string): Promise<void> {
  const wallet = await getWallet();

  await wallet.signAndSendTransaction({
    receiverId: CONTRACT_ID,
    actions: [
      {
        type: "FunctionCall",
        params: {
          methodName: "claim_refund",
          args: { trigger_id: triggerId },
          gas: GAS_FOR_CLAIM_REFUND,
          deposit: "0",
        },
      } as unknown as Action,
    ],
  });
}
