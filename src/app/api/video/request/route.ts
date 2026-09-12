import { NextResponse } from "next/server";

import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const VIDEO_MINIMUM_BALANCE = 100;

export async function POST(request: Request) {
  const { user } = await requireRole("user");

  const body = (await request.json().catch(() => null)) as {
    hostId?: string;
  } | null;

  const hostId =
    typeof body?.hostId === "string" ? body.hostId.trim() : "";

  if (!hostId) {
    return NextResponse.json(
      { error: "Host is required." },
      { status: 400 }
    );
  }

  if (hostId === user.id) {
    return NextResponse.json(
      { error: "You cannot start a video call with your own account." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  /*
   * Validate the Host first.
   * Client-supplied Host IDs are never trusted.
   */
  const { data: host, error: hostError } = await admin
    .from("profiles")
    .select("id, role, account_status")
    .eq("id", hostId)
    .maybeSingle();

  if (hostError) {
    console.error("Video Host lookup failed:", hostError.message);

    return NextResponse.json(
      { error: "The Host could not be verified." },
      { status: 500 }
    );
  }

  if (
    !host ||
    host.role !== "host" ||
    host.account_status !== "active"
  ) {
    return NextResponse.json(
      { error: "This Host is not currently available." },
      { status: 404 }
    );
  }

  /*
   * Only an approved, active, visible and discoverable Host
   * can receive a video-call request.
   */
  const { data: hostProfile, error: hostProfileError } = await admin
    .from("host_profiles")
    .select(
      "approval_status,is_active,is_visible,is_discoverable"
    )
    .eq("host_id", hostId)
    .maybeSingle();

  if (hostProfileError) {
    console.error(
      "Video Host profile lookup failed:",
      hostProfileError.message
    );

    return NextResponse.json(
      { error: "The Host could not be verified." },
      { status: 500 }
    );
  }

  if (
    !hostProfile ||
    hostProfile.approval_status !== "approved" ||
    !hostProfile.is_active ||
    !hostProfile.is_visible ||
    !hostProfile.is_discoverable
  ) {
    return NextResponse.json(
      { error: "This Host is not currently available for calls." },
      { status: 409 }
    );
  }

  /*
   * The wallet is checked server-side.
   *
   * IMPORTANT:
   * This route does not deduct coins.
   * The authoritative video billing/reconciliation system
   * remains responsible for charging the actual session time.
   */
  const { data: wallet, error: walletError } = await admin
    .from("wallets")
    .select("balance")
    .eq("user_id", user.id)
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

  const balance = Number(wallet?.balance ?? 0);

  if (!Number.isFinite(balance) || balance < VIDEO_MINIMUM_BALANCE) {
    return NextResponse.json(
      {
        error:
          "A verified coin balance of at least 100 coins is required before starting a video call.",
      },
      { status: 402 }
    );
  }

  /*
   * Match creation is idempotent.
   * The database unique constraint on user_id + host_id must
   * remain the authority for duplicate match prevention.
   */
  const { data: match, error: matchError } = await admin
    .from("matches")
    .upsert(
      {
        user_id: user.id,
        host_id: hostId,
      },
      {
        onConflict: "user_id,host_id",
      }
    )
    .select("id")
    .single();

  if (matchError || !match) {
    console.error(
      "Video match creation failed:",
      matchError?.message || "No match returned"
    );

    return NextResponse.json(
      { error: "The video call request could not be created." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    matchId: match.id,
    status: "ready",
    minimumBalance: VIDEO_MINIMUM_BALANCE,
  });
}