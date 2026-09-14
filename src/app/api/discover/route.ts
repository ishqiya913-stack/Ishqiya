import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  await requireRole("user");
  const url = new URL(request.url);
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") || 20)));
  const offset = Math.max(0, Number(url.searchParams.get("offset") || 0));
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("ishqiya_discover_hosts", { page_size: limit, page_offset: offset });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const profiles = Array.isArray(data) ? data : [];
  if (!profiles.length) return NextResponse.json({ profiles: [] });

  // Defense-in-depth: Admin Host controls are canonical in host_profiles.
  // This prevents a stale/older RPC definition from re-exposing a Host through admin_profiles.
  const admin = createAdminClient();
  const hostIds = profiles.map((profile) => String((profile as { host_id?: unknown }).host_id || "")).filter(Boolean);
  const { data: enabledHosts, error: stateError } = await admin
    .from("host_profiles")
    .select("host_id")
    .in("host_id", hostIds)
    .eq("approval_status", "approved")
    .eq("is_active", true)
    .eq("is_visible", true)
    .eq("is_discoverable", true);
  if (stateError) return NextResponse.json({ error: "Discover state could not be verified." }, { status: 500 });

  const enabledIds = new Set((enabledHosts || []).map((row) => String(row.host_id)));
  return NextResponse.json({ profiles: profiles.filter((profile) => enabledIds.has(String((profile as { host_id?: unknown }).host_id || ""))) });
}
