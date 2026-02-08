/**
 * NEAR Configuration
 *
 * This file configures our connection to the NEAR blockchain.
 * We use testnet for development, mainnet for production.
 */

// Our deployed contract address
export const CONTRACT_ID = "triggerpay.testnet";


// Network configuration
export const NETWORK_ID = "testnet";

// NEAR RPC endpoints
export const NODE_URL = "https://rpc.testnet.near.org";
export const WALLET_URL = "https://testnet.mynearwallet.com";
export const HELPER_URL = "https://helper.testnet.near.org";
export const EXPLORER_URL = "https://testnet.nearblocks.io";

// Gas limits for contract calls (in TGas = 10^12 gas units)
export const GAS_FOR_CREATE_TRIGGER = "100000000000000"; // 100 TGas
export const GAS_FOR_CLAIM_REFUND = "50000000000000";    // 50 TGas

// Minimum deposit required (1 NEAR in yoctoNEAR)
export const MINIMUM_DEPOSIT = "1000000000000000000000000";

// Helper to format yoctoNEAR to NEAR (for display)
export function formatNearAmount(yoctoNear: string): string {
  const near = BigInt(yoctoNear) / BigInt("1000000000000000000000000");
  const remainder = BigInt(yoctoNear) % BigInt("1000000000000000000000000");
  const decimal = remainder.toString().padStart(24, "0").slice(0, 2);
  return `${near}.${decimal}`;
}

// Helper to convert NEAR to yoctoNEAR (for contract calls)
export function parseNearAmount(nearAmount: string): string {
  const [whole, decimal = ""] = nearAmount.split(".");
  const paddedDecimal = decimal.padEnd(24, "0").slice(0, 24);
  return whole + paddedDecimal;
}

// Explorer link for transactions
export function getExplorerTxUrl(txHash: string): string {
  return `${EXPLORER_URL}/txns/${txHash}`;
}

// Explorer link for accounts
export function getExplorerAccountUrl(accountId: string): string {
  return `${EXPLORER_URL}/address/${accountId}`;
}
