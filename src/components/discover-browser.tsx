"use client";

import { useEffect, useState } from "react";
import { Button, EmptyState, Loading } from "@/components/ui";
import { DEMO_HOSTS } from "@/lib/demo-hosts";

type Profile = { host_id: string; display_name: string; headline: string | null; bio: string | null; city: string | null; age: number | null; avatar_path: string | null; is_demo?: boolean };

function withDemoHosts(realProfiles: Profile[]) {
  const realIds = new Set(realProfiles.map((profile) => profile.host_id));
  return [...realProfiles, ...DEMO_HOSTS.filter((profile) => !realIds.has(profile.host_id))];
}

export function DiscoverBrowser() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [view, setView] = useState<"cards" | "grid">("cards");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/discover?limit=20&offset=0");
      const result = await response.json() as { profiles?: Profile[]; error?: string };
      if (!response.ok) setMessage(result.error || "Discovery could not be loaded.");
      setProfiles(withDemoHosts(result.profiles || []));
    } catch {
      setProfiles(DEMO_HOSTS);
      setMessage("Showing available profiles.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function act(targetId: string, action: "like" | "pass") {
    if (targetId.startsWith("demo-host-")) {
      setProfiles((current) => current.filter((profile) => profile.host_id !== targetId));
      setMessage(action === "like" ? "Like saved." : "Passed. Showing the next profile.");
      return;
    }
    const response = await fetch("/api/discover/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetId, action }) });
    const result = await response.json() as { error?: string };
    if (!response.ok) { setMessage(result.error || "That action could not be saved."); return; }
    setProfiles((current) => current.filter((profile) => profile.host_id !== targetId));
  }

  if (loading && profiles.length === 0) return <Loading label="Loading hosts" />;
  if (!loading && profiles.length === 0) return <EmptyState title="No Hosts are available yet" message="Approved, active Hosts will appear here when they are ready to meet." />;

  const current = profiles[0];
  const renderCard = (profile: Profile) => <article className="discover-card" key={profile.host_id}>
    <div className="discover-photo" role="img" aria-label={`${profile.display_name} profile photo`}>
      {profile.avatar_path ? <img src={profile.avatar_path} alt={`${profile.display_name} profile`} /> : <div className="photo-placeholder">Profile photo</div>}
    </div>
    <div className="discover-info">
      <div className="discover-profile-heading"><div><h2>{profile.display_name}{profile.age ? `, ${profile.age}` : ""}</h2><p className="discover-city">{profile.city || ""}</p></div><span className="online-dot" aria-label="Available" title="Available" /></div>
      <p>{profile.headline || profile.bio || "A great conversation awaits."}</p>
      <div className="discover-actions"><Button type="button" variant="danger" onClick={() => void act(profile.host_id, "pass")}>✕ Pass</Button><Button type="button" onClick={() => void act(profile.host_id, "like")}>♥ Like</Button></div>
    </div>
  </article>;

  return <>
    <div className="discover-switcher"><Button type="button" variant={view === "cards" ? "primary" : "quiet"} onClick={() => setView("cards")}>Swipe</Button><Button type="button" variant={view === "grid" ? "primary" : "quiet"} onClick={() => setView("grid")}>All profiles</Button></div>
    {message && <p role="status" className="muted">{message}</p>}
    {view === "cards" ? <section className="swipe-stage" aria-label="Swipe discovery"><div className="swipe-count">{profiles.length} available</div>{renderCard(current)}</section> : <div className="discover-grid">{profiles.map(renderCard)}</div>}
  </>;
}
