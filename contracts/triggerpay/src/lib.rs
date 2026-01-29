use near_sdk::borsh::{BorshDeserialize, BorshSerialize};
use near_sdk::collections::{LookupMap, UnorderedMap, Vector};
use near_sdk::serde::{Deserialize, Serialize};
use near_sdk::{env, AccountId, BorshStorageKey, Gas, NearToken, Promise, PublicKey};
use schemars::JsonSchema;

pub type Balance = u128;
use sha2::{Digest, Sha256};

// ============================================================================
// Constants
// ============================================================================

const MINIMUM_DEPOSIT: Balance = 1_000_000_000_000_000_000_000_000; // 1 NEAR
const EXECUTION_FEE: Balance = 2_000_000_000_000_000_000_000_000; // 2 NEAR
const GAS_FOR_SIGN: Gas = Gas::from_tgas(250);
const MPC_CONTRACT: &str = "v1.signer-prod.testnet";

// ============================================================================
// Storage Keys
// ============================================================================

#[derive(BorshStorageKey, BorshSerialize)]
#[borsh(crate = "near_sdk::borsh")]
enum StorageKey {
    Triggers,
    UserTriggers,
    UserTriggersInner { account_hash: Vec<u8> },
    Attestations,
    AttestationsInner { trigger_id: String },
}

// ============================================================================
// Types
// ============================================================================

pub type TriggerId = String;

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
#[borsh(crate = "near_sdk::borsh")]
#[serde(crate = "near_sdk::serde")]
pub enum ConditionType {
    FlightCancellation,
}

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone, Debug, JsonSchema)]
#[borsh(crate = "near_sdk::borsh")]
#[serde(crate = "near_sdk::serde")]
pub struct Condition {
    pub condition_type: ConditionType,
    pub flight_number: String,
    pub flight_date: String, // ISO 8601 date: "2026-02-15"
}

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone, Debug, JsonSchema)]
#[borsh(crate = "near_sdk::borsh")]
#[serde(crate = "near_sdk::serde")]
pub enum Chain {
    Ethereum,
    Base,
    Arbitrum,
}

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone, Debug, JsonSchema)]
#[borsh(crate = "near_sdk::borsh")]
#[serde(crate = "near_sdk::serde")]
pub struct Payout {
    pub amount: String,    // Amount in wei (string to handle large numbers)
    pub token: String,     // "ETH", "USDC", etc.
    pub address: String,   // Recipient address on target chain (0x...)
    pub chain: Chain,      // Target blockchain
}

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone, Debug, PartialEq)]
#[borsh(crate = "near_sdk::borsh")]
#[serde(crate = "near_sdk::serde")]
pub enum Status {
    Active,
    Executed,
    Refunded,
    Expired,
}

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone, Debug)]
#[borsh(crate = "near_sdk::borsh")]
#[serde(crate = "near_sdk::serde")]
pub struct Trigger {
    pub id: TriggerId,
    pub owner: AccountId,
    pub condition: Condition,
    pub payout: Payout,
    pub funded_amount: Balance,
    pub status: Status,
    pub created_at: u64,      // Nanoseconds
    pub expires_at: u64,      // Nanoseconds
    pub executed_tx: Option<String>, // Transaction hash if executed
}

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone, Debug)]
#[borsh(crate = "near_sdk::borsh")]
#[serde(crate = "near_sdk::serde")]
pub struct Attestation {
    pub trigger_id: TriggerId,
    pub timestamp: u64,
    pub api_response_hash: String, // Hex-encoded SHA256
    pub flight_status: String,     // "scheduled", "cancelled", "departed"
    pub condition_met: bool,
    pub signature: String,         // Hex-encoded Ed25519 signature from TEE
}

