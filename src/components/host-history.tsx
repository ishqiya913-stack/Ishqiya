"use client";

import { useEffect, useState } from "react";
import { EmptyState, Loading } from "@/components/ui";

type Call = { id: string; duration_seconds: number; coins_charged: number; status: string; created_at?: string };
type Earning = { gross_coins: number; share_percent: number; earned_coins: number };
export function HostHistory() {
  const [calls, setCalls] = useState<Call[]>([]); const [earnings, setEarnings] = useState<Earning[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  useEffect(() => { let active=true; async function load() { const response=await fetch("/api/host/history"); const result=await response.json() as { calls?: Call[]; earnings?: Earning[]; error?: string }; if (!active) return; if (!response.ok) setError(result.error || "History could not be loaded."); else { setCalls(result.calls || []); setEarnings(result.earnings || []); } setLoading(false); } void load(); return () => { active=false; }; }, []);
  if (loading) return <Loading label="Loading host history" />; if (error) return <p role="alert" className="muted">{error}</p>; if (!calls.length && !earnings.length) return <EmptyState title="No history yet" message="Completed conversations and approved video earnings will appear here." />;
  return <div className="choice-grid"><section className="choice-card"><span className="eyebrow">Video history</span>{calls.length ? calls.map((call) => <p key={call.id}>{Math.ceil(call.duration_seconds / 60)} min · {call.coins_charged} coins · {call.status}</p>) : <p className="muted">No completed calls.</p>}</section><section className="choice-card"><span className="eyebrow">Earnings</span>{earnings.length ? earnings.map((earning, index) => <p key={`${earning.earned_coins}-${index}`}>{earning.earned_coins} coins · {earning.share_percent}% share</p>) : <p className="muted">No earnings yet.</p>}</section></div>;
}