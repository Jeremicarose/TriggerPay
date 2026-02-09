import { NextRequest, NextResponse } from "next/server";
import {
  setFlightStatus,
  listOverrides,
  type FlightStatus,
} from "@/lib/flightStore";

const VALID_STATUSES: FlightStatus[] = [
  "scheduled",
  "boarding",
  "departed",
  "in_air",
  "landed",
  "cancelled",
  "delayed",
];

/**
 * POST /api/admin/set-status
 *
 * Sets a flight's status for demo purposes.
 * During the live demo, call this to simulate a cancellation
 * and watch the agent pick it up.
 *
 * Body: { "flight_number": "AA1234", "status": "cancelled" }
 */
export async function POST(request: NextRequest) {
  let body: { flight_number?: string; status?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { flight_number, status } = body;

  if (!flight_number || typeof flight_number !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid flight_number" },
      { status: 400 }
    );
  }

  if (!status || !VALID_STATUSES.includes(status as FlightStatus)) {
    return NextResponse.json(
      {
        error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
      },
      { status: 400 }
    );
  }

  setFlightStatus(flight_number, status as FlightStatus);

  return NextResponse.json({
    success: true,
    flight_number: flight_number.toUpperCase(),
    status,
    message: `Flight ${flight_number.toUpperCase()} status set to "${status}"`,
  });
}

/**
 * GET /api/admin/set-status
 *
 * Lists all manually overridden flight statuses.
 * Useful for checking what's been set during the demo.
 */
export async function GET() {
  return NextResponse.json({
    overrides: listOverrides(),
  });
}
