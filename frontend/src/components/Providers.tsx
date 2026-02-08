"use client";

/**
 * App Providers
 *
 * Wraps the app with necessary providers:
 * - React Query for data fetching/caching
 * - Wallet initialization effect
 * - Modal CSS for wallet selector
 */

import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useWalletStore } from "@/store/wallet";

// Import wallet selector modal styles
import "@near-wallet-selector/modal-ui/styles.css";

// Create a query client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // Data considered fresh for 30 seconds
      retry: 2,
    },
  },
});

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const initialize = useWalletStore((state) => state.initialize);

  // Initialize wallet on app load
  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
