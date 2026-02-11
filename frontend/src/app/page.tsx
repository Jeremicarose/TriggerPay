"use client";

/**
 * TriggerPay Home Page
 *
 * Main interface for creating and managing flight insurance triggers.
 * Features:
 * - Wallet connection
 * - Create new triggers
 * - View/manage existing triggers
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
      <div className="max-w-6xl mx-auto px-4 mb-12">
        <div className="text-center py-12">
          <h1 className="text-4xl md:text-5xl font-bold text-[var(--white)] mb-4">
            Flight Insurance,{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--signal-green)] to-[var(--radar-cyan)]">
              Reimagined
            </span>
          </h1>
          <p className="text-lg text-[var(--fog)] max-w-2xl mx-auto">
            Get automatic payouts when your flight is cancelled. Powered by NEAR
            Chain Signatures for trustless cross-chain settlements.
          </p>
        </div>

        {/* How It Works */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="glass-panel p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[var(--graphite)] flex items-center justify-center text-[var(--signal-green)]">
              <span className="text-xl font-bold">1</span>
            </div>
            <h3 className="font-semibold text-[var(--white)] mb-2">Create Trigger</h3>
            <p className="text-sm text-[var(--fog)]">
              Enter your flight details and payout address. Deposit NEAR to fund the
              insurance.
            </p>
          </div>
          <div className="glass-panel p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[var(--graphite)] flex items-center justify-center text-[var(--radar-cyan)]">
              <span className="text-xl font-bold">2</span>
            </div>
            <h3 className="font-semibold text-[var(--white)] mb-2">We Monitor</h3>
            <p className="text-sm text-[var(--fog)]">
              Our TEE-based agent monitors flight status via trusted APIs. All checks
              are cryptographically attested.
            </p>
          </div>
          <div className="glass-panel p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[var(--graphite)] flex items-center justify-center text-[var(--warning-amber)]">
              <span className="text-xl font-bold">3</span>
            </div>
            <h3 className="font-semibold text-[var(--white)] mb-2">Get Paid</h3>
            <p className="text-sm text-[var(--fog)]">
              If cancelled, receive instant payout to your EVM address on Ethereum,
              Base, or Arbitrum.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Create Form - Left Side */}
          <div className="lg:col-span-2">
            <CreateTriggerForm />
          </div>

          {/* Triggers List - Right Side */}
          <div className="lg:col-span-3">
            <TriggersList />
          </div>
        </div>
      </div>

      {/* Demo Control Panel — the "visceral demo moment" for judges */}
      <div className="max-w-6xl mx-auto px-4 mt-12">
        <AdminPanel />
      </div>

      {/* Footer */}
      <footer className="mt-16 text-center text-sm text-[var(--slate)]">
        <p>
          Built on NEAR Protocol with Chain Signatures |{" "}
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--fog)] hover:text-[var(--cloud)]"
          >
            GitHub
          </a>
        </p>
      </footer>
    </main>
  );
}
