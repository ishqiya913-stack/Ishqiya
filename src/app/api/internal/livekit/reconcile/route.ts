import { NextResponse } from "next/server";
import { RoomServiceClient } from "livekit-server-sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { reconcileVideoSession, terminateLiveKitRoom } from "@/lib/livekit/billing";

export async function POST(request: Request) {
  const secret = process.env.LIVEKIT_RECONCILIATION_SECRET;
  const authorization = request.headers.get("authorization");
  if (!secret || authorization !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const body = await request.json() as { sessionId?: string };
  if (!body.sessionId) return NextResponse.json({ error: "Session is required." }, { status: 400 });
  const admin = createAdminClient();
  const { data: session } = await admin.from("video_sessions").select("id,room_name,status").eq("id", body.sessionId).in("status", ["created", "active"]).maybeSingle();
  if (!session) return NextResponse.json({ error: "Open video session not found." }, { status: 404 });
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
  if (!apiKey || !apiSecret || !livekitUrl) return NextResponse.json({ error: "LiveKit service is not configured." }, { status: 503 });
  let roomExists = true;
  try { const rooms = await new RoomServiceClient(livekitUrl, apiKey, apiSecret).listRooms([session.room_name]); roomExists = rooms.length > 0; } catch { return NextResponse.json({ error: "LiveKit reconciliation could not inspect the room." }, { status: 502 }); }
  if (roomExists) return NextResponse.json({ reconciled: false, reason: "Room is still active; awaiting verified webhook lifecycle events." });
  try {
    const active = await reconcileVideoSession(session.id, new Date().toISOString(), true);
    if (!active) await terminateLiveKitRoom(session.room_name).catch(() => undefined);
    return NextResponse.json({ reconciled: true, active });
  } catch {
    return NextResponse.json({ error: "Video reconciliation failed." }, { status: 500 });
  }
}