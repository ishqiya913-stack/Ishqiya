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
  const body = await request.json() as { packageId?: string };
  if (!body.packageId) return NextResponse.json({ error: "Select a coin package." }, { status: 400 });
  const admin = createAdminClient();
  const { data: packageRow, error: packageError } = await admin.from("coin_packages").select("id, coins, price_rupees").eq("id", body.packageId).eq("is_active", true).maybeSingle();
  if (packageError || !packageRow) return NextResponse.json({ error: "That package is unavailable." }, { status: 400 });
  const upiId = process.env.ISHQIYA_UPI_ID;
  if (upiId !== "velvetbombay01@okhdfcbank") return NextResponse.json({ error: "UPI payments are not configured with the approved account." }, { status: 503 });
  const orderId = crypto.randomUUID();
  const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=Ishqiya&am=${(packageRow.price_rupees / 100).toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Ishqiya ${orderId}`)}`;
  const { data: order, error } = await admin.from("payment_orders").insert({ id: orderId, user_id: user.id, package_id: packageRow.id, coins: packageRow.coins, expected_amount_paise: packageRow.price_rupees, upi_uri: upiUri }).select("id, coins, expected_amount_paise, upi_uri, status, expires_at").single();
  if (error) return NextResponse.json({ error: "Payment order could not be created." }, { status: 500 });
  return NextResponse.json({ order });
}
