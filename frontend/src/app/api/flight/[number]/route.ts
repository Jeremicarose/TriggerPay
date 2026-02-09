import { NextRequest, NextResponse } from "next/server";
import { getFlight } from "@/lib/flightStore";

/**
 * GET /api/flight/[number]
 *
 * Returns the current status of a flight.
 * The agent polls this endpoint to check whether a trigger's
 * condition has been met (e.g. flight cancelled).
 *
 * Example: GET /api/flight/AA1234
 * Response: { flight_number, status, airline, ... }
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ number: string }> }
) {
  const { number } = await params;

  if (!number || number.length < 2) {
    return NextResponse.json(
      { error: "Invalid flight number" },
      { status: 400 }
    );
  }

  const flight = getFlight(number);

  return NextResponse.json(flight);
}
