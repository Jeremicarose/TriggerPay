/**
 * Trigger Monitor
 *
 * Fetches active triggers from the contract, checks each one
 * against the flight API, and submits attestations when a
 * condition is met (flight cancelled).
 */

import {
  getActiveTriggers,
  submitAttestation,
  type TriggerView,
} from "./near-client.js";
import { createAttestation } from "./attestation.js";
import { log } from "./index.js";

const FLIGHT_API_URL = process.env.FLIGHT_API_URL || "http://localhost:3000";

interface FlightApiResponse {
  flight_number: string;
  status: string;
  airline: string;
  departure_airport: string;
  arrival_airport: string;
  scheduled_departure: string;
  scheduled_arrival: string;
  updated_at: string;
}

/**
 * Query the mock flight API for a given flight number.
 */
async function checkFlightStatus(flightNumber: string): Promise<FlightApiResponse> {
  const url = `${FLIGHT_API_URL}/api/flight/${encodeURIComponent(flightNumber)}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Flight API returned ${res.status} for ${flightNumber}`);
  }

  return (await res.json()) as FlightApiResponse;
}

/**
 * Evaluate whether a trigger's condition is met based on the API response.
 */
function evaluateCondition(trigger: TriggerView, flight: FlightApiResponse): boolean {
  if (trigger.condition.condition_type === "FlightCancellation") {
    return flight.status === "cancelled";
  }
  return false;
}

/**
 * Process a single trigger: check the API, build attestation, submit if needed.
 */
async function processTrigger(trigger: TriggerView): Promise<void> {
  const flightNumber = trigger.condition.flight_number;

  log("debug", `Checking ${trigger.id} — flight ${flightNumber}`);

  let flight: FlightApiResponse;
  try {
    flight = await checkFlightStatus(flightNumber);
  } catch (err) {
    log("warn", `Failed to check flight ${flightNumber}: ${err}`);
    return;
  }

  const conditionMet = evaluateCondition(trigger, flight);
  const rawBody = JSON.stringify(flight);

  log(
    "info",
    `  ${flightNumber}: status="${flight.status}" condition_met=${conditionMet}`
  );

  // Only submit attestation if condition is met (flight cancelled)
  // In a production agent you might submit periodic "still active" attestations too
  if (!conditionMet) {
    return;
  }

  log("info", `  CONDITION MET for ${trigger.id} — submitting attestation`);

  const attestation = createAttestation(
    trigger.id,
    flight.status,
    rawBody,
    conditionMet
  );

  try {
    const txHash = await submitAttestation(attestation);
    log("info", `  Attestation submitted — tx: ${txHash}`);
  } catch (err) {
    log("error", `  Failed to submit attestation for ${trigger.id}: ${err}`);
  }
}

/**
 * Run one monitoring cycle: fetch all active triggers and process each one.
 */
export async function runMonitoringCycle(): Promise<void> {
  let triggers: TriggerView[];

  try {
    triggers = await getActiveTriggers();
  } catch (err) {
    log("error", `Failed to fetch active triggers: ${err}`);
    return;
  }

  if (triggers.length === 0) {
    log("info", "No active triggers to monitor");
    return;
  }

  log("info", `Monitoring ${triggers.length} active trigger(s)`);

  for (const trigger of triggers) {
    await processTrigger(trigger);
  }
}
