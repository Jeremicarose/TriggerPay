"use client";

/**
 * Triggers List Component
 *
 * Displays user's flight insurance triggers with status and actions.
 */

import { useWalletStore } from "@/store/wallet";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getUserTriggers, claimRefund } from "@/lib/near/contract";
import { formatNearAmount } from "@/lib/near/config";
import type { TriggerView, Status } from "@/types/contract";
import { useState } from "react";

// Format timestamp (nanoseconds) to readable date
function formatDate(nanos: number): string {
  const date = new Date(nanos / 1_000_000); // Convert ns to ms
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Format ETH amount from wei
function formatEth(weiString: string): string {
  const wei = BigInt(weiString);
  const eth = Number(wei) / 1e18;
  return eth.toFixed(4);
}

// Block explorer URLs per chain (Sepolia testnets)
const EXPLORER_URLS: Record<string, string> = {
  Ethereum: "https://sepolia.etherscan.io/tx/",
  Base: "https://sepolia.basescan.org/tx/",
  Arbitrum: "https://sepolia.arbiscan.io/tx/",
};

// Status badge component
function StatusBadge({ status }: { status: Status }) {
  const statusClasses = {
    Active: "status-active",
    Executed: "status-executed",
    Expired: "status-expired",
    Refunded: "status-refunded",
  };

  return (
    <span
      className={`px-2 py-1 rounded text-xs font-medium ${statusClasses[status]}`}
    >
      {status}
    </span>
  );
}

// Single trigger card
function TriggerCard({ trigger }: { trigger: TriggerView }) {
  const [isRefunding, setIsRefunding] = useState(false);
  const queryClient = useQueryClient();
  const { accountId } = useWalletStore();

  // Check if trigger is expired and can be refunded
  const now = Date.now() * 1_000_000; // Current time in nanoseconds
  const isExpired = trigger.status === "Active" && now > trigger.expires_at;

  const handleRefund = async () => {
    setIsRefunding(true);
    try {
      await claimRefund(trigger.id);
      queryClient.invalidateQueries({ queryKey: ["triggers", accountId] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    } catch (err) {
      console.error("Failed to claim refund:", err);
    } finally {
      setIsRefunding(false);
    }
  };

  return (
    <div className="glass-panel p-5 hover:border-[var(--slate)] transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="mono text-lg font-semibold text-[var(--white)]">
              {trigger.condition.flight_number}
            </span>
            <StatusBadge status={isExpired ? "Expired" : trigger.status} />
          </div>
          <p className="text-sm text-[var(--fog)]">
            {trigger.condition.flight_date}
          </p>
        </div>
        <div className="text-right">
          <p className="mono text-sm text-[var(--radar-cyan)]">
            {formatEth(trigger.payout.amount)} {trigger.payout.token}
          </p>
          <p className="text-xs text-[var(--fog)]">on {trigger.payout.chain}</p>
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
        <div>
          <p className="text-[var(--slate)] mb-1">Payout Address</p>
          <p className="mono text-[var(--cloud)] truncate" title={trigger.payout.address}>
            {trigger.payout.address.slice(0, 10)}...{trigger.payout.address.slice(-8)}
          </p>
        </div>
        <div>
          <p className="text-[var(--slate)] mb-1">Deposit</p>
          <p className="mono text-[var(--cloud)]">
            {formatNearAmount(trigger.funded_amount)} NEAR
          </p>
        </div>
        <div>
          <p className="text-[var(--slate)] mb-1">Created</p>
          <p className="text-[var(--cloud)]">{formatDate(trigger.created_at)}</p>
        </div>
        <div>
          <p className="text-[var(--slate)] mb-1">Expires</p>
          <p className="text-[var(--cloud)]">{formatDate(trigger.expires_at)}</p>
        </div>
      </div>

      {/* Trigger ID */}
      <div className="flex items-center justify-between pt-4 border-t border-[var(--steel)]">
        <span className="mono text-xs text-[var(--slate)]">{trigger.id}</span>

        {/* Refund button for expired triggers */}
        {isExpired && (
          <button
            onClick={handleRefund}
            disabled={isRefunding}
            className="text-sm text-[var(--warning-amber)] hover:underline"
          >
            {isRefunding ? "Processing..." : "Claim Refund"}
          </button>
        )}

        {/* Attestation count */}
        {trigger.attestation_count > 0 && (
          <span className="text-xs text-[var(--fog)]">
            {trigger.attestation_count} attestation{trigger.attestation_count > 1 ? "s" : ""}
          </span>
        )}
      </div>
    </div>
  );
}

export function TriggersList() {
  const { isConnected, accountId } = useWalletStore();

  // Fetch user's triggers
  const { data: triggers, isLoading, error } = useQuery({
    queryKey: ["triggers", accountId],
    queryFn: () => getUserTriggers(accountId!),
    enabled: isConnected && !!accountId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (!isConnected) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="glass-panel p-8 text-center">
        <div className="w-8 h-8 mx-auto mb-4 border-2 border-[var(--signal-green)] border-t-transparent rounded-full animate-spin" />
        <p className="text-[var(--fog)]">Loading your triggers...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-panel p-8 text-center">
        <p className="text-[var(--alert-red)]">Failed to load triggers</p>
      </div>
    );
  }

  if (!triggers || triggers.length === 0) {
    return (
      <div className="glass-panel p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--graphite)] flex items-center justify-center">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-[var(--fog)]"
          >
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-[var(--white)] mb-2">
          No Triggers Yet
        </h3>
        <p className="text-[var(--fog)]">
          Create your first flight insurance trigger above
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-[var(--white)] mb-4">
        Your Triggers ({triggers.length})
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {triggers.map((trigger) => (
          <TriggerCard key={trigger.id} trigger={trigger} />
        ))}
      </div>
    </div>
  );
}