// View types (for returning data without internal fields)
#[derive(Serialize, Deserialize, Debug)]
#[serde(crate = "near_sdk::serde")]
pub struct TriggerView {
    pub id: TriggerId,
    pub owner: AccountId,
    pub condition: Condition,
    pub payout: Payout,
    pub funded_amount: String, // String for JSON compatibility
    pub status: Status,
    pub created_at: u64,
    pub expires_at: u64,
    pub executed_tx: Option<String>,
    pub attestation_count: u32,
}

// ============================================================================
// Contract
// ============================================================================

#[near_sdk::near(contract_state)]
pub struct TriggerPay {
    // All triggers by ID
    triggers: UnorderedMap<TriggerId, Trigger>,
    // Triggers owned by each user
    user_triggers: LookupMap<AccountId, Vector<TriggerId>>,
    // Attestations for each trigger
    attestations: LookupMap<TriggerId, Vector<Attestation>>,
    // Agent's public key for verifying attestations
    agent_public_key: Option<PublicKey>,
    // Contract owner
    owner: AccountId,
    // Counter for generating unique IDs
    trigger_counter: u64,
}

// Implement Default to panic - we require explicit initialization via `new()`
impl Default for TriggerPay {
    fn default() -> Self {
        panic!("Contract must be initialized with new(owner)")
    }
}

#[near_sdk::near]
impl TriggerPay {
    #[init]
    pub fn new(owner: AccountId) -> Self {
        Self {
            triggers: UnorderedMap::new(StorageKey::Triggers),
            user_triggers: LookupMap::new(StorageKey::UserTriggers),
            attestations: LookupMap::new(StorageKey::Attestations),
            agent_public_key: None,
            owner,
            trigger_counter: 0,
        }
    }

    // ========================================================================
    // Admin Methods
    // ========================================================================

    /// Set the agent's public key (only owner can call)
    pub fn set_agent_key(&mut self, public_key: PublicKey) {
        self.assert_owner();
        env::log_str(&format!("Agent public key set: {:?}", public_key));
        self.agent_public_key = Some(public_key);
    }

    // ========================================================================
    // Trigger Management
    // ========================================================================

    /// Create a new trigger with attached deposit for escrow
    #[payable]
    pub fn create_trigger(&mut self, condition: Condition, payout: Payout) -> TriggerId {
        let deposit = env::attached_deposit();
        let owner = env::predecessor_account_id();

        // Validate deposit
        assert!(
            deposit.as_yoctonear() >= MINIMUM_DEPOSIT,
            "Minimum deposit is 1 NEAR"
        );

        // Validate condition
        assert!(
            !condition.flight_number.is_empty(),
            "Flight number is required"
        );
        assert!(
            !condition.flight_date.is_empty(),
            "Flight date is required"
        );

        // Validate payout
        assert!(!payout.amount.is_empty(), "Payout amount is required");
        assert!(!payout.address.is_empty(), "Payout address is required");
        assert!(
            payout.address.starts_with("0x") && payout.address.len() == 42,
            "Invalid Ethereum address format"
        );

        // Generate unique ID
        self.trigger_counter += 1;
        let trigger_id = format!("trig_{:08x}", self.trigger_counter);

        // Calculate expiration (flight date + 24 hours buffer)
        // For MVP, set expiration to 30 days from now
        let now = env::block_timestamp();
        let thirty_days_ns = 30 * 24 * 60 * 60 * 1_000_000_000u64;
        let expires_at = now + thirty_days_ns;

        let trigger = Trigger {
            id: trigger_id.clone(),
            owner: owner.clone(),
            condition,
            payout,
            funded_amount: deposit.as_yoctonear(),
            status: Status::Active,
            created_at: now,
            expires_at,
            executed_tx: None,
        };

        // Store trigger
        self.triggers.insert(&trigger_id, &trigger);

        // Add to user's triggers
        let mut user_trigger_ids = self
            .user_triggers
            .get(&owner)
            .unwrap_or_else(|| Vector::new(StorageKey::UserTriggersInner {
                account_hash: env::sha256(owner.as_bytes()),
            }));
        user_trigger_ids.push(&trigger_id);
        self.user_triggers.insert(&owner, &user_trigger_ids);

        // Initialize attestations vector for this trigger
        let attestations_vec = Vector::new(StorageKey::AttestationsInner {
            trigger_id: trigger_id.clone(),
        });
        self.attestations.insert(&trigger_id, &attestations_vec);

        env::log_str(&format!(
            "Trigger created: {} by {} with {} yoctoNEAR",
            trigger_id,
            owner,
            deposit.as_yoctonear()
        ));

        trigger_id
    }

