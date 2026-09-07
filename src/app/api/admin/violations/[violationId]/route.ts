import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request, { params }: { params: Promise<{ violationId: string }> }) {
  const adminUser = await requireAdmin(); const { violationId } = await params; const body = await request.json() as { decision?: "confirm" | "dismiss"; reason?: string };
  if (body.decision !== "confirm" && body.decision !== "dismiss") return NextResponse.json({ error: "A valid moderation decision is required." }, { status: 400 });
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("ishqiya_review_violation", { violation: violationId, decision: body.decision, reviewer: adminUser.id, review_reason: body.reason || null });
  if (error) return NextResponse.json({ error: error.message }, { status: 409 });
  return NextResponse.json({ status: data });
}