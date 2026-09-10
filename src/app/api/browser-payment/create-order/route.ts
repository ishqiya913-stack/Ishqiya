import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const PACKAGE_COINS: Record<string, number> = {
  coins_100: 100,
  coins_500: 500,
  coins_1000: 1000,
  coins_5000: 5000,
  coins_10000: 10000,
  coins_50000: 50000,
  coins_100000: 100000,
};

export async function POST(request: Request) {
  const { user } = await requireRole("user");
  const body = await request.json().catch(() => null) as { productId?: string } | null;
  const productId = typeof body?.productId === "string" ? body.productId : "";
  const expectedCoins = PACKAGE_COINS[productId];
  if (!expectedCoins) return NextResponse.json({ error: "Invalid coin package." }, { status: 400 });

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return NextResponse.json({ error: "Browser payment gateway is not configured." }, { status: 503 });

  const admin = createAdminClient();
  const { data: packageRow, error: packageError } = await admin
    .from("coin_packages")
    .select("id, coins, price_rupees, is_active")
    .eq("id", productId)
    .maybeSingle();

  let coins = expectedCoins;
  let amountRupees = expectedCoins;
  let packageId: string | null = null;

  if (packageError) return NextResponse.json({ error: "Payment package lookup failed." }, { status: 500 });
  if (packageRow) {
    if (!packageRow.is_active || packageRow.coins !== expectedCoins || packageRow.price_rupees !== expectedCoins) {
      return NextResponse.json({ error: "This package is unavailable." }, { status: 400 });
    }
    coins = packageRow.coins;
    amountRupees = packageRow.price_rupees;
    packageId = packageRow.id;
  } else {
    const { data: byCoins, error } = await admin.from("coin_packages").select("id, coins, price_rupees, is_active").eq("coins", expectedCoins).eq("is_active", true).maybeSingle();
    if (error || !byCoins || byCoins.price_rupees !== expectedCoins) return NextResponse.json({ error: "This package is unavailable." }, { status: 400 });
    packageId = byCoins.id;
    coins = byCoins.coins;
    amountRupees = byCoins.price_rupees;
  }

  const receipt = `ishqiya_${user.id.slice(0, 8)}_${Date.now()}`;
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const razorResponse = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: amountRupees * 100,
      currency: "INR",
      receipt,
      notes: { ishqiya_user_id: user.id, package_id: packageId, coins: String(coins) },
    }),
  });
  const razorOrder = await razorResponse.json().catch(() => null) as { id?: string; error?: { description?: string } } | null;
  if (!razorResponse.ok || !razorOrder?.id) return NextResponse.json({ error: razorOrder?.error?.description || "Payment order could not be created." }, { status: 502 });

  const { error: insertError } = await admin.from("browser_payment_orders").insert({
    user_id: user.id,
    package_id: packageId,
    coins,
    amount_rupees: amountRupees,
    razorpay_order_id: razorOrder.id,
  });
  if (insertError) return NextResponse.json({ error: "Payment order could not be recorded." }, { status: 500 });

  return NextResponse.json({
    keyId,
    orderId: razorOrder.id,
    amount: amountRupees * 100,
    currency: "INR",
    coins,
    amountRupees,
  });
}
