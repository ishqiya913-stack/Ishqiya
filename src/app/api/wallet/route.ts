import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const { user } = await requireRole("user");
  const supabase = await createClient();
  const [{ data: wallet, error: walletError }, { data: packages, error: packageError }, { data: pendingOrder, error: orderError }] = await Promise.all([
    supabase.from("wallets").select("balance, updated_at").eq("user_id", user.id).maybeSingle(),
    supabase.from("coin_packages").select("id, coins, price_rupees").eq("is_active", true).order("coins"),
    supabase.from("payment_orders").select("id, coins, expected_amount_paise, upi_uri, status, expires_at").eq("user_id", user.id).eq("status", "pending").gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (walletError || packageError || orderError) return NextResponse.json({ error: walletError?.message || packageError?.message || orderError?.message }, { status: 500 });
  return NextResponse.json({ balance: wallet?.balance || 0, packages: packages || [], pendingOrder: pendingOrder || null });
}

export async function POST(request: Request) {
  const { user } = await requireRole("user");
  const body = await request.json() as { packageId?: string; coins?: number };
  if (!body.packageId && !Number.isFinite(Number(body.coins))) {
    return NextResponse.json({ error: "Select a coin package." }, { status: 400 });
  }

  const admin = createAdminClient();
  let packageRow: { id: string; coins: number; price_rupees: number } | null = null;
  let packageError: { message: string } | null = null;

  if (body.packageId) {
    const result = await admin
      .from("coin_packages")
      .select("id, coins, price_rupees")
      .eq("id", body.packageId)
      .eq("is_active", true)
      .maybeSingle();
    packageRow = result.data;
    packageError = result.error;
  }

  // A stale client can hold a package UUID from an older database snapshot.
  // Resolve it safely by the server-owned coin amount as a compatibility fallback.
  if (!packageRow && Number.isFinite(Number(body.coins))) {
    const result = await admin
      .from("coin_packages")
      .select("id, coins, price_rupees")
      .eq("coins", Number(body.coins))
      .eq("is_active", true)
      .maybeSingle();
    packageRow = result.data;
    packageError = result.error;
  }

  if (packageError || !packageRow) return NextResponse.json({ error: "That package is unavailable." }, { status: 400 });

  const upiId = process.env.ISHQIYA_UPI_ID?.trim();
  if (!upiId) return NextResponse.json({ error: "UPI payments are not configured on the server." }, { status: 503 });

  const amountRupees = Number(packageRow.price_rupees);
  if (!Number.isFinite(amountRupees) || amountRupees <= 0) return NextResponse.json({ error: "Coin package price is invalid." }, { status: 500 });

  const orderId = crypto.randomUUID();
  const transactionRef = orderId.replaceAll("-", "").slice(0, 35);
  const noteRef = transactionRef.slice(-12);
  const merchantCode = process.env.ISHQIYA_UPI_MCC?.trim();
  const payeeName = process.env.ISHQIYA_UPI_PAYEE_NAME?.trim() || "Ishqiya";
  const upiParams = new URLSearchParams({
    pa: upiId,
    pn: payeeName,
    tr: transactionRef,
    tn: `Ishqiya ${noteRef}`,
    am: amountRupees.toFixed(2),
    cu: "INR",
  });
  if (merchantCode) upiParams.set("mc", merchantCode);

  const upiUri = `upi://pay?${upiParams.toString()}`;
  const { data: order, error } = await admin.from("payment_orders").insert({
    id: orderId,
    user_id: user.id,
    package_id: packageRow.id,
    coins: packageRow.coins,
    expected_amount_paise: Math.round(amountRupees * 100),
    upi_uri: upiUri,
    payment_provider: "upi",
  }).select("id, coins, expected_amount_paise, upi_uri, status, expires_at").single();

  if (error) return NextResponse.json({ error: "Payment order could not be created." }, { status: 500 });
  return NextResponse.json({
    order,
    upiId,
    payeeName,
  });
}
