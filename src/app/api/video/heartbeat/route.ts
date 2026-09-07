import { NextResponse } from "next/server";
import { requireAccount } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  await requireAccount();
  const body = await request.json() as { sessionId?: string };
  if (!body.sessionId) return NextResponse.json({ error: "Session is required." }, { status: 400 });
  const supabase = await createClient();
  const { data: session, error } = await supabase.from("video_sessions").select("id,status,user_id,host_id").eq("id", body.sessionId).maybeSingle();
  if (error || !session) return NextResponse.json({ error: "Video session not found." }, { status: 404 });
  return NextResponse.json({ active: session.status === "active", authoritative: false });
}