import { NextResponse } from "next/server";
import { google } from "googleapis";
import { requireAccount } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const PACKAGE_NAME = process.env.GOOGLE_PLAY_PACKAGE_NAME || "com.ishqiya.app";

const PRODUCT_COINS: Record<string, number> = {
  coins_100: 100,
  coins_500: 500,
  coins_1000: 1000,
  coins_5000: 5000,
  coins_10000: 10000,
  coins_50000: 50000,
  coins_100000: 100000,
};

function getGoogleAuth() {
  const raw = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;

  if (!raw) {
    throw new Error("Google Play service account is not configured");
  }

  return new google.auth.GoogleAuth({
    credentials: JSON.parse(raw),
    scopes: ["https://www.googleapis.com/auth/androidpublisher"],
  });
}

export async function POST(request: Request) {
  try {
    const { user } = await requireAccount();

    const body = await request.json() as {
      productId?: string;
      purchaseToken?: string;
    };

    const productId = body.productId?.trim();
    const purchaseToken = body.purchaseToken?.trim();

    if (!productId || !purchaseToken) {
      return NextResponse.json(
        { error: "Product ID and purchase token are required." },
        { status: 400 }
      );
    }

    const coins = PRODUCT_COINS[productId];

    if (!coins) {
      return NextResponse.json(
        { error: "Unknown Google Play product." },
        { status: 400 }
      );
    }

    const auth = getGoogleAuth();

    const publisher = google.androidpublisher({
      version: "v3",
      auth,
    });

    const purchase = await publisher.purchases.products.get({
      packageName: PACKAGE_NAME,
      productId,
      token: purchaseToken,
    });

    const data = purchase.data;

    if (data.purchaseState !== 0) {
      const state =
        data.purchaseState === 2
          ? "pending"
          : data.purchaseState === 1
            ? "canceled"
            : "error";

      return NextResponse.json(
        {
          error:
            state === "pending"
              ? "Payment is still pending."
              : "Google Play purchase was not completed.",
          state,
        },
        { status: 409 }
      );
    }

    if (data.packageName && data.packageName !== PACKAGE_NAME) {
      return NextResponse.json(
        { error: "Invalid application package." },
        { status: 400 }
      );
    }

    if (data.productId && data.productId !== productId) {
      return NextResponse.json(
        { error: "Product verification failed." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const { data: result, error } = await admin.rpc(
      "ishqiya_process_google_play_purchase",
      {
        p_user_id: user.id,
        p_product_id: productId,
        p_purchase_token: purchaseToken,
        p_order_id: data.orderId ?? null,
        p_package_name: PACKAGE_NAME,
        p_purchase_time: data.purchaseTimeMillis
          ? new Date(Number(data.purchaseTimeMillis)).toISOString()
          : null,
        p_raw_purchase: data,
        p_coins: coins,
      }
    );

    if (error) {
      console.error("Google Play wallet credit failed:", error);
      return NextResponse.json(
        { error: "Purchase verification could not be completed." },
        { status: 500 }
      );
    }

    if (data.consumptionState !== 1) {
      await publisher.purchases.products.consume({
        packageName: PACKAGE_NAME,
        productId,
        token: purchaseToken,
      });
    }

    await admin
      .from("google_play_purchases")
      .update({
        consumption_state: "consumed",
        consumed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("purchase_token", purchaseToken);

    return NextResponse.json({
      verified: true,
      coins,
      balance: result,
    });
  } catch (error) {
    console.error("Google Play purchase error:", error);

    return NextResponse.json(
      { error: "Google Play purchase verification failed." },
      { status: 500 }
    );
  }
}
