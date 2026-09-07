import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request, { params }: { params: Promise<{ photoId: string }> }) {
  const adminUser = await requireAdmin();
  const { photoId } = await params;
  const body = await request.json() as { decision?: "approve" | "reject"; reason?: string };
  if (body.decision !== "approve" && body.decision !== "reject") return NextResponse.json({ error: "A valid verification decision is required." }, { status: 400 });
  const admin = createAdminClient();
  const { data: photo } = await admin.from("host_verification_photos").select("id,host_id,status").eq("id", photoId).maybeSingle();
  if (!photo || !["pending", "rejected"].includes(photo.status)) return NextResponse.json({ error: "This verification photo is not reviewable." }, { status: 409 });
  const nextStatus = body.decision === "approve" ? "approved" : "rejected";
  const { error } = await admin.from("host_verification_photos").update({ status: nextStatus }).eq("id", photoId).in("status", ["pending", "rejected"]);
  if (error) return NextResponse.json({ error: "Verification could not be updated." }, { status: 500 });
  const { data: photos } = await admin.from("host_verification_photos").select("status").eq("host_id", photo.host_id);
  const allApproved = photos?.length === 3 && photos.every((entry) => entry.status === "approved");
  if (allApproved) {
    await admin.from("host_profiles").update({ approval_status: "approved", is_active: true, is_visible: true, is_discoverable: true }).eq("host_id", photo.host_id);
    await admin.from("notifications").insert({ user_id: photo.host_id, kind: "host_approved", title: "Host profile approved", body: "Your Host profile is now eligible for discovery." });
  } else if (nextStatus === "rejected") {
    await admin.from("host_profiles").update({ approval_status: "rejected", is_active: false, is_visible: false, is_discoverable: false, moderation_note: body.reason || "Verification photo rejected." }).eq("host_id", photo.host_id);
    await admin.from("notifications").insert({ user_id: photo.host_id, kind: "host_rejected", title: "Verification needs attention", body: body.reason || "One or more verification photos need review." });
  }
  await admin.from("audit_logs").insert({ admin_id: adminUser.id, action: `host_photo_${body.decision}`, target_type: "host_verification_photo", target_id: photoId, reason: body.reason || null });
  return NextResponse.json({ status: nextStatus, hostApproved: allApproved });
}