import { NextResponse } from "next/server";
import { requireAccount } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const { user, profile } = await requireAccount();

  if (profile.role !== "user") {
    return NextResponse.json({ error: "Only Users can block Hosts." }, { status: 403 });
  }

  const body = await request.json() as { blockedId?: string };

  if (!body.blockedId || body.blockedId === user.id) {
    return NextResponse.json({ error: "A valid Host is required." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: target } = await admin
    .from("profiles")
    .select("id, role")
    .eq("id", body.blockedId)
    .eq("role", "host")
    .maybeSingle();

  if (!target) {
    return NextResponse.json({ error: "That Host cannot be blocked." }, { status: 404 });
  }

  const { error } = await admin
    .from("blocks")
    .upsert(
      {
        blocker_id: user.id,
        blocked_id: target.id,
      },
      { onConflict: "blocker_id,blocked_id" }
    );

  if (error) {
    return NextResponse.json({ error: "Host could not be blocked." }, { status: 500 });
  }

  return NextResponse.json({ blocked: true });
}
