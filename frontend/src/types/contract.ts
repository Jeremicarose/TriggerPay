/**
 * Contract Type Definitions
 *
 * These types mirror the Rust structs in our smart contract (lib.rs).
 * They ensure type safety when calling contract methods from the frontend.
 */

// The blockchain networks we support for cross-chain payouts
export type Chain = "Ethereum" | "Base" | "Arbitrum";

// Types of conditions that can trigger a payout
export type ConditionType = "FlightCancellation";

// Status of a trigger - matches the Rust enum in lib.rs
export type Status = "Active" | "Executed" | "Refunded" | "Expired";

/**
 * Condition - What must happen for the trigger to fire
 * For MVP, we only support flight cancellations
 */
export interface Condition {
  condition_type: ConditionType;
  flight_number: string;    // e.g., "AA1234"
  flight_date: string;      // ISO 8601 date: "2026-02-15"
}

/**
 * Payout - Where to send funds when condition is met
 * Supports cross-chain payments via NEAR Chain Signatures
 */
export interface Payout {
  amount: string;    // Amount in wei (use string for big numbers)
  token: string;     // "ETH", "USDC", etc.
  address: string;   // Recipient's EVM address (0x...)
  chain: Chain;      // Target blockchain
}

/**
 * TriggerView - Data returned from contract view methods
 * This is what we display in the dashboard
 */
export interface TriggerView {
  id: string;                    // Unique trigger ID (e.g., "trig_00000001")
  owner: string;                 // NEAR account that created this trigger
  condition: Condition;          // What triggers the payout
  payout: Payout;                // Where to send funds
  funded_amount: string;         // NEAR deposited (in yoctoNEAR as string)
  status: Status;                // Current trigger status
  created_at: number;            // Unix timestamp (nanoseconds)
  expires_at: number;            // When trigger expires (nanoseconds)
  executed_tx: string | null;    // Transaction hash if executed
  attestation_count: number;     // Number of attestations received
}

/**
 * Attestation - Proof from TEE agent that condition was checked
 */
export interface Attestation {
  trigger_id: string;
  timestamp: number;
  api_response_hash: string;   // SHA256 of the API response
  flight_status: string;       // "scheduled", "cancelled", "departed"
  condition_met: boolean;      // Did the condition trigger?
  signature: string;           // Ed25519 signature from TEE
}

/**
 * Contract Stats - Overview metrics
 */
export interface ContractStats {
  total: number;
  active: number;
  executed: number;
}

/**
 * CreateTriggerArgs - Arguments for create_trigger contract call
 */
export interface CreateTriggerArgs {
  condition: Condition;
  payout: Payout;
}
