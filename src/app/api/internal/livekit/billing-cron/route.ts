import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { processOpenVideoSession } from "@/lib/livekit/billing";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: sessions, error } = await admin
    .from("video_sessions")
    .select("id,room_name")
    .in("status", ["created", "active"])
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) return NextResponse.json({ error: "Open video sessions could not be loaded." }, { status: 500 });

  const results = [];
  for (const session of sessions || []) {
    try {
      const active = await processOpenVideoSession(session.id, session.room_name);
      results.push({ sessionId: session.id, active });
    } catch {
      results.push({ sessionId: session.id, active: null, error: "Reconciliation failed" });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
