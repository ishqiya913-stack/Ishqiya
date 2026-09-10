import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const { user } = await requireRole("user");
  const body = await request.json().catch(() => null) as {
    orderId?: string;
    paymentId?: string;
    signature?: string;
  } | null;
  const orderId = typeof body?.orderId === "string" ? body.orderId : "";
  const paymentId = typeof body?.paymentId === "string" ? body.paymentId : "";
  const signature = typeof body?.signature === "string" ? body.signature : "";
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!orderId || !paymentId || !signature || !secret) return NextResponse.json({ error: "Invalid payment confirmation." }, { status: 400 });

  const expected = crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return NextResponse.json({ error: "Payment signature verification failed." }, { status: 400 });

  const admin = createAdminClient();
  const { data: order, error: orderError } = await admin.from("browser_payment_orders").select("id, user_id, coins, amount_rupees, razorpay_order_id, status").eq("razorpay_order_id", orderId).eq("user_id", user.id).maybeSingle();
  if (orderError || !order) return NextResponse.json({ error: "Payment order not found." }, { status: 404 });
  if (order.status === "paid") return NextResponse.json({ coins: order.coins, alreadyProcessed: true });

  const keyId = process.env.RAZORPAY_KEY_ID;
  if (!keyId) return NextResponse.json({ error: "Payment gateway is not configured." }, { status: 503 });
  const auth = Buffer.from(`${keyId}:${secret}`).toString("base64");
  const paymentResponse = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, { headers: { Authorization: `Basic ${auth}` }, cache: "no-store" });
  const payment = await paymentResponse.json().catch(() => null) as { id?: string; order_id?: string; status?: string; amount?: number; currency?: string } | null;
  if (!paymentResponse.ok || payment?.order_id !== orderId || payment?.status !== "captured" || payment?.amount !== order.amount_rupees * 100 || payment?.currency !== "INR") {
    return NextResponse.json({ error: "Payment is not captured yet." }, { status: 409 });
  }

  const { error: updateError } = await admin.from("browser_payment_orders").update({ status: "paid", razorpay_payment_id: paymentId, razorpay_signature: signature, paid_at: new Date().toISOString() }).eq("id", order.id).eq("status", "created");
  if (updateError) return NextResponse.json({ error: "Payment record could not be updated." }, { status: 500 });

  const { error: creditError } = await admin.rpc("ishqiya_credit_wallet", {
    target_user: user.id,
    credit_amount: order.coins,
    transaction_kind: "payment_credit",
    idem: `browser-payment:${order.id}`,
    ref_type: "browser_payment_order",
    ref_id: order.id,
  });
  if (creditError) return NextResponse.json({ error: "Payment was captured but wallet credit needs reconciliation." }, { status: 500 });

  return NextResponse.json({ coins: order.coins, alreadyProcessed: false });
}
