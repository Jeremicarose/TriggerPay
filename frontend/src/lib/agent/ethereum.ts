/**
 * Chain Signatures EVM Setup (Serverless-compatible)
 *
 * Derives ETH addresses and signs transactions via NEAR MPC contract.
 * Injects a custom NEAR RPC provider that uses native fetch() to work
 * around @near-js/providers bundling issues in Vercel's serverless runtime.
 */

import { contracts, chainAdapters, type RSVSignature } from "chainsig.js";
import { createPublicClient, http, fallback } from "viem";
import {
  JsonRpcProvider,
  FailoverRpcProvider,
} from "@near-js/providers";
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
const MPC_CONTRACT_ID = "v1.signer-prod.testnet";

/**
 * Create a JsonRpcProvider with sendJsonRpc overridden to use
 * the global fetch() explicitly. This ensures compatibility with
 * Vercel's serverless runtime where the bundled fetch_json.cjs
 * may not resolve fetch correctly.
 */
function createNativeFetchProvider(url: string): JsonRpcProvider {
  const provider = new JsonRpcProvider({ url });

  // Override sendJsonRpc to use global fetch() directly
  (provider as any).sendJsonRpc = async function (
    method: string,
    params: any
  ) {
    const body = JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method,
      params,
    });

    const res = await globalThis.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    if (!res.ok) {
      throw new Error(`RPC ${res.status}: ${url}`);
    }

    const json = (await res.json()) as any;

    if (json.error) {
      const data = json.error.data;
      if (data && typeof data === "object" && data.error_message) {
        throw new Error(data.error_message);
      }
      throw new Error(
        typeof json.error === "string"
          ? json.error
          : json.error.message || JSON.stringify(json.error)
      );
    }

    return json.result;
  };

  return provider;
}

/**
 * Create the MPC contract with a native-fetch-compatible provider.
 */
function createMPCContract() {
  const contract = new contracts.ChainSignatureContract({
    networkId: "testnet",
    contractId: MPC_CONTRACT_ID,
  });

  // Inject our native-fetch provider into the contract
  const nativeProvider = createNativeFetchProvider(NEAR_RPC_URL);
  const failoverProvider = new FailoverRpcProvider(
    [nativeProvider] as any
  );
  (contract as any).provider = failoverProvider;

  return contract;
}

const MPC_CONTRACT = createMPCContract();

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
