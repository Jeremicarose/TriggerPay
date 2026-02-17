/**
 * Chain Signatures EVM Setup (Serverless-compatible)
 *
 * Derives ETH addresses and signs transactions via NEAR MPC contract.
 */

import { contracts, chainAdapters, type RSVSignature } from "chainsig.js";
import { createPublicClient, http } from "viem";
import { connect, keyStores, KeyPair } from "near-api-js";

const RPC_URLS: Record<string, string> = {
  Ethereum: "https://ethereum-sepolia-rpc.publicnode.com",
  Base: "https://sepolia.base.org",
  Arbitrum: "https://sepolia-rollup.arbitrum.io/rpc",
};

export const DERIVATION_PATHS: Record<string, string> = {
  Ethereum: "ethereum-1",
  Base: "base-1",
  Arbitrum: "arbitrum-1",
};

const MPC_CONTRACT = new contracts.ChainSignatureContract({
  networkId: "testnet",
  contractId: "v1.signer-prod.testnet",
});

export function getEvmAdapter(chain: string) {
  const rpcUrl = RPC_URLS[chain] || RPC_URLS.Ethereum;
  const publicClient = createPublicClient({ transport: http(rpcUrl) });
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
    nodeUrl: "https://rpc.testnet.near.org",
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
