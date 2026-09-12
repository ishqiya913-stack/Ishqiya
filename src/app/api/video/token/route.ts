import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

import { requireAccount } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const VIDEO_MINIMUM_BALANCE = 100;

export async function POST(request: Request) {
  try {
    const { user, profile } = await requireAccount();

    if (profile.account_status !== "active") {
      return NextResponse.json(
        { error: "Account is not active." },
        { status: 403 }
      );
    }

    const body = (await request.json().catch(() => null)) as {
      matchId?: string;
    } | null;

    const matchId =
      typeof body?.matchId === "string"
        ? body.matchId.trim()
        : "";

    if (!matchId) {
      return NextResponse.json(
        { error: "A match is required." },
        { status: 400 }
      );
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

    if (!apiKey || !apiSecret || !livekitUrl) {
      console.error("LiveKit server configuration is incomplete.");

      return NextResponse.json(
        { error: "Video service is not configured." },
        { status: 503 }
      );
    }

    const supabase = await createClient();
    const admin = createAdminClient();

    /*
     * Match membership is always checked against the authenticated
     * Supabase session. A client cannot choose an arbitrary match.
     */
    const { data: match, error: matchError } = await supabase
      .from("matches")
      .select("id,user_id,host_id")
      .eq("id", matchId)
      .maybeSingle();

    if (matchError) {
      console.error(
        "Video match lookup failed:",
        matchError.message
      );

      return NextResponse.json(
        { error: "Video access could not be verified." },
        { status: 500 }
      );
    }

    if (!match) {
      return NextResponse.json(
        { error: "Video access denied." },
        { status: 403 }
      );
    }

    if (user.id !== match.user_id && user.id !== match.host_id) {
      return NextResponse.json(
        { error: "Video access denied." },
        { status: 403 }
      );
    }

    /*
     * The Host must be a real, approved and currently discoverable
     * Ishqiya Host.
     */
    const { data: host, error: hostError } = await admin
      .from("profiles")
      .select("id,role,account_status")
      .eq("id", match.host_id)
      .maybeSingle();

    if (hostError) {
      console.error(
        "Video Host lookup failed:",
        hostError.message
      );

      return NextResponse.json(
        { error: "Host eligibility could not be verified." },
        { status: 500 }
      );
    }

    if (
      !host ||
      host.role !== "host" ||
      host.account_status !== "active"
    ) {
      return NextResponse.json(
        { error: "Host is not eligible for video." },
        { status: 403 }
      );
    }

    const { data: hostProfile, error: hostProfileError } =
      await admin
        .from("host_profiles")
        .select(
          "host_id,approval_status,is_active,is_visible,is_discoverable"
        )
        .eq("host_id", match.host_id)
        .maybeSingle();

    if (hostProfileError) {
      console.error(
        "Video Host profile lookup failed:",
        hostProfileError.message
      );

      return NextResponse.json(
        { error: "Host eligibility could not be verified." },
        { status: 500 }
      );
    }

    if (
      !hostProfile ||
      hostProfile.approval_status !== "approved" ||
      hostProfile.is_active !== true ||
      hostProfile.is_visible !== true ||
      hostProfile.is_discoverable !== true
    ) {
      return NextResponse.json(
        { error: "Host is not currently available." },
        { status: 403 }
      );
    }

    /*
     * Only the paying User's wallet is checked here.
     * The Host does not need coins to participate in the call.
     */
    const { data: userWallet, error: walletError } = await admin
      .from("wallets")
      .select("balance")
      .eq("user_id", match.user_id)
      .maybeSingle();

    if (walletError) {
      console.error(
        "Video wallet lookup failed:",
        walletError.message
      );

      return NextResponse.json(
        { error: "Your wallet could not be verified." },
        { status: 500 }
      );
    }

    const balance = Number(userWallet?.balance ?? 0);

    if (
      !Number.isFinite(balance) ||
      balance < VIDEO_MINIMUM_BALANCE
    ) {
      return NextResponse.json(
        {
          error:
            "At least 100 coins are required to start video.",
        },
        { status: 402 }
      );
    }

    /*
     * Reuse an existing open session for this match.
     *
     * IMPORTANT:
     * This route does NOT mark the session active and does NOT
     * deduct coins. LiveKit events/reconciliation remain the
     * authoritative session/billing mechanism.
     */
    let { data: session, error: sessionLookupError } = await admin
      .from("video_sessions")
      .select("id,room_name,status,match_id")
      .eq("match_id", match.id)
      .in("status", ["created", "active"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sessionLookupError) {
      console.error(
        "Video session lookup failed:",
        sessionLookupError.message
      );

      return NextResponse.json(
        { error: "Video session could not be verified." },
        { status: 500 }
      );
    }

    if (!session) {
      const roomName = `ishqiya-${crypto.randomUUID()}`;

      const { data: created, error: createError } = await admin
        .from("video_sessions")
        .insert({
          match_id: match.id,
          room_name: roomName,
          user_id: match.user_id,
          host_id: match.host_id,
        })
        .select("id,room_name,status,match_id")
        .single();

      if (createError || !created) {
        /*
         * Another request may have created the session between
         * our lookup and insert. Re-read the authoritative open
         * session instead of creating another one.
         */
        const { data: existing, error: existingError } =
          await admin
            .from("video_sessions")
            .select("id,room_name,status,match_id")
            .eq("match_id", match.id)
            .in("status", ["created", "active"])
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (existingError || !existing) {
          console.error(
            "Video session creation failed:",
            createError?.message ||
              existingError?.message ||
              "No existing session found"
          );

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

    if (
      !session ||
      !["created", "active"].includes(session.status)
    ) {
      return NextResponse.json(
        { error: "Video session is not open." },
        { status: 409 }
      );
    }

    /*
     * The LiveKit token only grants access to the server-created
     * room. Billing is never performed from the client token.
     */
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
  } catch (error) {
    console.error(
      "Video token request failed:",
      error instanceof Error
        ? error.message
        : "Unknown error"
    );

    return NextResponse.json(
      { error: "Video access could not be granted." },
      { status: 500 }
    );
  }
}