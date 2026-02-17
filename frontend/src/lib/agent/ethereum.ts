/**
 * Chain Signatures EVM Setup (Serverless-compatible)
 *
 * Derives ETH addresses and signs transactions via NEAR MPC contract.
 * Uses a patched NEAR RPC provider that works in Vercel's serverless runtime.
 */

import { contracts, chainAdapters, type RSVSignature } from "chainsig.js";
import { createPublicClient, http, fallback } from "viem";
import { connect, keyStores, KeyPair } from "near-api-js";

const SEPOLIA_RPCS = [
  "https://ethereum-sepolia-rpc.publicnode.com",
  "https://rpc.sepolia.org",
  "https://sepolia.drpc.org",
];

const RPC_URLS: Record<string, string[]> = {
  Ethereum: SEPOLIA_RPCS,
  Base: ["https://sepolia.base.org"],
  Arbitrum: ["https://sepolia-rollup.arbitrum.io/rpc"],
};

export const DERIVATION_PATHS: Record<string, string> = {
  Ethereum: "ethereum-1",
  Base: "base-1",
  Arbitrum: "arbitrum-1",
};

const NEAR_RPC_URL = "https://rpc.testnet.near.org";

/**
 * Create a NEAR RPC provider that uses native fetch (works on Vercel).
 * The @near-js/providers package uses an HTTP client that fails in
 * serverless environments, so we patch the individual providers.
 */
function createPatchedMPCContract() {
  const contract = new contracts.ChainSignatureContract({
    networkId: "testnet",
    contractId: "v1.signer-prod.testnet",
  });

  // Patch each provider's sendJsonRpc to use native fetch
  const contractAny = contract as any;
  for (const provider of contractAny.provider.providers) {
    const rpcUrl = provider.connection?.url || NEAR_RPC_URL;
    provider.sendJsonRpc = async function (method: string, params: any) {
      const res = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: `${Date.now()}`,
          method,
          params,
        }),
      });
      const json = await res.json() as any;
      if (json.error) {
        const msg = typeof json.error === "string"
          ? json.error
          : json.error.message || JSON.stringify(json.error);
        throw new Error(msg);
      }
      return json.result;
    };
  }

  return contract;
}

const MPC_CONTRACT = createPatchedMPCContract();

export function getEvmAdapter(chain: string) {
  const rpcs = RPC_URLS[chain] || RPC_URLS.Ethereum;
  const transport =
    rpcs.length === 1
      ? http(rpcs[0])
      : fallback(rpcs.map((url) => http(url)));
  const publicClient = createPublicClient({ transport });
  return new chainAdapters.evm.EVM({
    publicClient,
    contract: MPC_CONTRACT,
  }) as any;
}

export async function signWithMPC(args: {
  path: string;
  payload: number[] | Uint8Array;
  keyType?: "Ecdsa" | "Eddsa";
}): Promise<RSVSignature> {
  const accountId = process.env.NEAR_ACCOUNT_ID;
  const privateKey = process.env.NEAR_PRIVATE_KEY;

  if (!accountId || !privateKey) {
    throw new Error("NEAR_ACCOUNT_ID and NEAR_PRIVATE_KEY must be set");
  }

  const keyStore = new keyStores.InMemoryKeyStore();
  const keyPair = KeyPair.fromString(privateKey as any);
  await keyStore.setKey("testnet", accountId, keyPair);

  const near = await connect({
    networkId: "testnet",
    keyStore,
    nodeUrl: NEAR_RPC_URL,
  });

  const account = await near.account(accountId);

  const signerAccount = {
    accountId,
    signAndSendTransactions: async ({
      transactions,
    }: {
      transactions: Array<{ receiverId: string; actions: any[] }>;
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

  const signatures = await MPC_CONTRACT.sign({
    payloads: [args.payload],
    path: args.path,
    keyType: args.keyType || "Ecdsa",
    signerAccount: signerAccount as any,
  });

  return signatures[0];
}
