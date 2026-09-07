import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request, { params }: { params: Promise<{ verificationId: string }> }) {
  const adminUser = await requireAdmin();
  const { verificationId } = await params;
  const body = await request.json() as { decision?: "approve" | "reject"; reason?: string };
  if (body.decision !== "approve" && body.decision !== "reject") return NextResponse.json({ error: "A valid payment decision is required." }, { status: 400 });
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("ishqiya_review_payment", { verification: verificationId, decision: body.decision, reviewer: adminUser.id, review_reason: body.reason || null });
  if (error) return NextResponse.json({ error: error.message }, { status: 409 });
  return NextResponse.json({ status: data });
}