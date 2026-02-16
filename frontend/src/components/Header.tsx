"use client";

/**
 * Header Component
 *
 * Displays navigation, stats, and wallet connection controls.
 * Aviation-inspired design with status indicators.
 */

import { useWalletStore } from "@/store/wallet";
import { useQuery } from "@tanstack/react-query";
import { getStats } from "@/lib/near/contract";

export function Header() {
  const { isConnected, accountId, isLoading, connect, disconnect } = useWalletStore();

  // Fetch contract stats
  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: getStats,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Truncate account ID for display (alice.near -> alice.n...)
  const displayAccount = accountId
    ? accountId.length > 20
      ? `${accountId.slice(0, 16)}...`
      : accountId
    : null;

  return (
    <header className="glass-panel px-6 py-4 mb-8">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--signal-green)] to-[var(--radar-cyan)] flex items-center justify-center">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-[var(--void)]"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--white)]">TriggerPay</h1>
            <p className="text-xs text-[var(--fog)]">Conditional Payments on NEAR</p>
          </div>
        </div>

        {/* Stats */}
        <div className="hidden md:flex items-center gap-8">
          <div className="text-center">
            <p className="mono text-lg font-semibold text-[var(--white)]">
              {stats?.total ?? "—"}
            </p>
            <p className="text-xs text-[var(--fog)]">Total Triggers</p>
          </div>
          <div className="text-center">
            <p className="mono text-lg font-semibold text-[var(--signal-green)]">
              {stats?.active ?? "—"}
            </p>
            <p className="text-xs text-[var(--fog)]">Active</p>
          </div>
          <div className="text-center">
            <p className="mono text-lg font-semibold text-[var(--radar-cyan)]">
              {stats?.executed ?? "—"}
            </p>
            <p className="text-xs text-[var(--fog)]">Executed</p>
          </div>
        </div>

        {/* Wallet Connection */}
        <div className="flex items-center gap-4">
          {isConnected && displayAccount && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--graphite)]">
              <div className="w-2 h-2 rounded-full bg-[var(--signal-green)] pulse" />
              <span className="mono text-sm text-[var(--cloud)]">{displayAccount}</span>
            </div>
          )}

          {isConnected ? (
            <button
              onClick={disconnect}
              disabled={isLoading}
              className="btn-secondary text-sm"
            >
              {isLoading ? "..." : "Disconnect"}
            </button>
          ) : (
            <button
              onClick={connect}
              disabled={isLoading}
              className="btn-primary text-sm"
            >
              {isLoading ? "Connecting..." : "Connect Wallet"}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
