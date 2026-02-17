import { NextRequest, NextResponse } from "next/server";
import {
  createTrigger,
  getTriggers,
  type Trigger,
} from "@/lib/agent/trigger-store";

export async function GET(req: NextRequest) {
  const owner = req.nextUrl.searchParams.get("owner") || undefined;
  return NextResponse.json(getTriggers(owner));
}

export async function POST(req: NextRequest) {
  let body: {
    owner?: string;
    condition?: Trigger["condition"];
    payout?: Trigger["payout"];
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.owner || !body.condition || !body.payout) {
    return NextResponse.json(
      { error: "Missing owner, condition, or payout" },
      { status: 400 }
    );
  }

  if (!body.condition.flight_number || !body.condition.flight_date) {
    return NextResponse.json(
      { error: "Missing flight_number or flight_date" },
      { status: 400 }
    );
  }

  if (
    !body.payout.address?.startsWith("0x") ||
    body.payout.address.length !== 42
  ) {
    return NextResponse.json(
      { error: "Invalid EVM payout address" },
      { status: 400 }
    );
  }

  const trigger = createTrigger({
    owner: body.owner,
    condition: body.condition,
    payout: body.payout,
  });

  return NextResponse.json(trigger, { status: 201 });
}
