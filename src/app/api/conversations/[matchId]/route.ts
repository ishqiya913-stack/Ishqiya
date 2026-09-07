import { NextResponse } from "next/server";
import { requireAccount } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { moderateContactSharing } from "@/lib/moderation";

export async function GET(_: Request, { params }: { params: Promise<{ matchId: string }> }) {
  const { user } = await requireAccount();
  const { matchId } = await params;
  const supabase = await createClient();
  const { data: conversation, error } = await supabase.from("conversations").select("id, match_id, matches!inner(user_id,host_id)").eq("match_id", matchId).maybeSingle();
  if (error || !conversation) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  const match = conversation.matches as unknown as { user_id: string; host_id: string };
  if (![match.user_id, match.host_id].includes(user.id)) return NextResponse.json({ error: "Conversation access denied." }, { status: 403 });
  const { data: messages, error: messageError } = await supabase.from("messages").select("id, sender_id, body, created_at, moderation_status").eq("conversation_id", conversation.id).order("created_at", { ascending: true }).limit(100);
  if (messageError) return NextResponse.json({ error: messageError.message }, { status: 500 });
  return NextResponse.json({ conversationId: conversation.id, messages: messages || [] });
}

export async function POST(request: Request, { params }: { params: Promise<{ matchId: string }> }) {
  const { user, profile } = await requireAccount();
  const { matchId } = await params;
  const body = await request.json() as { body?: string; idempotencyKey?: string };
  const text = body.body?.trim();
  if (!text || text.length > 4000 || !body.idempotencyKey) return NextResponse.json({ error: "A message and idempotency key are required." }, { status: 400 });
  const supabase = await createClient();
  const { data: conversation } = await supabase.from("conversations").select("id, matches!inner(user_id,host_id)").eq("match_id", matchId).maybeSingle();
  if (!conversation) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  const match = conversation.matches as unknown as { user_id: string; host_id: string };
  if (![match.user_id, match.host_id].includes(user.id)) return NextResponse.json({ error: "Conversation access denied." }, { status: 403 });
  const moderation = moderateContactSharing(text);
  if (!moderation.allowed) {
    const admin = createAdminClient();
    await admin.from("violations").insert({ account_id: user.id, account_role: profile.role, source_type: "message", source_id: conversation.id, violation_type: "contact_sharing", confidence: moderation.confidence || null, reason: moderation.reason || "Possible contact sharing" });
    return NextResponse.json({ error: "This message was blocked because it may share contact information." }, { status: 422 });
  }
  const { data, error } = await supabase.rpc("ishqiya_send_message", { conversation: conversation.id, message_body: text, idem: body.idempotencyKey });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ message: data });
}