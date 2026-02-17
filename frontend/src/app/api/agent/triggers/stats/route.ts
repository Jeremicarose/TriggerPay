import { NextResponse } from "next/server";
import { getStats } from "@/lib/agent/trigger-store";

export async function GET() {
  const stats = getStats();
  return NextResponse.json([stats.total, stats.active, stats.executed]);
}
