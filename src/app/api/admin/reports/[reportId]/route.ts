import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const STATUSES = ["open", "reviewing", "resolved", "dismissed"] as const;
type ReportStatus = (typeof STATUSES)[number];

export async function POST(request: Request, { params }: { params: Promise<{ reportId: string }> }) {
  const adminUser = await requireAdmin();
  const { reportId } = await params;
  const body = await request.json().catch(() => null) as { status?: ReportStatus; reason?: string } | null;
  if (!body?.status || !STATUSES.includes(body.status)) return NextResponse.json({ error: "A valid report status is required." }, { status: 400 });
  const admin = createAdminClient();
  const { data: before } = await admin.from("reports").select("id,status,reporter_id,reported_id,reason").eq("id", reportId).maybeSingle();
  if (!before) return NextResponse.json({ error: "Report not found." }, { status: 404 });
  if (before.status === "resolved" || before.status === "dismissed") return NextResponse.json({ error: "This report is already closed." }, { status: 409 });
  const { data: after, error } = await admin.from("reports").update({ status: body.status }).eq("id", reportId).in("status", ["open", "reviewing"]).select("id,status,reporter_id,reported_id,reason").single();
  if (error) return NextResponse.json({ error: "Report could not be updated." }, { status: 500 });
  await admin.from("audit_logs").insert({ admin_id: adminUser.id, action: `report_${body.status}`, target_type: "report", target_id: reportId, before_data: before, after_data: after, reason: body.reason || null });
  return NextResponse.json({ report: after });
}
