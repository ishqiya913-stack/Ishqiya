import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const { user } = await requireRole("user");
  const admin = createAdminClient();

  const [txResult, callsResult, matchesResult] = await Promise.all([
    admin.from("coin_transactions").select("id, amount, balance_after, kind, reference_type, reference_id, created_at, status").eq("wallet_user_id", user.id).order("created_at", { ascending: false }).limit(100),
    admin.from("video_sessions").select("id, host_id, started_at, ended_at, duration_seconds, coins_charged, status, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
    admin.from("matches").select("id, host_id, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
  ]);

  if (txResult.error || callsResult.error || matchesResult.error) {
    return NextResponse.json({ error: txResult.error?.message || callsResult.error?.message || matchesResult.error?.message }, { status: 500 });
  }

  const hostIds = Array.from(new Set([
    ...(callsResult.data || []).map((row) => row.host_id),
    ...(matchesResult.data || []).map((row) => row.host_id),
  ]));
  const { data: hosts, error: hostsError } = hostIds.length
    ? await admin.from("host_profiles").select("host_id, display_name, avatar_path").in("host_id", hostIds)
    : { data: [], error: null };
  if (hostsError) return NextResponse.json({ error: hostsError.message }, { status: 500 });

  const hostMap = new Map((hosts || []).map((host) => [host.host_id, host]));
  const calls = (callsResult.data || []).map((call) => ({
    ...call,
    host: hostMap.get(call.host_id) || null,
  }));

  const matchMap = new Map((matchesResult.data || []).map((match) => [match.id, match]));
  const transactions = (txResult.data || []).map((tx) => ({
    ...tx,
    host: tx.reference_type === "video_session" && tx.reference_id
      ? hostMap.get((callsResult.data || []).find((call) => call.id === tx.reference_id)?.host_id || "") || null
      : null,
  }));

  return NextResponse.json({
    balance: Number((await admin.from("wallets").select("balance").eq("user_id", user.id).maybeSingle()).data?.balance ?? 0),
    transactions,
    calls,
    matches: Array.from(matchMap.values()).map((match) => ({ ...match, host: hostMap.get(match.host_id) || null })),
  });
}
