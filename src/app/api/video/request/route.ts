import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const { user } = await requireRole("user");
  const body = await request.json().catch(() => null) as { hostId?: string } | null;
  const hostId = typeof body?.hostId === "string" ? body.hostId.trim() : "";
  if (!hostId) return NextResponse.json({ error: "Host is required." }, { status: 400 });

  const admin = createAdminClient();
  const [{ data: host }, { data: wallet }] = await Promise.all([
    admin.from("profiles").select("id, role, account_status").eq("id", hostId).maybeSingle(),
    admin.from("wallets").select("balance").eq("user_id", user.id).maybeSingle(),
  ]);

  if (!host || host.role !== "host" || host.account_status !== "active") {
    return NextResponse.json({ error: "This Host is not currently available." }, { status: 404 });
  }

  if ((wallet?.balance ?? 0) < 100) {
    return NextResponse.json({ error: "A verified coin balance is required before starting a video call." }, { status: 402 });
  }

  const { data: hostProfile } = await admin
    .from("host_profiles")
    .select("approval_status,is_active,is_visible,is_discoverable")
    .eq("host_id", hostId)
    .maybeSingle();

  if (!hostProfile || hostProfile.approval_status !== "approved" || !hostProfile.is_active || !hostProfile.is_visible || !hostProfile.is_discoverable) {
    return NextResponse.json({ error: "This Host is not currently available for calls." }, { status: 409 });
  }

  const { data: match, error } = await admin
    .from("matches")
    .upsert({ user_id: user.id, host_id: hostId }, { onConflict: "user_id,host_id" })
    .select("id")
    .single();

  if (error || !match) return NextResponse.json({ error: "The video call request could not be created." }, { status: 500 });

  return NextResponse.json({ matchId: match.id, status: "ready" });
}
