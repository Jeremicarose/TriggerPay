"use client";

/**
 * Create Trigger Form
 *
 * Form to create a new flight insurance trigger.
 * Collects flight details and payout configuration.
 */

import { useState } from "react";
import { useWalletStore } from "@/store/wallet";
import { createTrigger } from "@/lib/near/contract";
import { useQueryClient } from "@tanstack/react-query";
import type { Chain } from "@/types/contract";

export function CreateTriggerForm() {
  const { isConnected, accountId, connect } = useWalletStore();
  const queryClient = useQueryClient();

  // Form state
  const [flightNumber, setFlightNumber] = useState("");
  const [flightDate, setFlightDate] = useState("");
  const [payoutAddress, setPayoutAddress] = useState("");
  const [payoutAmount, setPayoutAmount] = useState("0.5");
  const [chain, setChain] = useState<Chain>("Base");
  const [depositAmount, setDepositAmount] = useState("2");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Get tomorrow's date for minimum date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split("T")[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validation
    if (!flightNumber.trim()) {
      setError("Flight number is required");
      return;
    }
    if (!flightDate) {
      setError("Flight date is required");
      return;
    }
    if (!payoutAddress.startsWith("0x") || payoutAddress.length !== 42) {
      setError("Invalid Ethereum address (must be 0x... format, 42 characters)");
      return;
    }
    if (parseFloat(depositAmount) < 1) {
      setError("Minimum deposit is 1 NEAR");
      return;
    }

    setIsSubmitting(true);

    try {
      // Convert ETH to wei (string)
      const amountInWei = (parseFloat(payoutAmount) * 1e18).toFixed(0);

      await createTrigger(
        {
          condition_type: "FlightCancellation",
          flight_number: flightNumber.toUpperCase().trim(),
          flight_date: flightDate,
        },
        {
          amount: amountInWei,
          token: "ETH",
          address: payoutAddress,
          chain: chain,
        },
        depositAmount
      );

      setSuccess(true);
      // Reset form
      setFlightNumber("");
      setFlightDate("");
      setPayoutAddress("");
      setPayoutAmount("0.5");
      setDepositAmount("2");

      // Refresh triggers list
      queryClient.invalidateQueries({ queryKey: ["triggers", accountId] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    } catch (err) {
      console.error("Failed to create trigger:", err);
      setError(err instanceof Error ? err.message : "Failed to create trigger");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="glass-panel p-6">
      <h2 className="text-xl font-semibold text-[var(--white)] mb-6">
        Create Trigger
      </h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Flight Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-[var(--fog)] mb-2">
              Flight Number
            </label>
            <input
              type="text"
              value={flightNumber}
              onChange={(e) => setFlightNumber(e.target.value)}
              placeholder="AA1234"
              className="w-full"
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label className="block text-sm text-[var(--fog)] mb-2">
              Flight Date
            </label>
            <input
              type="date"
              value={flightDate}
              onChange={(e) => setFlightDate(e.target.value)}
              min={minDate}
              className="w-full"
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Payout Configuration */}
        <div>
          <label className="block text-sm text-[var(--fog)] mb-2">
            Payout Address (EVM)
          </label>
          <input
            type="text"
            value={payoutAddress}
            onChange={(e) => setPayoutAddress(e.target.value)}
            placeholder="0x..."
            className="w-full"
            disabled={isSubmitting}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-[var(--fog)] mb-2">
              Payout Amount (ETH)
            </label>
            <input
              type="number"
              value={payoutAmount}
              onChange={(e) => setPayoutAmount(e.target.value)}
              min="0.01"
              step="0.01"
              className="w-full"
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label className="block text-sm text-[var(--fog)] mb-2">
              Target Chain
            </label>
            <select
              value={chain}
              onChange={(e) => setChain(e.target.value as Chain)}
              className="w-full"
              disabled={isSubmitting}
            >
              <option value="Base">Base</option>
              <option value="Ethereum">Ethereum</option>
              <option value="Arbitrum">Arbitrum</option>
            </select>
          </div>
        </div>

        {/* Deposit */}
        <div>
          <label className="block text-sm text-[var(--fog)] mb-2">
            Deposit Amount (NEAR)
          </label>
          <input
            type="number"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            min="1"
            step="0.1"
            className="w-full"
            disabled={isSubmitting}
          />
          <p className="text-xs text-[var(--slate)] mt-1">
            Minimum 1 NEAR. Covers execution fees + payout funding.
          </p>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="p-3 rounded-lg bg-[rgba(255,71,87,0.1)] border border-[var(--alert-red)] text-[var(--alert-red)] text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 rounded-lg bg-[var(--signal-green-dim)] border border-[var(--signal-green)] text-[var(--signal-green)] text-sm">
            Trigger created successfully! It will be monitored for flight cancellations.
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary w-full"
        >
          {isSubmitting ? "Creating Trigger..." : "Create Trigger"}
        </button>
      </form>
    </div>
  );
}
