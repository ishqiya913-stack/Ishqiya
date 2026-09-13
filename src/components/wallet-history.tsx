"use client";

import { useEffect, useState } from "react";
import { Loading } from "@/components/ui";

type Transaction = {
  id: string;
  amount: number;
  balance_after: number;
  kind: string;
  reference_type: string | null;
  created_at: string;
  status: string;
  host?: { display_name?: string | null } | null;
};

type Call = {
  id: string;
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number;
  coins_charged: number;
  status: string;
  created_at: string;
  host?: { display_name?: string | null } | null;
};

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("en-IN");
}

function label(kind: string) {
  switch (kind) {
    case "payment_credit": return "Coins purchased";
    case "video_debit": return "Video call";
    case "message_debit": return "Chat";
    case "refund": return "Refund";
    case "admin_adjustment": return "Account adjustment";
    default: return kind.replaceAll("_", " ");
  }
}

export function WalletHistory() {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const response = await fetch("/api/wallet/history", { cache: "no-store" });
        const result = await response.json();
        if (!mounted) return;
        if (!response.ok) throw new Error(result.error || "Wallet history could not be loaded.");
        setBalance(Number(result.balance || 0));
        setTransactions(result.transactions || []);
        setCalls(result.calls || []);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : "Wallet history could not be loaded.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void load();
    const refresh = () => void load();
    window.addEventListener("ishqiya-wallet-refresh", refresh);
    return () => { mounted = false; window.removeEventListener("ishqiya-wallet-refresh", refresh); };
  }, []);

  if (loading) return <Loading label="Loading wallet history" />;
  if (error) return <p className="muted" role="alert">{error}</p>;

  return (
    <div style={{ display: "grid", gap: "1rem", marginTop: "1rem" }}>
      <section className="choice-card" style={{ textAlign: "center" }}>
        <span className="eyebrow">Available coins</span>
        <strong style={{ display: "block", fontSize: "2rem", marginTop: ".25rem" }}>{balance.toLocaleString("en-IN")}</strong>
      </section>

      <section className="form-card">
        <span className="eyebrow">Call history</span>
        <h2 className="serif" style={{ margin: ".25rem 0 1rem" }}>Your calls</h2>
        {calls.length === 0 ? <p className="muted">No video calls yet.</p> : (
          <div style={{ display: "grid", gap: ".65rem" }}>
            {calls.map((call) => (
              <div key={call.id} className="choice-card" style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center" }}>
                <div>
                  <strong>{call.host?.display_name || "Host"}</strong>
                  <div className="muted">{Math.max(0, Math.floor(Number(call.duration_seconds || 0) / 60))} min · {formatDate(call.started_at || call.created_at)}</div>
                </div>
                <strong>{Number(call.coins_charged || 0).toLocaleString("en-IN")} coins</strong>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="form-card">
        <span className="eyebrow">Transaction history</span>
        <h2 className="serif" style={{ margin: ".25rem 0 1rem" }}>Coins activity</h2>
        {transactions.length === 0 ? <p className="muted">No coin transactions yet.</p> : (
          <div style={{ display: "grid", gap: ".65rem" }}>
            {transactions.map((tx) => (
              <div key={tx.id} className="choice-card" style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center" }}>
                <div>
                  <strong>{label(tx.kind)}{tx.host?.display_name ? ` · ${tx.host.display_name}` : ""}</strong>
                  <div className="muted">{formatDate(tx.created_at)} · {tx.status}</div>
                </div>
                <strong>{tx.amount > 0 ? "+" : ""}{Number(tx.amount || 0).toLocaleString("en-IN")}</strong>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
