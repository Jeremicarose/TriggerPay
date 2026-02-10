/**
 * Chain Signatures EVM Setup
 *
 * Configures the Chain Signatures adapter for signing and broadcasting
 * ETH transfer transactions on Sepolia (or Base/Arbitrum).
 */

import { contracts, chainAdapters } from "chainsig.js";
import { createPublicClient, http } from "viem";

// RPC endpoints per chain
const RPC_URLS: Record<string, string> = {
  Ethereum: "https://sepolia.drpc.org",
  Base: "https://sepolia.base.org",
  Arbitrum: "https://sepolia-rollup.arbitrum.io/rpc",
};

// Derivation paths per chain (deterministic address per chain)
export const DERIVATION_PATHS: Record<string, string> = {
  Ethereum: "ethereum-1",
  Base: "base-1",
  Arbitrum: "arbitrum-1",
};

// MPC signer contract on NEAR testnet
const MPC_CONTRACT = new contracts.ChainSignatureContract({
  networkId: "testnet",
  contractId: "v1.signer-prod.testnet",
});

/**
 * Get an EVM chain adapter for the given chain name.
 */
export function getEvmAdapter(chain: string) {
  const rpcUrl = RPC_URLS[chain] || RPC_URLS.Ethereum;
  const publicClient = createPublicClient({ transport: http(rpcUrl) });

  return new chainAdapters.evm.EVM({
    publicClient,
    contract: MPC_CONTRACT,
  }) as any;
}

/**
 * Derive the ETH address controlled by this agent for a given chain.
 */
export async function derivePayoutAddress(
  contractId: string,
  chain: string
): Promise<{ address: string }> {
  const evm = getEvmAdapter(chain);
  const path = DERIVATION_PATHS[chain] || DERIVATION_PATHS.Ethereum;
  return evm.deriveAddressAndPublicKey(contractId, path);
}
