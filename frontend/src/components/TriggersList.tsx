"use client";

/**
 * Triggers List Component
 *
 * Displays all triggers with rich policy-card design:
 * - Flight route + date
 * - Payout amount and destination prominently shown
 * - Status with visual distinction (Active=monitoring, Executed=paid)
 * - Etherscan link for executed payouts
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAllTriggers, claimRefund } from "@/lib/near/contract";
import type { TriggerView, Status } from "@/types/contract";
import { useState } from "react";

// Block explorer URLs per chain (Sepolia testnets)
const EXPLORER_URLS: Record<string, string> = {
  Ethereum: "https://sepolia.etherscan.io/tx/",
  Base: "https://sepolia.basescan.org/tx/",
  Arbitrum: "https://sepolia.arbiscan.io/tx/",
};

// Format ETH amount from wei string
function formatEth(weiString: string): string {
  const wei = BigInt(weiString);
  const eth = Number(wei) / 1e18;
  if (eth >= 1) return eth.toFixed(2);
  if (eth >= 0.01) return eth.toFixed(3);
  return eth.toFixed(4);
}

// Format timestamp (nanoseconds) to readable date
function formatDate(nanos: number): string {
  const date = new Date(nanos / 1_000_000);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Truncate address for display
function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

// Status config for visual styling
const STATUS_CONFIG: Record<
  Status,
  { label: string; icon: string; color: string; bg: string; border: string }
> = {
  Active: {
    label: "Monitoring",
    icon: "pulse",
    color: "var(--signal-green)",
    bg: "rgba(0,255,136,0.08)",
    border: "rgba(0,255,136,0.3)",
  },
  Executed: {
    label: "Paid Out",
    icon: "check",
    color: "var(--radar-cyan)",
    bg: "rgba(0,212,255,0.08)",
    border: "rgba(0,212,255,0.3)",
  },
  Expired: {
    label: "Expired",
    icon: "x",
    color: "var(--alert-red)",
    bg: "rgba(255,71,87,0.08)",
    border: "rgba(255,71,87,0.3)",
  },
  Refunded: {
    label: "Refunded",
    icon: "return",
    color: "var(--warning-amber)",
    bg: "rgba(255,184,0,0.08)",
    border: "rgba(255,184,0,0.3)",
  },
};

function TriggerCard({ trigger }: { trigger: TriggerView }) {
  const [isRefunding, setIsRefunding] = useState(false);
  const queryClient = useQueryClient();

  const status = STATUS_CONFIG[trigger.status] || STATUS_CONFIG.Active;
  const explorerUrl = EXPLORER_URLS[trigger.payout.chain] || EXPLORER_URLS.Ethereum;

  const handleRefund = async () => {
    setIsRefunding(true);
    try {
      await claimRefund(trigger.id);
      queryClient.invalidateQueries({ queryKey: ["triggers"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    } catch (err) {
      console.error("Failed to claim refund:", err);
    } finally {
      setIsRefunding(false);
    }
  };

  const isExecuted = trigger.status === "Executed";

  return (
    <div
      className="glass-panel overflow-hidden transition-all hover:border-[var(--slate)]"
      style={{
        borderColor: isExecuted ? status.border : undefined,
      }}
    >
      {/* Top status bar */}
      <div
        className="flex items-center justify-between px-5 py-2.5"
        style={{ background: status.bg }}
      >
        <div className="flex items-center gap-2">
          {trigger.status === "Active" && (
            <span
              className="w-2 h-2 rounded-full pulse"
              style={{ background: status.color }}
            />
          )}
          {isExecuted && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={status.color} strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: status.color }}>
            {status.label}
          </span>
        </div>
        <span className="mono text-xs" style={{ color: "var(--slate)" }}>
          {trigger.id}
        </span>
      </div>

      <div className="p-5">
        {/* Flight info row */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--graphite)] flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--fog)" strokeWidth="1.5">
                <path d="M22 2L11 13" />
                <path d="M22 2L15 22l-4-9-9-4 20-7z" />
              </svg>
            </div>
            <div>
              <p className="mono text-lg font-bold text-[var(--white)]">
                {trigger.condition.flight_number}
              </p>
              <p className="text-xs text-[var(--fog)]">
                {trigger.condition.flight_date}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-[var(--fog)] mb-0.5">Condition</p>
            <p className="text-sm font-medium text-[var(--cloud)]">
              Flight Cancellation
            </p>
          </div>
        </div>

        {/* Payout details - the main visual element */}
        <div
          className="rounded-xl p-4 mb-4"
          style={{
            background: isExecuted
              ? "linear-gradient(135deg, rgba(0,212,255,0.06), rgba(0,255,136,0.06))"
              : "var(--graphite)",
            border: `1px solid ${isExecuted ? "rgba(0,212,255,0.2)" : "var(--steel)"}`,
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[var(--fog)] mb-1">
                {isExecuted ? "Payout Sent" : "Payout Amount"}
              </p>
              <p className="mono text-2xl font-bold" style={{ color: isExecuted ? "var(--radar-cyan)" : "var(--white)" }}>
                {formatEth(trigger.payout.amount)}{" "}
                <span className="text-sm font-normal text-[var(--fog)]">{trigger.payout.token}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[var(--fog)] mb-1">Chain</p>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--steel)] text-[var(--cloud)]">
                {trigger.payout.chain}
              </span>
            </div>
          </div>

          {/* Destination address */}
          <div className="mt-3 pt-3 border-t" style={{ borderColor: isExecuted ? "rgba(0,212,255,0.15)" : "var(--steel)" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--fog)]">To:</span>
                <span className="mono text-sm text-[var(--cloud)]">
                  {shortAddr(trigger.payout.address)}
                </span>
              </div>
              {trigger.attestation_count > 0 && (
                <span className="text-xs text-[var(--fog)]">
                  {trigger.attestation_count} check{trigger.attestation_count > 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Executed: Etherscan link */}
        {trigger.executed_tx && (
          <a
            href={`${explorerUrl}${trigger.executed_tx}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3.5 rounded-xl transition-colors"
            style={{
              background: "rgba(0,212,255,0.06)",
              border: "1px solid rgba(0,212,255,0.2)",
            }}
          >
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--radar-cyan)" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              <span className="text-sm font-semibold" style={{ color: "var(--radar-cyan)" }}>
                View on Etherscan
              </span>
            </div>
            <span className="mono text-xs text-[var(--fog)]">
              {trigger.executed_tx.slice(0, 10)}...{trigger.executed_tx.slice(-6)}
            </span>
          </a>
        )}

        {/* Active: monitoring indicator */}
        {trigger.status === "Active" && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-[rgba(0,255,136,0.04)] border border-[rgba(0,255,136,0.15)]">
            <div className="w-2 h-2 rounded-full bg-[var(--signal-green)] pulse" />
            <span className="text-xs text-[var(--signal-green)]">
              Agent monitoring flight status every 15s
            </span>
          </div>
        )}

        {/* Footer: timestamps */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--steel)]">
          <span className="text-xs text-[var(--slate)]">
            Created {formatDate(trigger.created_at)}
          </span>
          {trigger.status === "Active" && (
            <button
              onClick={handleRefund}
              disabled={isRefunding}
              className="text-xs text-[var(--alert-red)] hover:underline"
            >
              {isRefunding ? "Cancelling..." : "Cancel Trigger"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function TriggersList() {
  // Fetch ALL triggers (not filtered by wallet)
  const { data: triggers, isLoading, error } = useQuery({
    queryKey: ["triggers"],
    queryFn: getAllTriggers,
    refetchInterval: 5000, // Refresh every 5 seconds for demo responsiveness
  });

  if (isLoading) {
    return (
      <div className="glass-panel p-8 text-center">
        <div className="w-8 h-8 mx-auto mb-4 border-2 border-[var(--signal-green)] border-t-transparent rounded-full animate-spin" />
        <p className="text-[var(--fog)]">Loading triggers...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-panel p-8 text-center">
        <p className="text-[var(--alert-red)]">Failed to load triggers</p>
        <p className="text-xs text-[var(--slate)] mt-1">Check your connection and try again</p>
      </div>
    );
  }

  if (!triggers || triggers.length === 0) {
    return (
      <div className="glass-panel p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--graphite)] flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--fog)" strokeWidth="1.5">
            <path d="M22 2L11 13" />
            <path d="M22 2L15 22l-4-9-9-4 20-7z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-[var(--white)] mb-2">
          No Triggers Yet
        </h3>
        <p className="text-sm text-[var(--fog)]">
          Create a trigger above to start monitoring
        </p>
      </div>
    );
  }

  // Sort: active first, then executed (most recent first)
  const sorted = [...triggers].sort((a, b) => {
    if (a.status === "Active" && b.status !== "Active") return -1;
    if (a.status !== "Active" && b.status === "Active") return 1;
    return b.created_at - a.created_at;
  });

  const activeCount = triggers.filter((t) => t.status === "Active").length;
  const executedCount = triggers.filter((t) => t.status === "Executed").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-[var(--white)]">
          Triggers
        </h2>
        <div className="flex items-center gap-3">
          {activeCount > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-[var(--signal-green)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--signal-green)] pulse" />
              {activeCount} active
            </span>
          )}
          {executedCount > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-[var(--radar-cyan)]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {executedCount} paid
            </span>
          )}
        </div>
      </div>
      <div className="space-y-4">
        {sorted.map((trigger) => (
          <TriggerCard key={trigger.id} trigger={trigger} />
        ))}
      </div>
    </div>
  );
}
