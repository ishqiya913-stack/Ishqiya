import { NextResponse } from "next/server";
import { requireAccount } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const { user, profile } = await requireAccount();
  const body = await request.json() as { reportedId?: string; reason?: string; conversationId?: string; callId?: string; context?: Record<string, unknown> };
  if (!body.reportedId || !body.reason?.trim()) return NextResponse.json({ error: "Reported account and reason are required." }, { status: 400 });
  const reportedRole = profile.role === "user" ? "host" : "user";
  const admin = createAdminClient();
  const { data: target } = await admin.from("profiles").select("id,role").eq("id", body.reportedId).eq("role", reportedRole).maybeSingle();
  if (!target) return NextResponse.json({ error: "That account cannot be reported from this context." }, { status: 404 });
  if (body.conversationId) {
    const { data: conversation } = await admin.from("conversations").select("id, matches!inner(user_id,host_id)").eq("id", body.conversationId).maybeSingle();
    const match = conversation?.matches as unknown as { user_id: string; host_id: string } | undefined;
    if (!match || ![match.user_id, match.host_id].includes(user.id) || ![match.user_id, match.host_id].includes(target.id)) return NextResponse.json({ error: "Conversation reference is not valid for this report." }, { status: 400 });
  }
  if (body.callId) {
    const { data: call } = await admin.from("video_sessions").select("id,user_id,host_id").eq("id", body.callId).maybeSingle();
    if (!call || ![call.user_id, call.host_id].includes(user.id) || ![call.user_id, call.host_id].includes(target.id)) return NextResponse.json({ error: "Call reference is not valid for this report." }, { status: 400 });
  }
  const { error } = await admin.from("reports").insert({ reporter_id: user.id, reported_id: target.id, reporter_role: profile.role, reported_role: target.role, reason: body.reason.trim(), conversation_id: body.conversationId || null, call_id: body.callId || null, violation_context: body.context || {} });
  if (error) return NextResponse.json({ error: "Report could not be submitted." }, { status: 500 });
  return NextResponse.json({ submitted: true });
}
