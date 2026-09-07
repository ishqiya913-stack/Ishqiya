import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const { user } = await requireRole("host");
  const supabase = await createClient();
  const [{ data: calls, error: callsError }, { data: earnings, error: earningsError }] = await Promise.all([
    supabase.from("video_sessions").select("id, match_id, started_at, ended_at, duration_seconds, rate_per_minute, coins_charged, status, moderation_status").eq("host_id", user.id).order("created_at", { ascending: false }).limit(100),
    supabase.from("host_earnings").select("gross_coins, share_percent, earned_coins, created_at").eq("host_id", user.id).order("created_at", { ascending: false }).limit(100),
  ]);
  if (callsError || earningsError) return NextResponse.json({ error: callsError?.message || earningsError?.message }, { status: 500 });
  return NextResponse.json({ calls: calls || [], earnings: earnings || [] });
}