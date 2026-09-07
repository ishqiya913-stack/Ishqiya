import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createHash } from "node:crypto";

export async function POST(request: Request) {
  const { user } = await requireRole("user");
  const form = await request.formData();
  const orderId = String(form.get("orderId") || "");
  const utr = String(form.get("utr") || "").trim();
  const transactionId = String(form.get("transactionId") || "").trim();
  const screenshot = form.get("screenshot");
  if (!orderId || !utr || !transactionId || !(screenshot instanceof File) || screenshot.size === 0 || screenshot.size > 10 * 1024 * 1024 || !screenshot.type.startsWith("image/")) return NextResponse.json({ error: "Order, UTR, transaction ID, and a valid screenshot are required." }, { status: 400 });
  const admin = createAdminClient();
  const screenshotHash = createHash("sha256").update(Buffer.from(await screenshot.arrayBuffer())).digest("hex");
  const { data: order } = await admin.from("payment_orders").select("id, user_id, status, expires_at").eq("id", orderId).eq("user_id", user.id).maybeSingle();
  if (!order || order.status !== "pending" || new Date(order.expires_at) <= new Date()) return NextResponse.json({ error: "That payment order is unavailable or expired." }, { status: 409 });
  const storagePath = `${user.id}/payments/${orderId}-${crypto.randomUUID()}`;
  const { error: uploadError } = await admin.storage.from("payment-proofs").upload(storagePath, screenshot, { contentType: screenshot.type, upsert: false });
  if (uploadError) return NextResponse.json({ error: "Payment screenshot could not be uploaded." }, { status: 500 });
  const { data: verification, error } = await admin.rpc("ishqiya_submit_payment_proof", { payment_order: orderId, submitting_user: user.id, proof_utr: utr, proof_transaction_id: transactionId, proof_screenshot_path: storagePath, proof_screenshot_sha256: screenshotHash });
  if (error) { await admin.storage.from("payment-proofs").remove([storagePath]); return NextResponse.json({ error: error.message }, { status: 409 }); }
  return NextResponse.json({ status: verification.status, fraudFlags: verification.fraud_flags || [] });
}
