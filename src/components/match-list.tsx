"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { EmptyState, Loading } from "@/components/ui";

type Match = { match_id: string; other_id: string; other_role: string; display_name: string | null; headline: string | null; bio: string | null; avatar_path: string | null };

export function MatchList() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => { fetch("/api/matches").then(async (response) => { const result = await response.json() as { matches?: Match[]; error?: string }; if (!response.ok) setError(result.error || "Matches could not be loaded."); else setMatches(result.matches || []); setLoading(false); }); }, []);
  if (loading) return <Loading label="Loading matches" />;
  if (error) return <p className="muted" role="alert">{error}</p>;
  if (!matches.length) return <EmptyState title="Your matches will live here" message="A mutual connection with an approved Host will appear here." />;
  return <div className="discover-grid">{matches.map((match) => <article className="choice-card" key={match.match_id}><span className="eyebrow">{match.other_role}</span><h2>{match.display_name || "Ishqiya connection"}</h2><p>{match.headline || match.bio || "Your conversation can begin when it feels right."}</p><Link className="button button-primary" href={`/user/match/${match.match_id}`}>Open conversation</Link></article>)}</div>;
}