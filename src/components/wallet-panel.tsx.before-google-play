"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button, Input, Loading } from "@/components/ui";

type Package = { id: string; coins: number; price_paise: number };
export function WalletPanel() {
  const [balance, setBalance] = useState(0);
  const [packages, setPackages] = useState<Package[]>([]);
  const [selected, setSelected] = useState<Package | null>(null);
  const [order, setOrder] = useState<{ id: string; coins: number; expected_amount_paise: number; upi_uri: string } | null>(null);
  const [utr, setUtr] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch("/api/wallet").then(async (response) => { const result = await response.json() as { balance?: number; packages?: Package[]; pendingOrder?: typeof order; error?: string }; if (!response.ok) setMessage(result.error || "Wallet unavailable."); else { setBalance(result.balance || 0); setPackages(result.packages || []); setOrder(result.pendingOrder || null); } setLoading(false); }); }, []);
  async function createOrder() { if (!selected) return; setMessage(""); const response = await fetch("/api/wallet", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ packageId: selected.id }) }); const result = await response.json() as { order?: typeof order; error?: string }; if (!response.ok) setMessage(result.error || "Order unavailable."); else if (result.order) { setOrder(result.order); window.location.assign(result.order.upi_uri); } }
  async function submitProof(event: FormEvent) { event.preventDefault(); if (!order || !screenshot) return; const form = new FormData(); form.set("orderId", order.id); form.set("utr", utr); form.set("transactionId", transactionId); form.set("screenshot", screenshot); const response = await fetch("/api/wallet/proof", { method: "POST", body: form }); const result = await response.json() as { error?: string }; setMessage(response.ok ? "Proof submitted for review. Coins remain locked until approval." : result.error || "Proof could not be submitted."); }
  if (loading) return <Loading label="Loading wallet" />;
  return <div className="wallet-panel"><div className="choice-card"><span className="eyebrow">Available coins</span><strong>{balance.toLocaleString()}</strong><p className="muted">Coin balance changes only after a verified ledger transaction.</p></div><div className="choice-grid">{packages.map((item) => <button className="choice-card" type="button" key={item.id} onClick={() => setSelected(item)} aria-pressed={selected?.id === item.id}><strong>{item.coins.toLocaleString()} coins</strong><p>₹{(item.price_paise / 100).toLocaleString("en-IN")}</p></button>)}</div><Button type="button" disabled={!selected} onClick={() => void createOrder()}>Pay with UPI</Button>{order && <form onSubmit={submitProof} className="form-card"><p>After returning from UPI, upload the real payment screenshot with the UTR/Transaction ID visible. Expected amount: ₹{(order.expected_amount_paise / 100).toLocaleString("en-IN")}.</p><a className="button button-secondary" href={order.upi_uri}>Reopen UPI payment</a><Input id="utr" label="UTR" value={utr} onChange={(event) => setUtr(event.target.value)} required pattern="[A-Za-z0-9][A-Za-z0-9_-]{5,63}" /><Input id="transaction-id" label="Transaction ID" value={transactionId} onChange={(event) => setTransactionId(event.target.value)} required pattern="[A-Za-z0-9][A-Za-z0-9_-]{5,63}" /><Input id="screenshot" label="Payment screenshot" type="file" accept="image/*" onChange={(event) => setScreenshot(event.target.files?.[0] || null)} required /><Button type="submit">Submit payment proof</Button></form>}{message && <p className="muted" role="status">{message}</p>}</div>;
}
