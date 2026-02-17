import { NextRequest, NextResponse } from "next/server";
import { getTrigger, deleteTrigger } from "@/lib/agent/trigger-store";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const trigger = getTrigger(id);
  if (!trigger) {
    return NextResponse.json({ error: "Trigger not found" }, { status: 404 });
  }
  return NextResponse.json(trigger);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deleted = deleteTrigger(id);
  if (!deleted) {
    return NextResponse.json({ error: "Trigger not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true, id });
}
