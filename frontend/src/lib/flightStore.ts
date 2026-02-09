/**
 * In-Memory Flight Status Store
 *
 * Shared store used by both the mock flight API and admin endpoint.
 * In production this would be a real flight data provider.
 * For the hackathon demo, we store statuses in memory and
 * let the admin endpoint override them to simulate cancellations.
 */

export type FlightStatus =
  | "scheduled"
  | "boarding"
  | "departed"
  | "in_air"
  | "landed"
  | "cancelled"
  | "delayed";

export interface FlightData {
  flight_number: string;
  status: FlightStatus;
  airline: string;
  departure_airport: string;
  arrival_airport: string;
  scheduled_departure: string;
  scheduled_arrival: string;
  updated_at: string;
}

// In-memory store — persists for the lifetime of the server process
const flightStatuses = new Map<string, FlightStatus>();

// Seed data: a few known flights for demo convenience
const seedFlights: Record<string, Omit<FlightData, "status" | "updated_at">> = {
  AA1234: {
    flight_number: "AA1234",
    airline: "American Airlines",
    departure_airport: "JFK",
    arrival_airport: "LAX",
    scheduled_departure: "2026-02-15T08:00:00Z",
    scheduled_arrival: "2026-02-15T11:30:00Z",
  },
  UA5678: {
    flight_number: "UA5678",
    airline: "United Airlines",
    departure_airport: "SFO",
    arrival_airport: "ORD",
    scheduled_departure: "2026-02-16T14:00:00Z",
    scheduled_arrival: "2026-02-16T18:15:00Z",
  },
  DL9012: {
    flight_number: "DL9012",
    airline: "Delta Air Lines",
    departure_airport: "ATL",
    arrival_airport: "MIA",
    scheduled_departure: "2026-02-17T10:30:00Z",
    scheduled_arrival: "2026-02-17T12:45:00Z",
  },
};

/**
 * Look up a flight and return its current data.
 * Unknown flight numbers still get a valid response with generic info.
 */
export function getFlight(flightNumber: string): FlightData {
  const key = flightNumber.toUpperCase();
  const status = flightStatuses.get(key) ?? "scheduled";
  const seed = seedFlights[key];

  if (seed) {
    return { ...seed, status, updated_at: new Date().toISOString() };
  }

  // Generate plausible data for unknown flights
  const airlineCode = key.slice(0, 2);
  return {
    flight_number: key,
    status,
    airline: airlineCode,
    departure_airport: "---",
    arrival_airport: "---",
    scheduled_departure: new Date().toISOString(),
    scheduled_arrival: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Override a flight's status (used by the admin endpoint).
 */
export function setFlightStatus(flightNumber: string, status: FlightStatus): void {
  flightStatuses.set(flightNumber.toUpperCase(), status);
}

/**
 * List all flights that have been explicitly set via the admin endpoint.
 */
export function listOverrides(): Record<string, FlightStatus> {
  const result: Record<string, FlightStatus> = {};
  for (const [key, value] of flightStatuses) {
    result[key] = value;
  }
  return result;
}
