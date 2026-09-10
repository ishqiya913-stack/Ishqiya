"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, EmptyState, Loading } from "@/components/ui";
import { DEMO_HOSTS } from "@/lib/demo-hosts";

type Profile = { host_id: string; display_name: string; headline: string | null; bio: string | null; city: string | null; age: number | null; avatar_path: string | null; is_demo?: boolean };

function withDemoHosts(realProfiles: Profile[]) {
  const realIds = new Set(realProfiles.map((profile) => profile.host_id));
  const demos = DEMO_HOSTS.filter((profile) => !realIds.has(profile.host_id));
  return [...realProfiles, ...demos];
}

export function DiscoverBrowser() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [view, setView] = useState<"cards" | "grid">("cards");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [blockingId, setBlockingId] = useState<string | null>(null);

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
      setMessage("Preview mode: showing fictional demo profiles.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function blockHost(targetId: string) {
    if (targetId.startsWith("demo-host-")) { setProfiles((current) => current.filter((profile) => profile.host_id !== targetId)); return; }
    if (!window.confirm("Block this Host? They will no longer appear to you.")) return;
    setBlockingId(targetId);
    const response = await fetch("/api/blocks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ blockedId: targetId }) });
    const result = await response.json() as { error?: string };
    setBlockingId(null);
    if (!response.ok) { setMessage(result.error || "Host could not be blocked."); return; }
    setProfiles((current) => current.filter((p) => p.host_id !== targetId));
    setMessage("Host blocked.");
  }

  async function submitReport(targetId: string) {
    if (targetId.startsWith("demo-host-")) { setReportingId(null); setReportReason(""); setMessage("Demo profile report recorded for preview only."); return; }
    if (!reportReason) { setMessage("Please select a report reason."); return; }
    setReportLoading(true);
    const response = await fetch("/api/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reportedId: targetId, reason: reportReason, context: { source: "discover" } }) });
    const result = await response.json() as { error?: string };
    setReportLoading(false);
    if (!response.ok) { setMessage(result.error || "Report could not be submitted."); return; }
    setReportingId(null); setReportReason(""); setMessage("Report submitted. Thank you for helping keep Ishqiya safe.");
  }

  async function act(targetId: string, action: "like" | "pass") {
    if (targetId.startsWith("demo-host-")) {
      setProfiles((current) => current.filter((profile) => profile.host_id !== targetId));
      setMessage(action === "like" ? "Demo Like saved for preview." : "Passed. Showing the next profile.");
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
    <div className="photo-placeholder" role="img" aria-label={`${profile.display_name} profile photo`}>{profile.avatar_path ? <img src={profile.avatar_path} alt="" /> : "Host photo"}</div>
    <div className="discover-info"><h2>{profile.display_name}{profile.age ? `, ${profile.age}` : ""}</h2><p>{profile.city || "Ishqiya"}<br />{profile.headline || profile.bio || "A considered conversation awaits."}</p>
      {profile.is_demo && <span className="eyebrow">Demo profile • fictional adult</span>}
      <div className="discover-actions"><Button type="button" variant="danger" onClick={() => void act(profile.host_id, "pass")}>✕ Pass</Button><Button type="button" onClick={() => void act(profile.host_id, "like")}>♥ Like</Button></div>
      {!profile.is_demo && <Link href={`/user/match?host=${profile.host_id}`}>View connection</Link>}
      <div className="form-footer"><Button type="button" variant="quiet" onClick={() => setReportingId(profile.host_id)}>Report</Button><Button type="button" variant="quiet" disabled={blockingId === profile.host_id} onClick={() => void blockHost(profile.host_id)}>{blockingId === profile.host_id ? "Blocking..." : "Block"}</Button></div>
      {reportingId === profile.host_id && <div className="card" role="dialog" aria-label="Report Host"><h3>Report this Host</h3><select value={reportReason} onChange={(e) => setReportReason(e.target.value)}><option value="">Select a reason</option><option>Fake or misleading profile</option><option>Inappropriate behaviour</option><option>Harassment or abuse</option><option>Requesting personal contact information</option><option>Fraud or scam</option><option>Other</option></select><div className="form-footer"><Button type="button" variant="quiet" onClick={() => { setReportingId(null); setReportReason(""); }}>Cancel</Button><Button type="button" disabled={reportLoading} onClick={() => void submitReport(profile.host_id)}>{reportLoading ? "Submitting..." : "Submit report"}</Button></div></div>}
    </div>
  </article>;

  return <>
    <div className="form-footer"><Button type="button" variant={view === "cards" ? "primary" : "quiet"} onClick={() => setView("cards")}>Swipe</Button><Button type="button" variant={view === "grid" ? "primary" : "quiet"} onClick={() => setView("grid")}>All 10</Button></div>
    {message && <p role="alert" className="muted">{message}</p>}
    {view === "cards" ? <section aria-label="Swipe discovery"><p className="muted">{profiles.length} profiles remaining</p>{renderCard(current)}</section> : <div className="discover-grid">{profiles.map(renderCard)}</div>}
  </>;
}
