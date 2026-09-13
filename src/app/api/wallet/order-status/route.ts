import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const { user } = await requireRole("user");
  const orderId = new URL(request.url).searchParams.get("orderId")?.trim();
  if (!orderId) return NextResponse.json({ error: "Order is required." }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("payment_orders")
    .select("id, user_id, coins, expected_amount_paise, status, expires_at")
    .eq("id", orderId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) return NextResponse.json({ error: "Payment order could not be found." }, { status: 404 });
  return NextResponse.json({
    id: data.id,
    coins: data.coins,
    expectedAmountPaise: data.expected_amount_paise,
    status: data.status,
    expiresAt: data.expires_at,
  });
}
