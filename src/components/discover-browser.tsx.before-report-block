"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, EmptyState, Loading } from "@/components/ui";

type Profile = { host_id: string; display_name: string; headline: string | null; bio: string | null; city: string | null; age: number | null; avatar_path: string | null };

export function DiscoverBrowser() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [view, setView] = useState<"cards" | "grid">("cards");
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function load(nextOffset = 0) {
    setLoading(true);
    setMessage("");
    const response = await fetch(`/api/discover?limit=20&offset=${nextOffset}`);
    const result = await response.json() as { profiles?: Profile[]; error?: string };
    if (!response.ok) setMessage(result.error || "Discovery could not be loaded.");
    else setProfiles((current) => nextOffset ? [...current, ...(result.profiles || [])] : result.profiles || []);
    setLoading(false);
  }

  useEffect(() => { let active = true; async function initialLoad() { setLoading(true); const response = await fetch("/api/discover?limit=20&offset=0"); const result = await response.json() as { profiles?: Profile[]; error?: string }; if (!active) return; if (!response.ok) setMessage(result.error || "Discovery could not be loaded."); else setProfiles(result.profiles || []); setLoading(false); } void initialLoad(); return () => { active = false; }; }, []);

  async function act(targetId: string, action: "like" | "pass") {
    const response = await fetch("/api/discover/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetId, action }) });
    const result = await response.json() as { error?: string };
    if (!response.ok) setMessage(result.error || "That action could not be saved.");
    setProfiles((current) => current.filter((profile) => profile.host_id !== targetId));
  }

  if (loading && profiles.length === 0) return <Loading label="Loading hosts" />;
  if (message && profiles.length === 0) return <p role="alert" className="muted">{message}</p>;
  if (!loading && profiles.length === 0) return <EmptyState title="No Hosts are available yet" message="Approved, active Hosts will appear here when they are ready to meet." />;

  return <>
    <div className="form-footer"><Button type="button" variant={view === "cards" ? "primary" : "quiet"} onClick={() => setView("cards")}>Card view</Button><Button type="button" variant={view === "grid" ? "primary" : "quiet"} onClick={() => setView("grid")}>Grid view</Button></div>
    {message && <p role="alert" className="muted">{message}</p>}
    <div className={view === "grid" ? "discover-grid" : "discover-grid discover-grid-cards"}>
      {profiles.map((profile) => <article className="discover-card" key={profile.host_id}>
        <div className="photo-placeholder" role="img" aria-label={`${profile.display_name} profile photo`}>{profile.avatar_path ? <img src={profile.avatar_path} alt="" /> : "Host photo"}</div>
        <div className="discover-info"><h2>{profile.display_name}{profile.age ? `, ${profile.age}` : ""}</h2><p>{profile.city || "Ishqiya"}<br />{profile.headline || profile.bio || "A considered conversation awaits."}</p><div className="discover-actions"><Button type="button" variant="danger" onClick={() => void act(profile.host_id, "pass")}>Pass</Button><Button type="button" onClick={() => void act(profile.host_id, "like")}>Like</Button></div><Link href={`/user/match?host=${profile.host_id}`}>View connection</Link></div>
      </article>)}
    </div>
    <Button type="button" variant="quiet" disabled={loading} onClick={() => { const next = offset + 20; setOffset(next); void load(next); }}>{loading ? "Loading..." : "Load more"}</Button>
  </>;
}
