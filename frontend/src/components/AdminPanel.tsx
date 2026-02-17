"use client";

/**
 * Demo Control Panel
 *
 * The "visceral demo moment" component for judges:
 * - Shows agent status + derived ETH address with balance
 * - Cancel flight buttons for active triggers
 * - Real-time activity feed with color-coded entries
 * - Monitor cycle button
 */

import { useState, useEffect, useCallback } from "react";
import { runMonitorCycle, getMonitorActivity, getAllTriggers } from "@/lib/near/contract";
import type { TriggerView } from "@/types/contract";
import { useQueryClient } from "@tanstack/react-query";

const AGENT_BASE = "/api/agent";

interface ActivityEntry {
  timestamp: string;
  triggerId: string;
  flight: string;
  status: string;
  conditionMet: boolean;
  txHash?: string;
}

interface AgentEthAccount {
  address: string;
  balance: number;
  chain: string;
}

export function AdminPanel() {
  const [triggers, setTriggers] = useState<TriggerView[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [ethAccount, setEthAccount] = useState<AgentEthAccount | null>(null);
  const [isCancelling, setIsCancelling] = useState<string | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [agentOnline, setAgentOnline] = useState(false);
  const queryClient = useQueryClient();

  // Fetch active triggers, activity, and agent info
  const refresh = useCallback(async () => {
    try {
      const [t, a] = await Promise.all([getAllTriggers(), getMonitorActivity()]);
      setTriggers(t.filter((tr) => tr.status === "Active"));
      setActivity(a);
      setAgentOnline(true);
    } catch {
      setAgentOnline(false);
    }

    // Fetch agent's ETH account
    try {
      const res = await fetch(`${AGENT_BASE}/eth-account`);
      if (res.ok) setEthAccount(await res.json());
    } catch {}
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 4000);
    return () => clearInterval(interval);
  }, [refresh]);

  // Cancel a flight via the mock API
  const cancelFlight = async (flightNumber: string) => {
    setIsCancelling(flightNumber);
    setLastResult(null);
    try {
      await fetch("/api/admin/set-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flight_number: flightNumber, status: "cancelled" }),
      });

      // Run monitor cycle so the agent picks it up
      setIsMonitoring(true);
      const monitorResult = await runMonitorCycle();
      setIsMonitoring(false);

      if (monitorResult.results) {
        const paid = monitorResult.results.find(
          (r: any) => r.conditionMet && r.txHash
        );
        if (paid) {
          setLastResult(`payout_success:${paid.txHash}`);
        } else {
          const failed = monitorResult.results.find(
            (r: any) => r.conditionMet && !r.txHash
          );
          if (failed) {
            setLastResult(`payout_failed:${failed.action}`);
          } else {
            setLastResult("cancelled");
          }
        }
      }

      // Refresh everything
      queryClient.invalidateQueries({ queryKey: ["triggers"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      await refresh();
    } catch (err) {
      setLastResult(`error:${err}`);
    } finally {
      setIsCancelling(null);
      setIsMonitoring(false);
    }
  };

  // Manual monitor cycle
  const runCheck = async () => {
    setIsMonitoring(true);
    setLastResult(null);
    try {
      const result = await runMonitorCycle();
      const checked = result.results?.length || 0;
      setLastResult(checked > 0 ? `checked:${checked}` : "no_triggers");
      queryClient.invalidateQueries({ queryKey: ["triggers"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      await refresh();
    } catch (err) {
      setLastResult(`error:${err}`);
    } finally {
      setIsMonitoring(false);
    }
  };

  const formatBalance = (wei: number) => {
    const eth = wei / 1e18;
    if (eth >= 1) return eth.toFixed(3);
    if (eth >= 0.01) return eth.toFixed(4);
    return eth.toFixed(6);
  };

  return (
    <div className="glass-panel overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--steel)]" style={{ background: "rgba(0,212,255,0.04)" }}>
        <div className="flex items-center gap-2.5">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--radar-cyan)" strokeWidth="2">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
          <span className="text-sm font-semibold text-[var(--white)]">Demo Control Panel</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${agentOnline ? "bg-[var(--signal-green)] pulse" : "bg-[var(--alert-red)]"}`} />
          <span className="text-xs text-[var(--fog)]">{agentOnline ? "Agent Online" : "Agent Offline"}</span>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Agent ETH Account */}
        {ethAccount && (
          <div className="rounded-xl p-3.5 bg-[var(--graphite)] border border-[var(--steel)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[var(--fog)] mb-1">Agent Payout Wallet</p>
                <p className="mono text-xs text-[var(--cloud)]">
                  {ethAccount.address.slice(0, 8)}...{ethAccount.address.slice(-6)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[var(--fog)] mb-1">Balance</p>
                <p className="mono text-sm font-semibold text-[var(--white)]">
                  {formatBalance(ethAccount.balance)} ETH
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Active triggers with cancel buttons */}
        {triggers.length > 0 ? (
          <div className="space-y-2.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--fog)]">
              Active Triggers
            </p>
            {triggers.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--graphite)] border border-[var(--steel)]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[rgba(0,255,136,0.08)] flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--signal-green)" strokeWidth="1.5">
                      <path d="M22 2L11 13" />
                      <path d="M22 2L15 22l-4-9-9-4 20-7z" />
                    </svg>
                  </div>
                  <div>
                    <span className="mono text-sm font-bold text-[var(--white)]">
                      {t.condition.flight_number}
                    </span>
                    <span className="text-xs text-[var(--fog)] ml-2">
                      {t.condition.flight_date}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => cancelFlight(t.condition.flight_number)}
                  disabled={isCancelling === t.condition.flight_number || isMonitoring}
                  className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all disabled:opacity-50"
                  style={{
                    background: isCancelling === t.condition.flight_number
                      ? "rgba(255,71,87,0.3)"
                      : "rgba(255,71,87,0.12)",
                    color: "var(--alert-red)",
                    border: "1px solid rgba(255,71,87,0.4)",
                  }}
                >
                  {isCancelling === t.condition.flight_number
                    ? isMonitoring ? "Signing..." : "Cancelling..."
                    : "Cancel Flight"}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 rounded-xl bg-[var(--graphite)] border border-[var(--steel)]">
            <p className="text-sm text-[var(--fog)]">No active triggers</p>
            <p className="text-xs text-[var(--slate)] mt-0.5">Create one above, then cancel here</p>
          </div>
        )}

        {/* Last result banner */}
        {lastResult && (
          <div
            className="p-3.5 rounded-xl"
            style={{
              background: lastResult.startsWith("payout_success")
                ? "rgba(0,212,255,0.08)"
                : lastResult.startsWith("error") || lastResult.startsWith("payout_failed")
                ? "rgba(255,71,87,0.08)"
                : "var(--graphite)",
              border: `1px solid ${
                lastResult.startsWith("payout_success")
                  ? "rgba(0,212,255,0.3)"
                  : lastResult.startsWith("error") || lastResult.startsWith("payout_failed")
                  ? "rgba(255,71,87,0.3)"
                  : "var(--steel)"
              }`,
            }}
          >
            {lastResult.startsWith("payout_success:") && (
              <div className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--radar-cyan)" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--radar-cyan)" }}>
                    Payout Sent!
                  </p>
                  <a
                    href={`https://sepolia.etherscan.io/tx/${lastResult.split(":")[1]}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mono text-xs text-[var(--fog)] hover:text-[var(--radar-cyan)]"
                  >
                    {lastResult.split(":")[1]?.slice(0, 14)}...
                  </a>
                </div>
              </div>
            )}
            {lastResult.startsWith("error") && (
              <p className="mono text-xs text-[var(--alert-red)]">
                {lastResult.replace("error:", "")}
              </p>
            )}
            {lastResult.startsWith("payout_failed") && (
              <p className="mono text-xs text-[var(--alert-red)]">
                Payout failed: {lastResult.replace("payout_failed:", "")}
              </p>
            )}
            {lastResult === "cancelled" && (
              <p className="text-xs text-[var(--fog)]">Flight cancelled, waiting for monitor...</p>
            )}
            {lastResult.startsWith("checked:") && (
              <p className="text-xs text-[var(--fog)]">Checked {lastResult.split(":")[1]} trigger(s)</p>
            )}
            {lastResult === "no_triggers" && (
              <p className="text-xs text-[var(--fog)]">No active triggers to check</p>
            )}
          </div>
        )}

        {/* Activity Log */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--fog)]">
              Agent Activity
            </p>
            <button
              onClick={runCheck}
              disabled={isMonitoring}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
              style={{
                background: "rgba(0,212,255,0.08)",
                color: "var(--radar-cyan)",
                border: "1px solid rgba(0,212,255,0.25)",
              }}
            >
              {isMonitoring ? (
                <>
                  <span className="w-3 h-3 border border-[var(--radar-cyan)] border-t-transparent rounded-full animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="23 4 23 10 17 10" />
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                  </svg>
                  Run Check
                </>
              )}
            </button>
          </div>
          <div className="rounded-xl bg-[var(--void)] border border-[var(--steel)] p-3 max-h-44 overflow-y-auto">
            {activity.length === 0 ? (
              <p className="text-xs text-[var(--slate)] text-center py-3">
                Waiting for agent activity...
              </p>
            ) : (
              <div className="space-y-1">
                {activity.slice(0, 15).map((a, i) => (
                  <div key={i} className="flex items-center gap-2 mono text-xs py-0.5">
                    <span className="text-[var(--slate)] shrink-0">
                      {new Date(a.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </span>
                    <span className="text-[var(--cloud)] shrink-0">{a.flight}</span>
                    {a.conditionMet ? (
                      <span className="font-bold" style={{ color: "var(--alert-red)" }}>CANCELLED</span>
                    ) : (
                      <span style={{ color: "var(--signal-green)" }}>{a.status}</span>
                    )}
                    {a.txHash && (
                      <a
                        href={`https://sepolia.etherscan.io/tx/${a.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0"
                        style={{ color: "var(--radar-cyan)" }}
                      >
                        tx:{a.txHash.slice(0, 8)}...
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
