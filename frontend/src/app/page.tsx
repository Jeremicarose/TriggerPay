"use client";

/**
 * TriggerPay Home Page
 *
 * Main interface: create triggers, monitor flights, see payouts.
 * Layout flows top-to-bottom for the demo:
 * 1. Header with stats
 * 2. Hero
 * 3. Create form + Admin panel side by side
 * 4. All triggers (full width)
 */

import { Header } from "@/components/Header";
import { CreateTriggerForm } from "@/components/CreateTriggerForm";
import { TriggersList } from "@/components/TriggersList";
import { AdminPanel } from "@/components/AdminPanel";

export default function Home() {
  return (
    <main className="min-h-screen pb-16">
      {/* Header with navigation and wallet */}
      <div className="px-4 pt-4">
        <Header />
      </div>

      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-4 mb-10">
        <div className="text-center py-10">
          <h1 className="text-4xl md:text-5xl font-bold text-[var(--white)] mb-4">
            Conditional Payments,{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--signal-green)] to-[var(--radar-cyan)]">
              Verified by TEE
            </span>
          </h1>
          <p className="text-lg text-[var(--fog)] max-w-2xl mx-auto">
            Set a real-world condition. When it triggers, receive an automatic
            cross-chain payout — verified in a Trusted Execution Environment,
            signed via NEAR Chain Signatures.
          </p>
        </div>

        {/* How It Works */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="glass-panel p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[var(--graphite)] flex items-center justify-center text-[var(--signal-green)]">
              <span className="text-xl font-bold">1</span>
            </div>
            <h3 className="font-semibold text-[var(--white)] mb-2">Create Trigger</h3>
            <p className="text-sm text-[var(--fog)]">
              Define a real-world condition and a payout address. Your trigger
              starts monitoring immediately.
            </p>
          </div>
          <div className="glass-panel p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[var(--graphite)] flex items-center justify-center text-[var(--radar-cyan)]">
              <span className="text-xl font-bold">2</span>
            </div>
            <h3 className="font-semibold text-[var(--white)] mb-2">Agent Monitors</h3>
            <p className="text-sm text-[var(--fog)]">
              A Shade Agent in a TEE continuously monitors conditions via
              real-world APIs. Every check is cryptographically attested.
            </p>
          </div>
          <div className="glass-panel p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[var(--graphite)] flex items-center justify-center text-[var(--warning-amber)]">
              <span className="text-xl font-bold">3</span>
            </div>
            <h3 className="font-semibold text-[var(--white)] mb-2">Get Paid</h3>
            <p className="text-sm text-[var(--fog)]">
              When the condition is met, receive an instant cross-chain payout
              to your EVM address via Chain Signatures.
            </p>
          </div>
        </div>
      </div>

      {/* Create Form + Admin Panel side by side */}
      <div className="max-w-6xl mx-auto px-4 mb-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CreateTriggerForm />
          <AdminPanel />
        </div>
      </div>

      {/* Triggers List — full width */}
      <div className="max-w-6xl mx-auto px-4">
        <TriggersList />
      </div>

      {/* Footer */}
      <footer className="mt-16 text-center text-sm text-[var(--slate)]">
        <p>
          Built on NEAR Protocol with Chain Signatures &amp; Shade Agents
        </p>
      </footer>
    </main>
  );
}