    /// Submit an attestation from the TEE agent
    pub fn submit_attestation(&mut self, attestation: Attestation) -> Option<Promise> {
        // Get the trigger
        let mut trigger = self
            .triggers
            .get(&attestation.trigger_id)
            .expect("Trigger not found");

        // Verify trigger is still active
        assert!(
            trigger.status == Status::Active,
            "Trigger is no longer active"
        );

        // TODO: Verify attestation signature against agent_public_key
        // For MVP, we'll trust the attestation and add signature verification later
        // self.verify_attestation_signature(&attestation);

        // Store the attestation
        let mut trigger_attestations = self
            .attestations
            .get(&attestation.trigger_id)
            .expect("Attestations vector not found");
        trigger_attestations.push(&attestation);
        self.attestations
            .insert(&attestation.trigger_id, &trigger_attestations);

        env::log_str(&format!(
            "Attestation submitted for {}: status={}, condition_met={}",
            attestation.trigger_id, attestation.flight_status, attestation.condition_met
        ));

        // If condition is met, trigger the payout
        if attestation.condition_met {
            env::log_str(&format!(
                "Condition met for {}! Initiating payout...",
                attestation.trigger_id
            ));

            // Update trigger status
            trigger.status = Status::Executed;
            self.triggers.insert(&attestation.trigger_id, &trigger);

            // Initiate cross-chain payout via Chain Signatures
            return Some(self.initiate_payout(&trigger));
        }

        None
    }

    /// Claim refund for an expired or unmet trigger
    pub fn claim_refund(&mut self, trigger_id: TriggerId) -> Promise {
        let mut trigger = self.triggers.get(&trigger_id).expect("Trigger not found");

        // Verify caller is the owner
        assert!(
            env::predecessor_account_id() == trigger.owner,
            "Only trigger owner can claim refund"
        );

        // Verify trigger is active
        assert!(
            trigger.status == Status::Active,
            "Trigger is not active"
        );

        // Verify trigger has expired
        assert!(
            env::block_timestamp() > trigger.expires_at,
            "Trigger has not expired yet"
        );

        // Update status
        trigger.status = Status::Refunded;
        self.triggers.insert(&trigger_id, &trigger);

        // Refund the deposit (minus a small fee for storage)
        let refund_amount = trigger.funded_amount.saturating_sub(EXECUTION_FEE / 10); // Keep 0.2 NEAR for storage

        env::log_str(&format!(
            "Refund issued for {}: {} yoctoNEAR to {}",
            trigger_id, refund_amount, trigger.owner
        ));

        // Return the promise so NEAR executes the transfer
        Promise::new(trigger.owner.clone()).transfer(NearToken::from_yoctonear(refund_amount))
    }

    // ========================================================================
    // View Methods
    // ========================================================================

    /// Get a single trigger by ID
    pub fn get_trigger(&self, trigger_id: TriggerId) -> Option<TriggerView> {
        self.triggers.get(&trigger_id).map(|t| self.trigger_to_view(&t))
    }

    /// Get all triggers for a user
    pub fn get_user_triggers(&self, account_id: AccountId) -> Vec<TriggerView> {
        self.user_triggers
            .get(&account_id)
            .map(|ids: Vector<TriggerId>| {
                ids.iter()
                    .filter_map(|id| self.triggers.get(&id))
                    .map(|t| self.trigger_to_view(&t))
                    .collect()
            })
            .unwrap_or_default()
    }

