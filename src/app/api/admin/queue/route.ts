import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const allowedKinds = ["payments", "reports", "violations", "host-verification", "users", "hosts"] as const;
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
  if (kind === "payments") query = admin.from("payment_verifications").select("id,order_id,user_id,utr,transaction_id,screenshot_path,status,fraud_flags,fraud_reason,attempt_number,expected_amount_paise,created_at,payment_orders(coins,expected_amount_paise,status)", { count: "exact" }).order("created_at", { ascending: false });
  else if (kind === "reports") query = admin.from("reports").select("id,reporter_id,reported_id,reporter_role,reported_role,reason,status,created_at", { count: "exact" }).order("created_at", { ascending: false });
  else if (kind === "violations") query = admin.from("violations").select("id,account_id,account_role,source_type,violation_type,confidence,status,reason,created_at", { count: "exact" }).order("created_at", { ascending: false });
  else if (kind === "host-verification") query = admin.from("host_verification_photos").select("id,host_id,photo_number,status,storage_path,created_at", { count: "exact" }).order("created_at", { ascending: false });
  else query = admin.from("profiles").select("id,email,display_name,role,account_status,created_at", { count: "exact" }).eq("role", kind === "users" ? "user" : "host").order("created_at", { ascending: false });
  if (search && (kind === "users" || kind === "hosts")) query = query.or(`email.ilike.%${search}%,display_name.ilike.%${search}%`);
  const { data, count, error } = await query.range(from, to);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const items = data || [];
  if (kind === "payments") {
    for (const item of items as Array<{ id: string; order_id: string; screenshot_path?: string; related_attempts?: unknown[] }>) {
      if (item.screenshot_path) {
        const { data: signed } = await admin.storage.from("payment-proofs").createSignedUrl(item.screenshot_path, 300);
        (item as { screenshot_url?: string }).screenshot_url = signed?.signedUrl;
      }
      const { data: attempts } = await admin.from("payment_verifications").select("id,status,utr,transaction_id,fraud_flags,fraud_reason,attempt_number,created_at").eq("order_id", item.order_id).neq("id", item.id).order("created_at", { ascending: false });
      item.related_attempts = attempts || [];
    }
  }
  return NextResponse.json({ items, total: count || 0, page, pageSize });
}
