import { NextResponse } from "next/server";
import { google } from "googleapis";
import { requireAccount } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const PACKAGE_NAME =
  process.env.GOOGLE_PLAY_PACKAGE_NAME || "com.ishqiya.app";

const COIN_PACKAGES: Record<string, number> = {
  coins_100: 100,
  coins_500: 500,
  coins_1000: 1000,
  coins_5000: 5000,
  coins_10000: 10000,
  coins_50000: 50000,
  coins_100000: 100000,
};

function getGooglePlayAuth() {
  const raw = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;

  if (!raw) {
    throw new Error("Google Play service account is not configured.");
  }

  const credentials = JSON.parse(raw);

  return new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/androidpublisher"],
  });
}

export async function POST(request: Request) {
  try {
    const { user } = await requireAccount();

    const body = (await request.json()) as {
      productId?: string;
      purchaseToken?: string;
    };

    const productId = body.productId?.trim();
    const purchaseToken = body.purchaseToken?.trim();

    if (
      !productId ||
      !purchaseToken ||
      !Object.prototype.hasOwnProperty.call(COIN_PACKAGES, productId)
    ) {
      return NextResponse.json(
        { error: "Invalid Google Play purchase." },
        { status: 400 }
      );
    }

    const coins = COIN_PACKAGES[productId];

    if (!Number.isInteger(coins) || coins <= 0) {
      return NextResponse.json(
        { error: "Invalid product." },
        { status: 400 }
      );
    }

    const auth = getGooglePlayAuth();

    const publisher = google.androidpublisher({
      version: "v3",
      auth,
    });

    const result = await publisher.purchases.products.get({
      packageName: PACKAGE_NAME,
      provider: "google_play",
      productId,
      token: purchaseToken,
    });

    const purchase = result.data;

    // Google Play purchaseState:
    // 0 = purchased
    // 1 = canceled
    // 2 = pending
    if (purchase.purchaseState !== 0) {
      return NextResponse.json(
        { error: "Google Play purchase is not completed." },
        { status: 409 }
      );
    }

    const admin = createAdminClient();

    const rawPurchase = {
      purchaseState: purchase.purchaseState ?? null,
      consumptionState: purchase.consumptionState ?? null,
      orderId: purchase.orderId ?? null,
      purchaseTimeMillis: purchase.purchaseTimeMillis ?? null,
      productId,
      packageName: PACKAGE_NAME,
    };

    const { data: balance, error: creditError } = await admin.rpc(
      "ishqiya_process_google_play_purchase",
      {
        p_user_id: user.id,
        p_product_id: productId,
        p_purchase_token: purchaseToken,
        p_order_id: purchase.orderId ?? null,
        p_package_name: PACKAGE_NAME,
        p_purchase_time: purchase.purchaseTimeMillis
          ? new Date(Number(purchase.purchaseTimeMillis)).toISOString()
          : null,
        p_raw_purchase: rawPurchase,
        p_coins: coins,
      }
    );

    if (creditError) {
      console.error(
        "Google Play purchase processing failed:",
        creditError.message
      );

      return NextResponse.json(
        { error: "Purchase could not be credited." },
        { status: 500 }
      );
    }

    // Consumable products must be consumed so they can be purchased again.
    if (purchase.consumptionState !== 1) {
      try {
        await publisher.purchases.products.consume({
          packageName: PACKAGE_NAME,
          productId,
          token: purchaseToken,
        });
      } catch (consumeError) {
        // Coins have already been credited idempotently.
        // Reconciliation can retry consumption later.
        console.error(
          "Google Play consumption pending:",
          consumeError instanceof Error
            ? consumeError.message
            : "Unknown consumption error"
        );
      }
    }

    await admin
      .from("google_play_purchases")
      .update({
        purchase_state: "purchased",
        consumption_state: "consumed",
        consumed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("purchase_token", purchaseToken);

    return NextResponse.json({
      success: true,
      coins,
      balance,
    });
  } catch (error) {
    console.error(
      "Google Play purchase request failed:",
      error instanceof Error ? error.message : "Unknown error"
    );

    return NextResponse.json(
      { error: "Google Play purchase verification failed." },
      { status: 500 }
    );
  }
}
