import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import { requireAccount } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const { user, profile } = await requireAccount();

  if (profile.account_status !== "active") {
    return NextResponse.json({ error: "Account is not active." }, { status: 403 });
  }

  const body = await request.json() as { matchId?: string };
  if (!body.matchId) {
    return NextResponse.json({ error: "A match is required." }, { status: 400 });
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

  if (!apiKey || !apiSecret || !livekitUrl) {
    return NextResponse.json(
      { error: "Video service is not configured." },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  // Match membership is checked against the authenticated user.
  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("id,user_id,host_id")
    .eq("id", body.matchId)
    .maybeSingle();

  if (matchError || !match) {
    return NextResponse.json({ error: "Video access denied." }, { status: 403 });
  }

  if (![match.user_id, match.host_id].includes(user.id)) {
    return NextResponse.json({ error: "Video access denied." }, { status: 403 });
  }

  // The host must always be a real approved/visible/discoverable host.
  const { data: host, error: hostError } = await admin
    .from("profiles")
    .select("id,role,account_status")
    .eq("id", match.host_id)
    .maybeSingle();

  if (
    hostError ||
    !host ||
    host.role !== "host" ||
    host.account_status !== "active"
  ) {
    return NextResponse.json({ error: "Host is not eligible for video." }, { status: 403 });
  }

  const { data: hostProfile, error: hostProfileError } = await admin
    .from("host_profiles")
    .select("host_id,approval_status,is_active,is_visible,is_discoverable")
    .eq("host_id", match.host_id)
    .maybeSingle();

  if (
    hostProfileError ||
    !hostProfile ||
    hostProfile.approval_status !== "approved" ||
    hostProfile.is_active !== true ||
    hostProfile.is_visible !== true ||
    hostProfile.is_discoverable !== true
  ) {
    return NextResponse.json({ error: "Host is not currently available." }, { status: 403 });
  }

  // The paying user must have enough server-side wallet balance.
  const { data: userWallet, error: walletError } = await admin
    .from("wallets")
    .select("balance")
    .eq("user_id", match.user_id)
    .maybeSingle();

  if (
    walletError ||
    !userWallet ||
    Number(userWallet.balance) < 100
  ) {
    return NextResponse.json(
      { error: "At least 100 coins are required to start video." },
      { status: 402 }
    );
  }

  // Only an open/active server-side video session can receive a token.
  let { data: session } = await admin
    .from("video_sessions")
    .select("id,room_name,status,match_id")
    .eq("match_id", match.id)
    .in("status", ["created", "active"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!session) {
    const { data: created, error: createError } = await admin
      .from("video_sessions")
      .insert({
        match_id: match.id,
        room_name: `ishqiya-${crypto.randomUUID()}`,
        user_id: match.user_id,
        host_id: match.host_id,
      })
      .select("id,room_name,status,match_id")
      .single();

    if (createError || !created) {
      const { data: existing } = await admin
        .from("video_sessions")
        .select("id,room_name,status,match_id")
        .eq("match_id", match.id)
        .in("status", ["created", "active"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!existing) {
        return NextResponse.json(
          { error: "Video session could not be created." },
          { status: 500 }
        );
      }

      session = existing;
    } else {
      session = created;
    }
  }

  if (!session || !["created", "active"].includes(session.status)) {
    return NextResponse.json({ error: "Video session is not open." }, { status: 409 });
  }

  const token = new AccessToken(apiKey, apiSecret, {
    identity: user.id,
    name: profile.display_name || profile.email,
    ttl: "10m",
  });

  token.addGrant({
    room: session.room_name,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
  });

  return NextResponse.json({
    token: await token.toJwt(),
    url: livekitUrl,
    sessionId: session.id,
    roomName: session.room_name,
  });
}
