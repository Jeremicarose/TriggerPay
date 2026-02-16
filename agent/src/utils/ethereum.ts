/**
 * Chain Signatures EVM Setup
 *
 * Configures the Chain Signatures adapter for signing and broadcasting
 * ETH transfer transactions on Sepolia (or Base/Arbitrum).
 *
 * Supports direct MPC signing via NEAR RPC (no sidecar needed).
 */

import { contracts, chainAdapters, type RSVSignature } from "chainsig.js";
import { createPublicClient, http } from "viem";
import { connect, keyStores, KeyPair } from "near-api-js";

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

/**
 * Sign a payload via the NEAR MPC contract directly (no sidecar needed).
 * Uses near-api-js to send a function call to v1.signer-prod.testnet.
 */
export async function signWithMPC(args: {
  path: string;
  payload: number[] | Uint8Array;
  keyType?: "Ecdsa" | "Eddsa";
}): Promise<RSVSignature> {
  const accountId = process.env.NEAR_ACCOUNT_ID;
  const privateKey = process.env.NEAR_PRIVATE_KEY;

  if (!accountId || !privateKey) {
    throw new Error(
      "NEAR_ACCOUNT_ID and NEAR_PRIVATE_KEY must be set for direct MPC signing"
    );
  }

  // Set up in-memory key store with the agent's NEAR credentials
  const keyStore = new keyStores.InMemoryKeyStore();
  const keyPair = KeyPair.fromString(privateKey as any);
  await keyStore.setKey("testnet", accountId, keyPair);

  const near = await connect({
    networkId: "testnet",
    keyStore,
    nodeUrl: "https://rpc.testnet.near.org",
  });

  const account = await near.account(accountId);

  // Create the signerAccount adapter that ChainSignatureContract.sign() expects
  const signerAccount = {
    accountId,
    signAndSendTransactions: async ({
      transactions,
    }: {
      transactions: Array<{
        signerId?: string;
        receiverId: string;
        actions: any[];
      }>;
    }) => {
      const results = [];
      for (const tx of transactions) {
        const result = await account.signAndSendTransaction({
          receiverId: tx.receiverId,
          actions: tx.actions,
        });
        results.push(result);
      }
      return results;
    },
  };

  console.log("[mpc] Requesting signature from v1.signer-prod.testnet...");

  const signatures = await MPC_CONTRACT.sign({
    payloads: [args.payload],
    path: args.path,
    keyType: args.keyType || "Ecdsa",
    signerAccount: signerAccount as any,
  });

  console.log("[mpc] Signature received");
  return signatures[0];
}
