"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, EmptyState, Loading } from "@/components/ui";
import { DEMO_HOSTS } from "@/lib/demo-hosts";

type Profile = {
  host_id: string;
  display_name: string;
  headline: string | null;
  bio: string | null;
  city: string | null;
  age: number | null;
  avatar_path: string | null;
  is_demo?: boolean;
};

function withDemoHosts(realProfiles: Profile[]) {
  const realIds = new Set(realProfiles.map((profile) => profile.host_id));
  if (process.env.NODE_ENV === "production") return realProfiles;
  return [...realProfiles, ...DEMO_HOSTS.filter((profile) => !realIds.has(profile.host_id))];
}

export function DiscoverBrowser() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [view, setView] = useState<"cards" | "grid">("grid");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/discover?limit=20&offset=0", { cache: "no-store" });
      const result = await response.json() as { profiles?: Profile[]; error?: string };
      if (!response.ok) setMessage(result.error || "Discovery could not be loaded.");
      setProfiles(withDemoHosts(result.profiles || []));
    } catch {
      setProfiles(withDemoHosts([]));
      setMessage("Discovery could not reach the server. Showing local preview profiles.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function act(targetId: string, action: "like" | "pass") {
    if (targetId.startsWith("demo-host-")) {
      setProfiles((current) => current.filter((profile) => profile.host_id !== targetId));
      setMessage(action === "like" ? "Like selected." : "Passed. Showing the next profile.");
      return;
    }
    const response = await fetch("/api/discover/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetId, action }),
    });
    const result = await response.json() as { error?: string };
    if (!response.ok) { setMessage(result.error || "That action could not be saved."); return; }
    setProfiles((current) => current.filter((profile) => profile.host_id !== targetId));
  }

  if (loading && profiles.length === 0) return <Loading label="Loading hosts" />;
  if (!loading && profiles.length === 0) return <EmptyState title="No Hosts are available yet" message="Approved, active Hosts will appear here when they are ready to meet." />;

  const current = profiles[0];
  const renderCard = (profile: Profile, swipe = false) => (
    <article className="discover-card" key={profile.host_id} style={{ width: "100%", maxWidth: swipe ? 520 : 360, margin: swipe ? "0 auto" : 0, overflow: "hidden", borderRadius: 24, background: "var(--surface)", border: "1px solid var(--line)" }}>
      <div className="discover-photo" role="img" aria-label={`${profile.display_name} profile photo`} style={{ aspectRatio: "4 / 5", width: "100%", maxHeight: swipe ? 620 : 450, overflow: "hidden", position: "relative", background: "var(--blush)" }}>
        {profile.avatar_path ? (
          <img
            src={profile.avatar_path}
            alt={`${profile.display_name} profile`}
            loading={swipe ? "eager" : "lazy"}
            onError={(event) => { event.currentTarget.style.display = "none"; }}
            style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
          />
        ) : <div className="photo-placeholder" style={{ height: "100%", minHeight: 0 }}>Profile photo</div>}
      </div>
      <div className="discover-info" style={{ padding: "1.05rem 1.1rem 1.15rem" }}>
        <div style={{ alignItems: "flex-start", display: "flex", justifyContent: "space-between", gap: ".8rem" }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: swipe ? "1.5rem" : "1.15rem" }}>{profile.display_name}{profile.age ? `, ${profile.age}` : ""}</h2>
            {profile.city && <p style={{ margin: ".3rem 0 0", color: "var(--muted)" }}>{profile.city}</p>}
          </div>
          <span aria-label="Available" title="Available" style={{ width: 9, height: 9, marginTop: 7, borderRadius: "50%", background: "#62c58a", flex: "0 0 auto" }} />
        </div>
        <p style={{ color: "var(--muted)", lineHeight: 1.5, margin: ".65rem 0 .9rem", minHeight: swipe ? "auto" : "2.5rem" }}>{profile.headline || profile.bio || "A great conversation awaits."}</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".55rem", marginBottom: ".55rem" }}>
          <Button type="button" variant="danger" onClick={() => void act(profile.host_id, "pass")}>✕ Pass</Button>
          <Button type="button" onClick={() => void act(profile.host_id, "like")}>♥ Like</Button>
        </div>
        <Button type="button" variant="quiet" onClick={() => {
          if (profile.is_demo) {
            setMessage("Preview profile: video calling is enabled for verified real Hosts after a match.");
            return;
          }
          router.push("/user/match");
        }} style={{ width: "100%" }}>
          ◉ Video Call
        </Button>
      </div>
    </article>
  );

  return (
    <>
      <div className="form-footer" style={{ display: "flex", justifyContent: "center", gap: ".6rem", marginBottom: "1.2rem" }}>
        <Button type="button" variant={view === "grid" ? "primary" : "quiet"} onClick={() => setView("grid")}>Discover All</Button>
        <Button type="button" variant={view === "cards" ? "primary" : "quiet"} onClick={() => setView("cards")}>Swipe</Button>
      </div>
      {message && <p role="status" className="muted" style={{ textAlign: "center", marginBottom: "1rem" }}>{message}</p>}
      {view === "cards" ? (
        <section aria-label="Swipe discovery" style={{ maxWidth: 620, width: "100%", margin: "0 auto" }}>
          <div className="muted" style={{ marginBottom: ".7rem", textAlign: "center" }}>{profiles.length} available</div>
          {renderCard(current, true)}
        </section>
      ) : (
        <div className="discover-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 360px))", justifyContent: "center", gap: "1rem", width: "100%" }}>
          {profiles.map((profile) => renderCard(profile))}
        </div>
      )}
    </>
  );
}