    /// Get all active triggers (for agent polling)
    pub fn get_active_triggers(&self) -> Vec<TriggerView> {
        self.triggers
            .iter()
            .filter(|(_, t)| t.status == Status::Active)
            .map(|(_, t)| self.trigger_to_view(&t))
            .collect()
    }

    /// Get attestations for a trigger
    pub fn get_attestations(&self, trigger_id: TriggerId) -> Vec<Attestation> {
        self.attestations
            .get(&trigger_id)
            .map(|v: Vector<Attestation>| v.iter().collect())
            .unwrap_or_default()
    }

    /// Get contract stats
    pub fn get_stats(&self) -> (u64, u64, u64) {
        let total = self.triggers.len();
        let active = self
            .triggers
            .iter()
            .filter(|(_, t)| t.status == Status::Active)
            .count() as u64;
        let executed = self
            .triggers
            .iter()
            .filter(|(_, t)| t.status == Status::Executed)
            .count() as u64;
        (total, active, executed)
    }

    // ========================================================================
    // Internal Methods
    // ========================================================================

    fn assert_owner(&self) {
        assert!(
            env::predecessor_account_id() == self.owner,
            "Only owner can call this method"
        );
    }

    fn trigger_to_view(&self, trigger: &Trigger) -> TriggerView {
        let attestation_count = self
            .attestations
            .get(&trigger.id)
            .map(|v: Vector<Attestation>| v.len() as u32)
            .unwrap_or(0);

        TriggerView {
            id: trigger.id.clone(),
            owner: trigger.owner.clone(),
            condition: trigger.condition.clone(),
            payout: trigger.payout.clone(),
            funded_amount: trigger.funded_amount.to_string(),
            status: trigger.status.clone(),
            created_at: trigger.created_at,
            expires_at: trigger.expires_at,
            executed_tx: trigger.executed_tx.clone(),
            attestation_count,
        }
    }

    /// Initiate cross-chain payout using Chain Signatures
    fn initiate_payout(&self, trigger: &Trigger) -> Promise {
        // Build the payload for Chain Signatures
        // This will request the MPC network to sign an Ethereum transaction

        let payload = self.build_eth_transaction_payload(trigger);

        env::log_str(&format!(
            "Requesting Chain Signature for payout: {} {} to {}",
            trigger.payout.amount, trigger.payout.token, trigger.payout.address
        ));

        // Call the MPC signer contract
        // The path determines which derived key to use
        let path = match trigger.payout.chain {
            Chain::Ethereum => "ethereum-1",
            Chain::Base => "base-1",
            Chain::Arbitrum => "arbitrum-1",
        };

        Promise::new(MPC_CONTRACT.parse().unwrap()).function_call(
            "sign".to_string(),
            serde_json::json!({
                "request": {
                    "path": path,
                    "payload": payload,
                    "key_version": 0
                }
            })
            .to_string()
            .into_bytes(),
            NearToken::from_yoctonear(1), // Attached deposit for MPC
            GAS_FOR_SIGN,
        )
    }

    /// Build the Ethereum transaction payload to be signed
    fn build_eth_transaction_payload(&self, trigger: &Trigger) -> Vec<u8> {
        // For MVP, we'll build a simple ETH transfer transaction
        // In production, this would use proper RLP encoding

        // Create a hash of the transaction data that will be signed
        let mut hasher = Sha256::new();
        hasher.update(trigger.payout.address.as_bytes());
        hasher.update(trigger.payout.amount.as_bytes());
        hasher.update(trigger.id.as_bytes());

        hasher.finalize().to_vec()
    }
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::test_utils::VMContextBuilder;
    use near_sdk::testing_env;

    fn get_context(predecessor: AccountId, deposit: Balance) -> VMContextBuilder {
        let mut builder = VMContextBuilder::new();
        builder
            .predecessor_account_id(predecessor)
            .attached_deposit(NearToken::from_yoctonear(deposit))
            .block_timestamp(1_000_000_000_000_000_000); // 1 second in nanoseconds
        builder
    }

