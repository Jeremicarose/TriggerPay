import { NextResponse } from "next/server";
import { getActivity } from "@/lib/agent/activity-log";

export async function GET() {
  return NextResponse.json({ activity: getActivity() });
}
