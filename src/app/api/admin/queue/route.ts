import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const allowedKinds = ["payments", "google-play", "reports", "violations", "host-verification", "users", "hosts", "earnings", "audit", "video"] as const;
type QueueKind = (typeof allowedKinds)[number];

export async function GET(request: Request) {
  await requireAdmin();
  const url = new URL(request.url);
  const kind = url.searchParams.get("kind") as QueueKind;
  const search = url.searchParams.get("search")?.trim() || "";
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const pageSize = 25;
  if (!allowedKinds.includes(kind)) return NextResponse.json({ error: "Invalid admin queue." }, { status: 400 });
  const admin = createAdminClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  let query;

  if (kind === "payments") query = admin.from("payment_verifications").select("id,order_id,user_id,utr,transaction_id,screenshot_path,status,fraud_flags,fraud_reason,attempt_number,expected_amount_paise,created_at,reviewed_at,reviewed_by,admin_note,payment_orders(coins,expected_amount_paise,status,payment_provider,provider_reference,created_at,paid_at,reviewed_at)", { count: "exact" }).order("created_at", { ascending: false });
  else if (kind === "google-play") query = admin.from("google_play_purchases").select("id,user_id,product_id,order_id,package_name,purchase_state,consumption_state,purchase_time,processed_at,consumed_at,coins_credited,verification_error,last_verified_at,last_verification_error,created_at,updated_at", { count: "exact" }).order("created_at", { ascending: false });
  else if (kind === "reports") query = admin.from("reports").select("id,reporter_id,reported_id,reporter_role,reported_role,reason,status,conversation_id,call_id,violation_context,created_at", { count: "exact" }).order("created_at", { ascending: false });
  else if (kind === "violations") query = admin.from("violations").select("id,account_id,account_role,source_type,source_id,violation_type,confidence,status,reason,created_at", { count: "exact" }).order("created_at", { ascending: false });
  else if (kind === "host-verification") query = admin.from("host_verification_photos").select("id,host_id,photo_number,status,storage_path,created_at", { count: "exact" }).order("created_at", { ascending: false });
  else if (kind === "earnings") query = admin.from("host_earnings").select("id,host_id,source_type,source_id,gross_coins,share_percent,earned_coins,billing_interval,created_at", { count: "exact" }).order("created_at", { ascending: false });
  else if (kind === "audit") query = admin.from("audit_logs").select("id,admin_id,action,target_type,target_id,before_data,after_data,reason,created_at", { count: "exact" }).order("created_at", { ascending: false });
  else if (kind === "video") query = admin.from("video_sessions").select("id,match_id,user_id,host_id,room_name,started_at,ended_at,duration_seconds,rate_per_minute,coins_charged,status,moderation_status,reconciliation_status,reconciliation_error,created_at", { count: "exact" }).order("created_at", { ascending: false });
  else if (kind === "hosts") query = admin.from("profiles").select("id,email,display_name,role,account_status,created_at,host_profiles!inner(is_active,is_visible,is_discoverable,approval_status)", { count: "exact" }).eq("role", "host").order("created_at", { ascending: false });
  else query = admin.from("profiles").select("id,email,display_name,role,account_status,created_at", { count: "exact" }).eq("role", "user").order("created_at", { ascending: false });

  if (search && (kind === "users" || kind === "hosts")) query = query.or(`email.ilike.%${search}%,display_name.ilike.%${search}%`);
  const { data, count, error } = await query.range(from, to);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const items = (data || []).map((item) => {
    if (kind !== "hosts") return item;
    const hostProfile = Array.isArray((item as Record<string, unknown>).host_profiles)
      ? ((item as Record<string, unknown>).host_profiles as Array<Record<string, unknown>>)[0]
      : ((item as Record<string, unknown>).host_profiles as Record<string, unknown> | null);
    const record = { ...(item as Record<string, unknown>) };
    delete record.host_profiles;
    if (hostProfile) Object.assign(record, hostProfile);
    return record;
  });

  if (kind === "payments") {
    for (const item of items as Array<{ id: string; order_id: string; screenshot_path?: string; related_attempts?: unknown[]; screenshot_url?: string }>) {
      if (item.screenshot_path) {
        const { data: signed } = await admin.storage.from("payment-proofs").createSignedUrl(item.screenshot_path, 300);
        item.screenshot_url = signed?.signedUrl;
      }
      const { data: attempts } = await admin.from("payment_verifications").select("id,status,utr,transaction_id,fraud_flags,fraud_reason,attempt_number,created_at").eq("order_id", item.order_id).neq("id", item.id).order("created_at", { ascending: false });
      item.related_attempts = attempts || [];
    }
  }

  if (kind === "host-verification") {
    for (const item of items as Array<{ storage_path?: string; verification_url?: string }>) {
      if (item.storage_path) {
        const { data: signed } = await admin.storage.from("host-verification").createSignedUrl(item.storage_path, 300);
        item.verification_url = signed?.signedUrl;
      }
    }
  }

  return NextResponse.json({ items, total: count || 0, page, pageSize });
}
