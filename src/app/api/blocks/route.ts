import { NextResponse } from "next/server";
import { requireAccount } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const { user, profile } = await requireAccount();
  const body = await request.json() as { blockedId?: string };
  if (!body.blockedId || body.blockedId === user.id) return NextResponse.json({ error: "A valid account is required." }, { status: 400 });

  const targetRole = profile.role === "user" ? "host" : "user";
  const admin = createAdminClient();
  const { data: target } = await admin.from("profiles").select("id, role").eq("id", body.blockedId).eq("role", targetRole).maybeSingle();
  if (!target) return NextResponse.json({ error: `That ${targetRole} cannot be blocked.` }, { status: 404 });

  const { error } = await admin.from("blocks").upsert(
    { blocker_id: user.id, blocked_id: target.id },
    { onConflict: "blocker_id,blocked_id" }
  );
  if (error) return NextResponse.json({ error: "Account could not be blocked." }, { status: 500 });
  return NextResponse.json({ blocked: true });
}