    fn sample_condition() -> Condition {
        Condition {
            condition_type: ConditionType::FlightCancellation,
            flight_number: "AA1234".to_string(),
            flight_date: "2026-02-15".to_string(),
        }
    }

    fn sample_payout() -> Payout {
        Payout {
            amount: "500000000000000000".to_string(), // 0.5 ETH in wei
            token: "ETH".to_string(),
            address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb5".to_string(),
            chain: Chain::Ethereum,
        }
    }

    #[test]
    fn test_create_trigger() {
        let owner: AccountId = "owner.near".parse().unwrap();
        let user: AccountId = "alice.near".parse().unwrap();

        let context = get_context(owner.clone(), 0);
        testing_env!(context.build());

        let mut contract = TriggerPay::new(owner);

        // Create trigger with deposit
        let context = get_context(user.clone(), 10 * MINIMUM_DEPOSIT);
        testing_env!(context.build());

        let trigger_id = contract.create_trigger(sample_condition(), sample_payout());

        assert!(trigger_id.starts_with("trig_"));

        // Verify trigger was stored
        let trigger = contract.get_trigger(trigger_id.clone()).unwrap();
        assert_eq!(trigger.owner, user);
        assert_eq!(trigger.condition.flight_number, "AA1234");
        assert_eq!(trigger.status, Status::Active);
    }

    #[test]
    fn test_get_user_triggers() {
        let owner: AccountId = "owner.near".parse().unwrap();
        let user: AccountId = "alice.near".parse().unwrap();

        let context = get_context(owner.clone(), 0);
        testing_env!(context.build());

        let mut contract = TriggerPay::new(owner);

        // Create two triggers
        let context = get_context(user.clone(), 10 * MINIMUM_DEPOSIT);
        testing_env!(context.build());

        contract.create_trigger(sample_condition(), sample_payout());
        contract.create_trigger(sample_condition(), sample_payout());

        let triggers = contract.get_user_triggers(user);
        assert_eq!(triggers.len(), 2);
    }

    #[test]
    fn test_get_active_triggers() {
        let owner: AccountId = "owner.near".parse().unwrap();
        let user: AccountId = "alice.near".parse().unwrap();

        let context = get_context(owner.clone(), 0);
        testing_env!(context.build());

        let mut contract = TriggerPay::new(owner);

        let context = get_context(user.clone(), 10 * MINIMUM_DEPOSIT);
        testing_env!(context.build());

        contract.create_trigger(sample_condition(), sample_payout());

        let active = contract.get_active_triggers();
        assert_eq!(active.len(), 1);
        assert_eq!(active[0].status, Status::Active);
    }

    #[test]
    #[should_panic(expected = "Minimum deposit is 1 NEAR")]
    fn test_create_trigger_insufficient_deposit() {
        let owner: AccountId = "owner.near".parse().unwrap();
        let user: AccountId = "alice.near".parse().unwrap();

        let context = get_context(owner.clone(), 0);
        testing_env!(context.build());

        let mut contract = TriggerPay::new(owner);

        // Try to create with insufficient deposit
        let context = get_context(user, MINIMUM_DEPOSIT / 2);
        testing_env!(context.build());

        contract.create_trigger(sample_condition(), sample_payout());
    }

    #[test]
    #[should_panic(expected = "Invalid Ethereum address format")]
    fn test_create_trigger_invalid_address() {
        let owner: AccountId = "owner.near".parse().unwrap();
        let user: AccountId = "alice.near".parse().unwrap();

        let context = get_context(owner.clone(), 0);
        testing_env!(context.build());

        let mut contract = TriggerPay::new(owner);

        let context = get_context(user, 10 * MINIMUM_DEPOSIT);
        testing_env!(context.build());

        let mut payout = sample_payout();
        payout.address = "invalid_address".to_string();

        contract.create_trigger(sample_condition(), payout);
    }
}
