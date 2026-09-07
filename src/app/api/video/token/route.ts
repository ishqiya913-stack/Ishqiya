import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import { requireAccount } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const { user, profile } = await requireAccount();
  const body = await request.json() as { matchId?: string };
  if (!body.matchId) return NextResponse.json({ error: "A match is required." }, { status: 400 });
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
  if (!apiKey || !apiSecret || !livekitUrl) return NextResponse.json({ error: "Video service is not configured." }, { status: 503 });
  const supabase = await createClient();
  const { data: match } = await supabase.from("matches").select("id,user_id,host_id").eq("id", body.matchId).maybeSingle();
  if (!match || ![match.user_id, match.host_id].includes(user.id)) return NextResponse.json({ error: "Video access denied." }, { status: 403 });
  const admin = createAdminClient();
  let { data: session } = await admin.from("video_sessions").select("id,room_name,status").eq("match_id", body.matchId).in("status", ["created", "active"]).maybeSingle();
  if (!session) { const { data: created, error } = await admin.from("video_sessions").insert({ match_id: body.matchId, room_name: `ishqiya-${crypto.randomUUID()}`, user_id: match.user_id, host_id: match.host_id }).select("id,room_name,status").single(); if (error) { const { data: existing } = await admin.from("video_sessions").select("id,room_name,status").eq("match_id", body.matchId).in("status", ["created", "active"]).maybeSingle(); if (!existing) return NextResponse.json({ error: "Video session could not be created." }, { status: 500 }); session = existing; } else session = created; }
  const token = new AccessToken(apiKey, apiSecret, { identity: user.id, name: profile.display_name || profile.email, ttl: "10m" });
  token.addGrant({ room: session.room_name, roomJoin: true, canPublish: profile.role === "user" || profile.role === "host", canSubscribe: true });
  return NextResponse.json({ token: await token.toJwt(), url: livekitUrl, sessionId: session.id, roomName: session.room_name });
}