import { NextResponse } from "next/server";
import { requireAccount } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RoomServiceClient } from "livekit-server-sdk";

export async function POST(request: Request) {
  const { user } = await requireAccount();
  const body = await request.json() as { sessionId?: string };
  if (!body.sessionId) return NextResponse.json({ error: "Session is required." }, { status: 400 });
  const supabase = await createClient();
  const { data: session } = await supabase.from("video_sessions").select("id,user_id,host_id").eq("id", body.sessionId).maybeSingle();
  if (!session || ![session.user_id, session.host_id].includes(user.id)) return NextResponse.json({ error: "Video access denied." }, { status: 403 });
  const { data: roomSession } = await supabase.from("video_sessions").select("room_name").eq("id", body.sessionId).maybeSingle();
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
  if (!roomSession || !apiKey || !apiSecret || !livekitUrl) return NextResponse.json({ error: "Video service is not configured." }, { status: 503 });
  try { await new RoomServiceClient(livekitUrl, apiKey, apiSecret).deleteRoom(roomSession.room_name); } catch { return NextResponse.json({ error: "LiveKit room could not be ended." }, { status: 502 }); }
  return NextResponse.json({ requested: true, authoritative: false });
}