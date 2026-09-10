"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, EmptyState, Loading } from "@/components/ui";
import { GOOGLE_PLAY_PRODUCTS } from "@/components/google-play-wallet";

type Profile = {
  host_id: string;
  display_name: string;
  headline: string | null;
  bio: string | null;
  city: string | null;
  age: number | null;
  avatar_path: string | null;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const existing = document.querySelector<HTMLScriptElement>('script[data-ishqiya-razorpay="true"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(Boolean(window.Razorpay)), { once: true });
      existing.addEventListener("error", () => resolve(false), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.dataset.ishqiyaRazorpay = "true";
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function DiscoverBrowser() {
  const router = useRouter();
  const paymentRef = useRef<HTMLElement | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [paymentHost, setPaymentHost] = useState<Profile | null>(null);
  const [pendingHostId, setPendingHostId] = useState("");
  const [processingPayment, setProcessingPayment] = useState(false);

  async function load() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/discover?limit=20&offset=0", { cache: "no-store" });
      const result = await response.json() as { profiles?: Profile[]; error?: string };
      if (!response.ok) setMessage(result.error || "Discovery could not be loaded.");
      setProfiles(result.profiles || []);
    } catch {
      setProfiles([]);
      setMessage("Discovery could not reach the server.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    if (!paymentHost) return;
    requestAnimationFrame(() => paymentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, [paymentHost]);

  useEffect(() => {
    async function handlePurchaseComplete() {
      if (!pendingHostId) return;
      setProcessingPayment(true);
      try {
        const response = await fetch("/api/video/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hostId: pendingHostId }),
        });
        const result = await response.json() as { matchId?: string; error?: string };
        if (!response.ok || !result.matchId) throw new Error(result.error || "Video call request could not be created.");
        setPaymentHost(null);
        setPendingHostId("");
        router.push(`/user/match/${result.matchId}`);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Video call request could not be created.");
      } finally {
        setProcessingPayment(false);
      }
    }

    const listener = () => void handlePurchaseComplete();
    window.addEventListener("ishqiya-purchase-complete", listener);
    return () => window.removeEventListener("ishqiya-purchase-complete", listener);
  }, [pendingHostId, router]);

  function openVideoPayment(profile: Profile) {
    setMessage("");
    setPendingHostId(profile.host_id);
    setPaymentHost(profile);
  }

  async function choosePackage(productId: string) {
    setProcessingPayment(true);
    setMessage("");
    try {
      const { Capacitor } = await import("@capacitor/core");
      if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android") {
        window.dispatchEvent(new CustomEvent("ishqiya-buy-coins", { detail: { productId } }));
        return;
      }

      const loaded = await loadRazorpay();
      if (!loaded || !window.Razorpay) throw new Error("Browser payment gateway could not be loaded.");

      const orderResponse = await fetch("/api/browser-payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      const order = await orderResponse.json() as { keyId?: string; orderId?: string; amount?: number; currency?: string; coins?: number; amountRupees?: number; error?: string };
      if (!orderResponse.ok || !order.keyId || !order.orderId || !order.amount) throw new Error(order.error || "Browser payment order could not be created.");

      const Razorpay = window.Razorpay;
      const checkout = new Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency || "INR",
        name: "Ishqiya",
        description: `${order.coins?.toLocaleString() || "Selected"} Ishqiya Coins`,
        order_id: order.orderId,
        theme: { color: "#b52f63" },
        handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          try {
            const verifyResponse = await fetch("/api/browser-payment/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderId: response.razorpay_order_id, paymentId: response.razorpay_payment_id, signature: response.razorpay_signature }),
            });
            const result = await verifyResponse.json() as { coins?: number; error?: string };
            if (!verifyResponse.ok) throw new Error(result.error || "Payment verification failed.");
            setMessage(`${result.coins?.toLocaleString() || "Your"} coins added successfully.`);
            window.dispatchEvent(new CustomEvent("ishqiya-wallet-refresh"));
            window.dispatchEvent(new CustomEvent("ishqiya-purchase-complete", { detail: { productId, coins: result.coins } }));
          } catch (error) {
            setMessage(error instanceof Error ? error.message : "Payment verification failed.");
          } finally {
            setProcessingPayment(false);
          }
        },
        modal: { ondismiss: () => setProcessingPayment(false) },
      });
      checkout.open();
    } catch (error) {
      setProcessingPayment(false);
      setMessage(error instanceof Error ? error.message : "Payment could not be started.");
    }
  }

  async function act(targetId: string, action: "like" | "pass") {
    const response = await fetch("/api/discover/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetId, action }),
    });
    const result = await response.json() as { error?: string };
    if (!response.ok) { setMessage(result.error || "That action could not be saved."); return; }
    setProfiles((current) => current.filter((profile) => profile.host_id !== targetId));
  }

  if (loading && profiles.length === 0) return <Loading label="Loading Hosts" />;
  if (!loading && profiles.length === 0) return <EmptyState title="No Hosts are available yet" message="Approved, active Hosts will appear here when they are ready to meet." />;

  const renderCard = (profile: Profile) => (
    <article className="discover-card" key={profile.host_id} style={{ width: "100%", maxWidth: 360, margin: 0, overflow: "hidden", borderRadius: 24, background: "var(--surface)", border: "1px solid var(--line)" }}>
      <div className="discover-photo" role="img" aria-label={`${profile.display_name} profile photo`} style={{ aspectRatio: "4 / 5", width: "100%", maxHeight: 460, overflow: "hidden", position: "relative", background: "var(--blush)" }}>
        {profile.avatar_path ? <img src={profile.avatar_path} alt={`${profile.display_name} profile`} loading="lazy" onError={(event) => { event.currentTarget.style.display = "none"; }} style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 15%" }} /> : <div className="photo-placeholder" style={{ height: "100%", minHeight: 0 }}>Profile photo</div>}
      </div>
      <div className="discover-info" style={{ padding: "1.05rem 1.1rem 1.15rem" }}>
        <div style={{ alignItems: "flex-start", display: "flex", justifyContent: "space-between", gap: ".8rem" }}>
          <div style={{ minWidth: 0 }}><h2 style={{ margin: 0, fontSize: "1.15rem" }}>{profile.display_name}{profile.age ? `, ${profile.age}` : ""}</h2>{profile.city && <p style={{ margin: ".3rem 0 0", color: "var(--muted)" }}>{profile.city}</p>}</div>
          <span aria-label="Available" title="Available" style={{ width: 9, height: 9, marginTop: 7, borderRadius: "50%", background: "#62c58a", flex: "0 0 auto" }} />
        </div>
        <p style={{ color: "var(--muted)", lineHeight: 1.5, margin: ".65rem 0 .9rem", minHeight: "2.5rem" }}>{profile.headline || profile.bio || "A great conversation awaits."}</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".55rem", marginBottom: ".55rem" }}><Button type="button" variant="danger" onClick={() => void act(profile.host_id, "pass")}>✕ Pass</Button><Button type="button" onClick={() => void act(profile.host_id, "like")}>♥ Like</Button></div>
        <Button type="button" onClick={() => openVideoPayment(profile)} style={{ width: "100%" }}>◉ Video Call</Button>
      </div>
    </article>
  );

  return (
    <>
      {message && <p role="status" className="muted" style={{ textAlign: "center", marginBottom: "1rem" }}>{message}</p>}
      <div className="discover-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 360px))", justifyContent: "center", gap: "1rem", width: "100%" }}>{profiles.map(renderCard)}</div>

      {paymentHost && (
        <section ref={paymentRef} aria-label="Video call payment" style={{ scrollMarginTop: 72, marginTop: "2rem", padding: "1.2rem", borderRadius: 24, border: "1px solid var(--line)", background: "var(--surface)", display: "grid", gap: "1rem" }}>
          <div><span className="eyebrow">Video call payment</span><h2 className="serif" style={{ margin: ".25rem 0 0" }}>Call {paymentHost.display_name}</h2><p className="muted" style={{ margin: ".35rem 0 0" }}>Choose one complete package. The amount and coin quantity are locked by Ishqiya.</p></div>
          <div style={{ display: "grid", gap: ".65rem" }}>
            {GOOGLE_PLAY_PRODUCTS.map((product) => (
              <button key={product.id} type="button" className="choice-card" disabled={processingPayment} onClick={() => void choosePackage(product.id)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", textAlign: "left" }}>
                <span><strong>{product.coins.toLocaleString()} coins</strong><span className="muted" style={{ display: "block", marginTop: ".2rem" }}>₹{product.coins.toLocaleString()} package</span></span>
                <span>{processingPayment ? "Opening payment…" : "Pay now →"}</span>
              </button>
            ))}
          </div>
          <p className="muted" style={{ fontSize: ".82rem" }}>Android: Google Play Billing. Browser: secure Razorpay Checkout. Video request is created only after the server verifies payment.</p>
        </section>
      )}
    </>
  );
}
