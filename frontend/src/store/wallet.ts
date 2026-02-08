/**
 * Wallet State Store
 *
 * Uses Zustand to manage wallet connection state globally.
 * Components can subscribe to this store to react to wallet changes.
 */

import { create } from "zustand";
import {
  initWallet,
  getAccountId,
  openWalletModal,
  signOut as walletSignOut,
  getWalletSelector,
} from "@/lib/near/wallet";

interface WalletState {
  // State
  isInitialized: boolean;
  isConnected: boolean;
  accountId: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  connect: () => void;
  disconnect: () => Promise<void>;
  clearError: () => void;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  // Initial state
  isInitialized: false,
  isConnected: false,
  accountId: null,
  isLoading: false,
  error: null,

  /**
   * Initialize wallet selector and check for existing connection
   * Call this once when the app loads
   */
  initialize: async () => {
    if (get().isInitialized) return;

    set({ isLoading: true });

    try {
      // Initialize wallet selector
      const selector = await initWallet();

      // Check for existing connection
      const accountId = await getAccountId();

      // Subscribe to wallet state changes
      selector.store.observable.subscribe(async (state) => {
        const accounts = state.accounts;
        if (accounts.length > 0) {
          set({
            isConnected: true,
            accountId: accounts[0].accountId,
          });
        } else {
          set({
            isConnected: false,
            accountId: null,
          });
        }
      });

      set({
        isInitialized: true,
        isConnected: accountId !== null,
        accountId,
        isLoading: false,
      });
    } catch (error) {
      console.error("Failed to initialize wallet:", error);
      set({
        isLoading: false,
        error: "Failed to initialize wallet connection",
      });
    }
  },

  /**
   * Open wallet connection modal
   */
  connect: () => {
    const selector = getWalletSelector();
    if (!selector) {
      set({ error: "Wallet not initialized" });
      return;
    }
    openWalletModal();
  },

  /**
   * Disconnect from wallet
   */
  disconnect: async () => {
    set({ isLoading: true });

    try {
      await walletSignOut();
      set({
        isConnected: false,
        accountId: null,
        isLoading: false,
      });
    } catch (error) {
      console.error("Failed to disconnect:", error);
      set({
        isLoading: false,
        error: "Failed to disconnect wallet",
      });
    }
  },

  /**
   * Clear any error messages
   */
  clearError: () => {
    set({ error: null });
  },
}));
