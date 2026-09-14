import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminApiUser } from "@/lib/admin-api";

export async function POST(request: Request) {
  const adminUser = await getAdminApiUser();
  if (!adminUser) return NextResponse.json({ error: "Admin authentication required." }, { status: 401, headers: { "Cache-Control": "private, no-store" } });
  const body = await request.json().catch(() => null) as { hostId?: string; displayName?: string; headline?: string; bio?: string; city?: string; age?: number; avatarPath?: string; isActive?: boolean; isVisible?: boolean; isDiscoverable?: boolean } | null;
  if (!body?.hostId || !body.displayName?.trim()) return NextResponse.json({ error: "An existing Host identity and public display name are required." }, { status: 400 });
  const admin = createAdminClient();
  const { data: host } = await admin.from("profiles").select("id,role").eq("id", body.hostId).eq("role", "host").maybeSingle();
  if (!host) return NextResponse.json({ error: "Only an existing Host identity can receive an Admin-created public profile." }, { status: 400 });
  const { data, error } = await admin.from("admin_profiles").insert({ host_id: body.hostId, display_name: body.displayName.trim(), headline: body.headline?.trim() || null, bio: body.bio?.trim() || null, city: body.city?.trim() || null, age: body.age || null, avatar_path: body.avatarPath || null, is_active: Boolean(body.isActive), is_visible: Boolean(body.isVisible), is_discoverable: Boolean(body.isDiscoverable), created_by: adminUser.id, created_by_admin: true }).select("id,host_id,display_name,headline,bio,city,age,avatar_path,is_active,is_visible,is_discoverable").single();
  if (error) return NextResponse.json({ error: "Admin-created profile could not be saved." }, { status: 409 });
  await admin.from("audit_logs").insert({ admin_id: adminUser.id, action: "admin_profile_create", target_type: "admin_profile", target_id: data.id, after_data: data });
  return NextResponse.json({ profile: data }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PATCH(request: Request) {
  const adminUser = await getAdminApiUser();
  if (!adminUser) return NextResponse.json({ error: "Admin authentication required." }, { status: 401, headers: { "Cache-Control": "private, no-store" } });
  const body = await request.json().catch(() => null) as { profileId?: string; accountStatus?: "active" | "suspended" | "blocked"; isActive?: boolean; isVisible?: boolean; isDiscoverable?: boolean; moderationNote?: string } | null;
  if (!body?.profileId) return NextResponse.json({ error: "Profile id is required." }, { status: 400 });
  if (body.accountStatus && !["active", "suspended", "blocked"].includes(body.accountStatus)) return NextResponse.json({ error: "Invalid account status." }, { status: 400 });
  const admin = createAdminClient();
  const { data: before, error: readError } = await admin.from("profiles").select("id,role,account_status,display_name").eq("id", body.profileId).maybeSingle();
  if (readError || !before) return NextResponse.json({ error: "Profile not found." }, { status: 404 });

  const isHostControlRequest = before.role === "host" && (typeof body.isActive === "boolean" || typeof body.isVisible === "boolean" || typeof body.isDiscoverable === "boolean");
  if (isHostControlRequest) {
    const { data: hostProfile, error: hostReadError } = await admin.from("host_profiles").select("host_id,is_active,is_visible,is_discoverable,approval_status").eq("host_id", body.profileId).maybeSingle();
    if (hostReadError) return NextResponse.json({ error: "Host profile could not be verified." }, { status: 500 });
    if (!hostProfile) return NextResponse.json({ error: "Host profile does not exist. No Host control was changed." }, { status: 409 });
    const hostPatch: Record<string, unknown> = {};
    if (typeof body.isActive === "boolean") hostPatch.is_active = body.isActive;
    if (typeof body.isVisible === "boolean") hostPatch.is_visible = body.isVisible;
    if (typeof body.isDiscoverable === "boolean") hostPatch.is_discoverable = body.isDiscoverable;
    if (body.moderationNote !== undefined) hostPatch.moderation_note = body.moderationNote.trim().slice(0, 2000) || null;
    const { data: afterHost, error: hostUpdateError } = await admin.from("host_profiles").update(hostPatch).eq("host_id", body.profileId).select("host_id,is_active,is_visible,is_discoverable,approval_status").maybeSingle();
    if (hostUpdateError || !afterHost) return NextResponse.json({ error: "Host controls could not be updated. No successful Host-control state was returned." }, { status: 500 });
    if (typeof body.isActive === "boolean" && afterHost.is_active !== body.isActive) return NextResponse.json({ error: "Host active state was not persisted." }, { status: 500 });
    if (typeof body.isDiscoverable === "boolean" && afterHost.is_discoverable !== body.isDiscoverable) return NextResponse.json({ error: "Host Discover state was not persisted." }, { status: 500 });
    await admin.from("audit_logs").insert({ admin_id: adminUser.id, action: "admin_host_control_update", target_type: "host_profile", target_id: body.profileId, before_data: hostProfile, after_data: afterHost, reason: body.moderationNote || null });
    return NextResponse.json({ profile: { ...before, ...afterHost } }, { headers: { "Cache-Control": "private, no-store" } });
  }
  const profilePatch: Record<string, unknown> = {};
  if (body.accountStatus) profilePatch.account_status = body.accountStatus;
  if (Object.keys(profilePatch).length) {
    const { error } = await admin.from("profiles").update(profilePatch).eq("id", body.profileId);
    if (error) return NextResponse.json({ error: "Account status could not be updated." }, { status: 500 });
  }
  const { data: after } = await admin.from("profiles").select("id,role,account_status,display_name").eq("id", body.profileId).maybeSingle();
  await admin.from("audit_logs").insert({ admin_id: adminUser.id, action: "admin_profile_update", target_type: "profile", target_id: body.profileId, before_data: before, after_data: after, reason: body.moderationNote || null });
  return NextResponse.json({ profile: after }, { headers: { "Cache-Control": "private, no-store" } });
}
