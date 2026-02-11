"use client";

/**
 * Admin Panel
 *
 * Demo control surface for triggering flight cancellations
 * and forcing monitor cycles. This is the "visceral demo moment"
 * component — judges see ETH appear after clicking "Cancel Flight."
 */

import { useState, useEffect, useCallback } from "react";
import { runMonitorCycle, getMonitorActivity, getAllTriggers } from "@/lib/near/contract";
import type { TriggerView } from "@/types/contract";
import { useQueryClient } from "@tanstack/react-query";

interface ActivityEntry {
  timestamp: string;
  triggerId: string;
  flight: string;
  status: string;
  conditionMet: boolean;
  txHash?: string;
}

export function AdminPanel() {
  const [triggers, setTriggers] = useState<TriggerView[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [isCancelling, setIsCancelling] = useState<string | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch active triggers and activity on mount + interval
  const refresh = useCallback(async () => {
    try {
      const [t, a] = await Promise.all([getAllTriggers(), getMonitorActivity()]);
      setTriggers(t.filter((tr) => tr.status === "Active"));
      setActivity(a);
    } catch {
      // agent may not be running yet
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 3000);
    return () => clearInterval(interval);
  }, [refresh]);

  // Cancel a flight via the mock API
  const cancelFlight = async (flightNumber: string) => {
    setIsCancelling(flightNumber);
    try {
      const res = await fetch("/api/admin/set-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flight_number: flightNumber,
          status: "cancelled",
        }),
      });
      const data = await res.json();
      setLastResult(`${flightNumber} → cancelled`);

      // Immediately run a monitor cycle so the agent picks it up
      setIsMonitoring(true);
      const monitorResult = await runMonitorCycle();
      setIsMonitoring(false);

      if (monitorResult.results) {
        const paid = monitorResult.results.find(
          (r: any) => r.conditionMet && r.txHash
        );
        if (paid) {
          setLastResult(`PAYOUT SENT — tx: ${paid.txHash}`);
        }
      }

      // Refresh everything
      queryClient.invalidateQueries({ queryKey: ["triggers"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      await refresh();
    } catch (err) {
      setLastResult(`Error: ${err}`);
    } finally {
      setIsCancelling(null);
      setIsMonitoring(false);
    }
  };

  // Manual monitor cycle
  const runCheck = async () => {
    setIsMonitoring(true);
    try {
      const result = await runMonitorCycle();
      setLastResult(
        result.results?.length
          ? `Checked ${result.checked} trigger(s)`
          : result.message || "Done"
      );
      queryClient.invalidateQueries({ queryKey: ["triggers"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      await refresh();
    } catch (err) {
      setLastResult(`Error: ${err}`);
    } finally {
      setIsMonitoring(false);
    }
  };

  return (
    <div className="glass-panel p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-[var(--white)]">
          Demo Control Panel
        </h2>
        <button
          onClick={runCheck}
          disabled={isMonitoring}
          className="btn-secondary text-sm"
        >
          {isMonitoring ? "Checking..." : "Run Monitor Check"}
        </button>
      </div>

      {/* Active triggers with cancel buttons */}
      {triggers.length > 0 ? (
        <div className="space-y-3 mb-6">
          <p className="text-sm text-[var(--fog)]">Active triggers — click to simulate cancellation:</p>
          {triggers.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between p-3 rounded-lg bg-[var(--graphite)] border border-[var(--steel)]"
            >
              <div>
                <span className="mono text-[var(--white)] font-semibold">
                  {t.condition.flight_number}
                </span>
                <span className="text-sm text-[var(--fog)] ml-3">
                  {t.condition.flight_date}
                </span>
                <span className="text-sm text-[var(--slate)] ml-3">
                  → {t.payout.address.slice(0, 8)}...
                </span>
              </div>
              <button
                onClick={() => cancelFlight(t.condition.flight_number)}
                disabled={isCancelling === t.condition.flight_number}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-[rgba(255,71,87,0.15)] text-[var(--alert-red)] border border-[var(--alert-red)] hover:bg-[rgba(255,71,87,0.3)] transition-colors disabled:opacity-50"
              >
                {isCancelling === t.condition.flight_number
                  ? "Cancelling..."
                  : "Cancel Flight"}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[var(--slate)] mb-6">
          No active triggers. Create one above to test.
        </p>
      )}

      {/* Last result */}
      {lastResult && (
        <div className="p-3 rounded-lg bg-[var(--graphite)] border border-[var(--steel)] mb-4">
          <p className="mono text-sm text-[var(--radar-cyan)]">{lastResult}</p>
        </div>
      )}

      {/* Agent activity feed */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--fog)] mb-2">
          Agent Activity Log
        </h3>
        <div className="bg-[var(--void)] rounded-lg p-3 max-h-48 overflow-y-auto mono text-xs">
          {activity.length === 0 ? (
            <p className="text-[var(--slate)]">No activity yet — agent polling will appear here</p>
          ) : (
            activity.map((a, i) => (
              <div key={i} className="mb-1">
                <span className="text-[var(--slate)]">
                  {new Date(a.timestamp).toLocaleTimeString()}
                </span>{" "}
                <span className="text-[var(--fog)]">{a.triggerId}</span>{" "}
                <span className="text-[var(--cloud)]">{a.flight}</span>{" "}
                <span
                  className={
                    a.conditionMet
                      ? "text-[var(--alert-red)] font-bold"
                      : "text-[var(--signal-green)]"
                  }
                >
                  {a.status}
                </span>
                {a.txHash && (
                  <span className="text-[var(--radar-cyan)]">
                    {" "}
                    tx:{a.txHash.slice(0, 10)}...
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
