/**
 * Flight API Client
 *
 * Queries the mock flight status API hosted by the frontend.
 * In production this would hit FlightAware or AviationStack.
 */

export interface FlightData {
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
 * Fetch the current status of a flight from the mock API.
 * Reads FLIGHT_API_URL at call time (not module load) to avoid import hoisting issues.
 */
export async function getFlightStatus(flightNumber: string): Promise<FlightData> {
  const baseUrl = process.env.FLIGHT_API_URL || "http://localhost:3000";
  const url = `${baseUrl}/api/flight/${encodeURIComponent(flightNumber)}`;
  console.log(`[flight-api] Fetching ${url}`);
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Flight API ${res.status} for ${flightNumber}`);
  }

  return (await res.json()) as FlightData;
}

/**
 * Check whether a flight cancellation condition is met.
 */
export function isConditionMet(flight: FlightData): boolean {
  return flight.status === "cancelled";
}
