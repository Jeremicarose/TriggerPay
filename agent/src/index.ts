/**
 * TriggerPay Monitoring Agent
 *
 * Polls the TriggerPay contract for active triggers, checks
 * flight statuses via the mock API, and submits attestations
 * when conditions are met.
 *
 * Usage:
 *   cp .env.example .env   # fill in your keys
 *   npm run dev             # start with tsx (development)
 *   npm run build && npm start  # production
 */

import { initNear } from "./near-client.js";
import { initSigningKey, getPublicKeyHex } from "./attestation.js";
import { runMonitoringCycle } from "./monitor.js";

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------

type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || "info";

export function log(level: LogLevel, message: string): void {
  if (LOG_LEVELS[level] < LOG_LEVELS[currentLevel]) return;

  const ts = new Date().toISOString();
  const prefix = {
    debug: "\x1b[90m[DEBUG]\x1b[0m",
    info: "\x1b[36m[INFO]\x1b[0m ",
    warn: "\x1b[33m[WARN]\x1b[0m ",
    error: "\x1b[31m[ERROR]\x1b[0m",
  }[level];

  console.log(`${ts} ${prefix} ${message}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL_MS || "15000", 10);

async function main(): Promise<void> {
  log("info", "========================================");
  log("info", "  TriggerPay Monitoring Agent");
  log("info", "========================================");
  log("info", "");

  // 1. Initialise signing key
  initSigningKey(process.env.AGENT_SIGNING_SEED);
  log("info", `Agent public key: ${getPublicKeyHex().slice(0, 16)}...`);

  // 2. Connect to NEAR
  await initNear();

  // 3. Start polling loop
  const intervalSec = (POLL_INTERVAL / 1000).toFixed(0);
  log("info", `Polling every ${intervalSec}s — press Ctrl+C to stop`);
  log("info", "");

  // Run first cycle immediately
  await runMonitoringCycle();

  // Then repeat on interval
  const timer = setInterval(async () => {
    log("info", "--- polling cycle ---");
    await runMonitoringCycle();
  }, POLL_INTERVAL);

  // Graceful shutdown
  const shutdown = () => {
    log("info", "Shutting down...");
    clearInterval(timer);
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  log("error", `Fatal: ${err}`);
  process.exit(1);
});
