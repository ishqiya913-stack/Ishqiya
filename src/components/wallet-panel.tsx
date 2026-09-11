"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { FormEvent, useEffect, useState } from "react";
import { Button, Input, Loading } from "@/components/ui";
import { Capacitor } from "@capacitor/core";

type Package = { id: string; coins: number; price_rupees: number };
type Order = {
  id: string;
  coins: number;
  expected_amount_paise: number;
  upi_uri: string;
  status?: string;
  expires_at?: string;
};

export function WalletPanel() {
  // Browser UPI is intentionally unavailable inside the Play Android app.
  // Android purchases must use Google Play Billing.
  const isAndroidApp =
    Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";

  const [balance, setBalance] = useState(0);
  const [packages, setPackages] = useState<Package[]>([]);
  const [selected, setSelected] = useState<Package | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [utr, setUtr] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function loadWallet() {
    try {
      const response = await fetch("/api/wallet", { cache: "no-store" });
      const result = await response.json() as {
        balance?: number;
        packages?: Package[];
        pendingOrder?: Order | null;
        error?: string;
      };

      if (!response.ok) {
        setMessage(result.error || "Wallet unavailable.");
        return;
      }

      setBalance(result.balance || 0);
      setPackages(result.packages || []);
      setOrder(result.pendingOrder || null);
    } catch {
      setMessage("Wallet could not reach the server.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadWallet();

    const refresh = () => void loadWallet();
    window.addEventListener("ishqiya-wallet-refresh", refresh);
    return () => window.removeEventListener("ishqiya-wallet-refresh", refresh);
  }, []);

  async function createOrder() {
    if (!selected || busy) return;

    setBusy(true);
    setMessage("");

    try {
      const response = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: selected.id }),
      });

      const result = await response.json() as {
        order?: Order;
        error?: string;
      };

      if (!response.ok || !result.order) {
        setMessage(result.error || "Payment order could not be created.");
        return;
      }

      setOrder(result.order);

      // Opens a real UPI payment intent. No client-side credit is performed.
      window.location.assign(result.order.upi_uri);
    } catch {
      setMessage("Could not start UPI payment.");
    } finally {
      setBusy(false);
    }
  }

  async function submitProof(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!order || !screenshot || busy) return;

    setBusy(true);
    setMessage("");

    try {
      const form = new FormData();
      form.set("orderId", order.id);
      form.set("utr", utr.trim());
      form.set("transactionId", transactionId.trim());
      form.set("screenshot", screenshot);

      const response = await fetch("/api/wallet/proof", {
        method: "POST",
        body: form,
      });

      const result = await response.json() as {
        status?: string;
        error?: string;
      };

      if (!response.ok) {
        setMessage(result.error || "Payment proof could not be submitted.");
        return;
      }

      setMessage(
        result.status === "flagged"
          ? "Payment submitted and flagged for Admin review. Coins remain locked."
          : "Payment proof submitted for Admin review. Coins remain locked until approval."
      );

      setUtr("");
      setTransactionId("");
      setScreenshot(null);
      await loadWallet();
    } catch {
      setMessage("Payment proof could not be submitted.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Loading label="Loading wallet" />;

  if (isAndroidApp) return null;

  return (
    <div className="wallet-panel">
      <div className="choice-card">
        <span className="eyebrow">Available coins</span>
        <strong>{balance.toLocaleString("en-IN")}</strong>
        <p className="muted">
          Coins change only after a verified server-side ledger transaction.
        </p>
      </div>

      <div className="choice-grid">
        {packages.map((item) => (
          <button
            className="choice-card"
            type="button"
            key={item.id}
            onClick={() => setSelected(item)}
            aria-pressed={selected?.id === item.id}
          >
            <strong>{item.coins.toLocaleString("en-IN")} coins</strong>
            <p>₹{item.price_rupees.toLocaleString("en-IN")}</p>
          </button>
        ))}
      </div>

      {selected && (
        <div className="form-card">
          <p>
            Selected: <strong>{selected.coins.toLocaleString("en-IN")} coins</strong>
            {" "}for{" "}
            <strong>₹{selected.price_rupees.toLocaleString("en-IN")}</strong>.
          </p>

          <Button type="button" disabled={busy} onClick={() => void createOrder()}>
            {busy ? "Opening UPI…" : "Pay with UPI"}
          </Button>
        </div>
      )}

      {order && (
        <form onSubmit={submitProof} className="form-card">
          <span className="eyebrow">Payment verification</span>

          <p>
            After completing the UPI payment, submit the real UTR,
            transaction ID and payment screenshot.
          </p>

          <p>
            Expected amount:{" "}
            <strong>
              ₹{(order.expected_amount_paise / 100).toLocaleString("en-IN")}
            </strong>
          </p>

          <a className="button button-secondary" href={order.upi_uri}>
            Reopen UPI payment
          </a>

          <Input
            id="utr"
            label="UTR"
            value={utr}
            onChange={(event) => setUtr(event.target.value)}
            required
            pattern="[A-Za-z0-9][A-Za-z0-9_-]{5,63}"
            autoComplete="off"
          />

          <Input
            id="transaction-id"
            label="Transaction ID"
            value={transactionId}
            onChange={(event) => setTransactionId(event.target.value)}
            required
            pattern="[A-Za-z0-9][A-Za-z0-9_-]{5,63}"
            autoComplete="off"
          />

          <Input
            id="screenshot"
            label="Payment screenshot"
            type="file"
            accept="image/*"
            onChange={(event) =>
              setScreenshot(event.target.files?.[0] || null)
            }
            required
          />

          <Button type="submit" disabled={busy}>
            {busy ? "Submitting…" : "Submit payment proof"}
          </Button>

          <p className="muted">
            Coins are NOT credited at submission. Admin approval and the
            server-authoritative ledger are required.
          </p>
        </form>
      )}

      <div className="form-card">
        <p>
          <strong>Browser:</strong> manual UPI payment with UTR and screenshot
          verification.
        </p>
        <p>
          <strong>Android:</strong> Google Play Billing with server-side
          purchase verification.
        </p>
      </div>

      {message && (
        <p className="muted" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
