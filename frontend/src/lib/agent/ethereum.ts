/**
 * Chain Signatures EVM Setup (Serverless-compatible)
 *
 * Derives ETH addresses and signs transactions via NEAR MPC contract.
 * Uses native fetch for NEAR RPC calls (the @near-js/providers HTTP
 * client fails in Vercel's serverless runtime).
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
const MPC_CONTRACT_ID = "v1.signer-prod.testnet";

/**
 * Make a NEAR RPC call using native fetch (works in all environments).
 */
async function nearRpc(method: string, params: Record<string, any>): Promise<any> {
  const res = await fetch(NEAR_RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: `${Date.now()}`,
      method,
      params,
    }),
  });
  const json = (await res.json()) as any;
  if (json.error) {
    throw new Error(json.error.message || JSON.stringify(json.error));
  }
  return json.result;
}

/**
 * Create an MPC contract with a provider patched to use native fetch.
 */
function createPatchedMPCContract() {
  const contract = new contracts.ChainSignatureContract({
    networkId: "testnet",
    contractId: MPC_CONTRACT_ID,
  });

  // Replace the FailoverRpcProvider's core method with native fetch
  const providerProxy = (contract as any).provider;

  // Patch callFunction to use native fetch directly
  providerProxy.callFunction = async function (
    contractId: string,
    methodName: string,
    args: any
  ) {
    let argsBase64: string;
    if (!args || (typeof args === "object" && Object.keys(args).length === 0)) {
      argsBase64 = "e30="; // base64 of "{}"
    } else if (typeof args === "string") {
      argsBase64 = Buffer.from(args).toString("base64");
    } else if (args instanceof Uint8Array || Buffer.isBuffer(args)) {
      argsBase64 = Buffer.from(args).toString("base64");
    } else {
      argsBase64 = Buffer.from(JSON.stringify(args)).toString("base64");
    }

    const rpcResult = await nearRpc("query", {
      request_type: "call_function",
      finality: "final",
      account_id: contractId,
      method_name: methodName,
      args_base64: argsBase64,
    });

    if (rpcResult.error) {
      throw new Error(`NEAR view call failed: ${rpcResult.error}`);
    }

    if (!rpcResult.result) {
      throw new Error(
        `NEAR view call returned no result. Keys: ${Object.keys(rpcResult).join(",")}`
      );
    }

    const resultStr = Buffer.from(rpcResult.result).toString("utf-8");
    return JSON.parse(resultStr);
  };

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
