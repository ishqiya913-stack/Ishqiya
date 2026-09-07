"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { EmptyState, Loading } from "@/components/ui";

type Match = { match_id: string; display_name: string | null; bio: string | null };
export function HostChatList() {
  const [matches, setMatches] = useState<Match[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  useEffect(() => { let active=true; async function load() { const response=await fetch("/api/host/matches"); const result=await response.json() as { matches?: Match[]; error?: string }; if (!active) return; if (!response.ok) setError(result.error || "Chat could not be loaded."); else setMatches(result.matches || []); setLoading(false); } void load(); return () => { active=false; }; }, []);
  if (loading) return <Loading label="Loading conversations" />;
  if (error) return <p className="muted" role="alert">{error}</p>;
  if (!matches.length) return <EmptyState title="Your conversations will appear here" message="When a User and Host mutually connect, the conversation becomes available." />;
  return <div className="discover-grid">{matches.map((match) => <article className="choice-card" key={match.match_id}><span className="eyebrow">Matched User</span><h2>{match.display_name || "Ishqiya User"}</h2><p>{match.bio || "A new conversation awaits."}</p><Link className="button button-primary" href={`/host/chat/${match.match_id}`}>Open chat</Link></article>)}</div>;
}
