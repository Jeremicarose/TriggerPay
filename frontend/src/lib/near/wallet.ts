/**
 * NEAR Wallet Connection
 *
 * This module handles wallet connection using NEAR Wallet Selector.
 * Users can connect with MyNearWallet or Meteor Wallet.
 */

import { setupWalletSelector, WalletSelector } from "@near-wallet-selector/core";
import { setupModal, WalletSelectorModal } from "@near-wallet-selector/modal-ui";
import { setupMyNearWallet } from "@near-wallet-selector/my-near-wallet";
import { setupMeteorWallet } from "@near-wallet-selector/meteor-wallet";
import { CONTRACT_ID, NETWORK_ID } from "./config";

// Global instances (singleton pattern)
let walletSelector: WalletSelector | null = null;
let modal: WalletSelectorModal | null = null;

/**
 * Initialize the wallet selector
 * This sets up the connection to NEAR and available wallet options
 */
export async function initWallet(): Promise<WalletSelector> {
  // Return existing instance if already initialized
  if (walletSelector) {
    return walletSelector;
  }

  // Setup wallet selector with available wallets
  walletSelector = await setupWalletSelector({
    network: NETWORK_ID,
    modules: [
      setupMyNearWallet(),    // Browser-based wallet
      setupMeteorWallet(),    // Mobile-friendly wallet
    ],
  });

  // Setup the modal UI for wallet selection
  // No contractId needed — triggers are managed by the agent API, not a NEAR contract
  modal = setupModal(walletSelector, {});

  return walletSelector;
}

/**
 * Get the wallet selector instance
 */
export function getWalletSelector(): WalletSelector | null {
  return walletSelector;
}

/**
 * Open the wallet connection modal
 * This shows a popup where users can choose their wallet
 */
export function openWalletModal(): void {
  if (modal) {
    modal.show();
  } else {
    console.error("Wallet modal not initialized. Call initWallet() first.");
  }
}

/**
 * Get the currently connected account ID
 * Returns null if no wallet is connected
 */
export async function getAccountId(): Promise<string | null> {
  if (!walletSelector) {
    return null;
  }

  const state = walletSelector.store.getState();
  const accounts = state.accounts;

  if (accounts.length > 0) {
    return accounts[0].accountId;
  }

  return null;
}

/**
 * Check if a wallet is currently connected
 */
export async function isSignedIn(): Promise<boolean> {
  const accountId = await getAccountId();
  return accountId !== null;
}

/**
 * Sign out from the connected wallet
 */
export async function signOut(): Promise<void> {
  if (!walletSelector) {
    return;
  }

  const wallet = await walletSelector.wallet();
  await wallet.signOut();
}

/**
 * Get the current wallet instance for making transactions
 */
export async function getWallet() {
  if (!walletSelector) {
    throw new Error("Wallet not initialized");
  }
  return await walletSelector.wallet();
}
