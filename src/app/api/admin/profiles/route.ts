import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const adminUser = await requireAdmin();
  const body = await request.json() as { hostId?: string; displayName?: string; headline?: string; bio?: string; city?: string; age?: number; avatarPath?: string; isActive?: boolean; isVisible?: boolean; isDiscoverable?: boolean };
  if (!body.hostId || !body.displayName?.trim()) return NextResponse.json({ error: "An existing Host identity and public display name are required." }, { status: 400 });
  const admin = createAdminClient();
  const { data: host } = await admin.from("profiles").select("id,role").eq("id", body.hostId).eq("role", "host").maybeSingle();
  if (!host) return NextResponse.json({ error: "Only an existing Host identity can receive an Admin-created public profile." }, { status: 400 });
  const { data, error } = await admin.from("admin_profiles").insert({ host_id: body.hostId, display_name: body.displayName.trim(), headline: body.headline?.trim() || null, bio: body.bio?.trim() || null, city: body.city?.trim() || null, age: body.age || null, avatar_path: body.avatarPath || null, is_active: Boolean(body.isActive), is_visible: Boolean(body.isVisible), is_discoverable: Boolean(body.isDiscoverable), created_by: adminUser.id, created_by_admin: true }).select("id,host_id,display_name,headline,bio,city,age,avatar_path,is_active,is_visible,is_discoverable").single();
  if (error) return NextResponse.json({ error: "Admin-created profile could not be saved." }, { status: 409 });
  await admin.from("audit_logs").insert({ admin_id: adminUser.id, action: "admin_profile_create", target_type: "admin_profile", target_id: data.id, after_data: data });
  return NextResponse.json({ profile: data });
}