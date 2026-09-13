import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const { user } = await requireRole("user");
  const orderId = new URL(request.url).searchParams.get("orderId")?.trim();
  if (!orderId) return NextResponse.json({ error: "Order is required." }, { status: 400 });

  const admin = createAdminClient();
  const { data: order, error } = await admin
    .from("payment_orders")
    .select("id, user_id, coins, expected_amount_paise, status, expires_at")
    .eq("id", orderId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !order) return NextResponse.json({ error: "Payment order not found." }, { status: 404 });

  const { data: wallet } = await admin.from("wallets").select("balance").eq("user_id", user.id).maybeSingle();
  return NextResponse.json({
    order: {
      id: order.id,
      coins: order.coins,
      expectedAmountPaise: order.expected_amount_paise,
      status: order.status,
      expiresAt: order.expires_at,
    },
    balance: Number(wallet?.balance ?? 0),
  });
}
