"use client";

import { useEffect, useRef, useState } from "react";

type GooglePlayProduct = {
  id: string;
  coins: number;
};

export const GOOGLE_PLAY_PRODUCTS: GooglePlayProduct[] = [
  { id: "coins_100", coins: 100 },
  { id: "coins_500", coins: 500 },
  { id: "coins_1000", coins: 1000 },
  { id: "coins_5000", coins: 5000 },
  { id: "coins_10000", coins: 10000 },
  { id: "coins_50000", coins: 50000 },
  { id: "coins_100000", coins: 100000 },
];

export function GooglePlayWallet() {
  const [available, setAvailable] = useState(false);
  const [message, setMessage] = useState("");
  const initialized = useRef(false);

  useEffect(() => {
    let mounted = true;
    let buyProduct: ((productId: string) => Promise<void>) | null = null;

    async function setup() {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return;

        const { store, ProductType, Platform } = await import("capacitor-plugin-cdv-purchase");
        GOOGLE_PLAY_PRODUCTS.forEach((product) => {
          store.register({ id: product.id, type: ProductType.CONSUMABLE, platform: Platform.GOOGLE_PLAY });
        });

        async function buy(productId: string) {
          const product = store.get(productId);
          if (!product) throw new Error("This Google Play product is not available.");
          const offer = product.getOffer();
          if (!offer) throw new Error("This product is temporarily unavailable.");
          setMessage("Opening Google Play…");
          const error = await offer.order();
          if (error) setMessage(error.message || "Purchase could not be started.");
        }

        buyProduct = buy;

        store.when().approved(async (transaction: any) => {
          try {
            const productId = transaction.products?.[0]?.id ?? transaction.products?.[0]?.productId;
            let purchaseToken: string | undefined;
            const transactionData = transaction?.transaction;
            if (typeof transaction?.purchaseToken === "string") purchaseToken = transaction.purchaseToken;
            else if (typeof transactionData?.purchaseToken === "string") purchaseToken = transactionData.purchaseToken;
            else if (typeof transactionData?.receipt === "string") {
              try {
                const parsedReceipt = JSON.parse(transactionData.receipt);
                if (typeof parsedReceipt?.purchaseToken === "string") purchaseToken = parsedReceipt.purchaseToken;
              } catch { /* invalid receipt */ }
            }
            if (!productId || !purchaseToken) throw new Error("Google Play purchase token was not found.");

            const response = await fetch("/api/google-play/purchase", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ productId, purchaseToken }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Purchase verification failed.");

            if (mounted) {
              setMessage(`${result.coins.toLocaleString()} coins added.`);
              window.dispatchEvent(new CustomEvent("ishqiya-wallet-refresh"));
              window.dispatchEvent(new CustomEvent("ishqiya-purchase-complete", { detail: { productId, coins: result.coins } }));
            }
            transaction.finish();
          } catch (error) {
            console.error(error);
            if (mounted) setMessage(error instanceof Error ? error.message : "Purchase verification failed.");
          }
        });

        await store.initialize();
        if (mounted) {
          initialized.current = true;
          setAvailable(true);
        }
      } catch (error) {
        console.error("Google Play billing unavailable:", error);
      }
    }

    function handlePurchase(event: Event) {
      const productId = (event as CustomEvent<{ productId?: string }>).detail?.productId;
      if (!productId || !buyProduct) return;
      void buyProduct(productId).catch((error) => setMessage(error instanceof Error ? error.message : "Google Play purchase failed."));
    }

    window.addEventListener("ishqiya-buy-coins", handlePurchase);
    void setup();
    return () => {
      mounted = false;
      window.removeEventListener("ishqiya-buy-coins", handlePurchase);
    };
  }, []);

  if (!available || !initialized.current) return null;

  return (
    <div className="choice-card">
      <span className="eyebrow">Google Play</span>
      <strong>Buy Coins</strong>
      <div className="choice-grid">
        {GOOGLE_PLAY_PRODUCTS.map((product) => (
          <button key={product.id} className="choice-card" type="button" onClick={() => window.dispatchEvent(new CustomEvent("ishqiya-buy-coins", { detail: { productId: product.id } }))}>
            <strong>{product.coins.toLocaleString()}</strong>
            <span className="muted">coins</span>
          </button>
        ))}
      </div>
      {message && <p className="muted" role="status">{message}</p>}
    </div>
  );
}
