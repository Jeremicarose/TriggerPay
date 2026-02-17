/**
 * Chain Signatures EVM Setup (Serverless-compatible)
 *
 * Derives ETH addresses and signs transactions via NEAR MPC contract.
 * Injects a custom NEAR RPC provider that uses native fetch() to work
 * around @near-js/providers bundling issues in Vercel's serverless runtime.
 */

import { contracts, chainAdapters, type RSVSignature } from "chainsig.js";
import { createPublicClient, http, fallback } from "viem";
// Note: we don't import @near-js/providers — we provide a custom
// provider object using globalThis.fetch to avoid bundling issues.
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
/**
 * Helper: call NEAR RPC using globalThis.fetch directly.
 */
async function nearJsonRpc(url: string, method: string, params: any) {
  const res = await globalThis.fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
  });
  if (!res.ok) throw new Error(`RPC ${res.status}: ${url}`);
  const json = (await res.json()) as any;
  if (json.error) {
    const data = json.error?.data;
    if (data?.error_message) throw new Error(data.error_message);
    throw new Error(json.error.message || JSON.stringify(json.error));
  }
  return json.result;
}

/**
 * Custom NEAR RPC provider using globalThis.fetch.
 * Implements the same interface as FailoverRpcProvider so chainsig.js
 * can use it directly without the bundled @near-js/providers.
 */
function createNativeFetchProvider(url: string) {
  return {
    // Core method used by FailoverRpcProvider.withBackoff
    callFunction: async (
      contractId: string,
      methodName: string,
      args: any
    ) => {
      const argsBase64 =
        args && typeof args === "object" && Object.keys(args).length > 0
          ? Buffer.from(JSON.stringify(args)).toString("base64")
          : "e30=";
      const result = await nearJsonRpc(url, "query", {
        request_type: "call_function",
        finality: "final",
        account_id: contractId,
        method_name: methodName,
        args_base64: argsBase64,
      });
      return JSON.parse(Buffer.from(result.result).toString("utf-8"));
    },

    query: async (params: any) => nearJsonRpc(url, "query", params),
    sendJsonRpc: (method: string, params: any) =>
      nearJsonRpc(url, method, params),
    status: async () => nearJsonRpc(url, "status", []),
  };
}

/**
 * Create a mock FailoverRpcProvider that delegates to our native-fetch provider.
 */
function createNativeFailoverProvider(url: string) {
  const inner = createNativeFetchProvider(url);

  // Implements the FailoverRpcProvider interface
  return {
    providers: [inner],
    currentProviderIndex: 0,
    get currentProvider() {
      return inner;
    },
    switchToNextProvider() {},
    // withBackoff just calls the inner provider directly
    async withBackoff(getResult: (provider: any) => Promise<any>) {
      return getResult(inner);
    },
    // Delegate all methods
    callFunction: inner.callFunction,
    query: inner.query,
    sendJsonRpc: inner.sendJsonRpc,
    status: inner.status,
  };
}

function createMPCContract() {
  const contract = new contracts.ChainSignatureContract({
    networkId: "testnet",
    contractId: MPC_CONTRACT_ID,
  });

  // Replace the entire provider with our native-fetch implementation
  (contract as any).provider = createNativeFailoverProvider(NEAR_RPC_URL);

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
