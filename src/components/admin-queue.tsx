"use client";

import { useEffect, useState } from "react";
import { Button, Loading } from "@/components/ui";

type Kind = "payments" | "reports" | "violations" | "host-verification" | "users" | "hosts";
type Item = Record<string, unknown>;

type QueueResponse = { items?: Item[]; total?: number; error?: string };
type HostActionResponse = { profile?: Item; error?: string };

const labels: Record<Kind, string> = {
  payments: "Payments",
  reports: "Reports",
  violations: "Violations",
  "host-verification": "Host verification",
  users: "Users",
  hosts: "Hosts",
};

const text = (value: unknown, fallback = "—") => value === null || value === undefined || value === "" ? fallback : String(value);
const date = (value: unknown) => {
  if (!value) return "—";
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleString("en-IN");
};

function Badge({ value }: { value: unknown }) {
  return <span className="admin-queue-badge">{text(value)}</span>;
}

export function AdminQueue() {
  const [kind, setKind] = useState<Kind>("payments");
  const [items, setItems] = useState<Item[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [working, setWorking] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/admin/queue?kind=${kind}&page=${page}&search=${encodeURIComponent(search)}`, { cache: "no-store" });
        const result = await response.json() as QueueResponse;
        if (!response.ok) throw new Error(result.error || "Queue could not be loaded.");
        if (!active) return;
        setItems(result.items || []);
        setTotal(result.total || 0);
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : "Queue could not be loaded.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [kind, page, search]);

  async function decide(item: Item, decision: string, endpoint: string) {
    const id = String(item.id);
    if (!window.confirm(`Confirm ${decision}?`)) return;
    setWorking(id);
    setError("");
    try {
      const response = await fetch(`${endpoint}/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const result = await response.json() as QueueResponse;
      if (!response.ok) throw new Error(result.error || "Action could not be completed.");
      setItems((current) => current.filter((entry) => String(entry.id) !== id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Action could not be completed.");
    } finally {
      setWorking(null);
    }
  }

  async function profile(item: Item, status: "active" | "suspended" | "blocked") {
    const id = String(item.id);
    if (!window.confirm(`Set this account to ${status}?`)) return;
    const reason = window.prompt("Optional admin reason:") || "";
    setWorking(id);
    setError("");
    try {
      const response = await fetch("/api/admin/profiles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: id, accountStatus: status, moderationNote: reason }),
      });
      const result = await response.json() as HostActionResponse;
      if (!response.ok) throw new Error(result.error || "Profile could not be updated.");
      setItems((current) => current.map((entry) => String(entry.id) === id ? { ...entry, ...(result.profile || {}), account_status: status } : entry));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Profile could not be updated.");
    } finally {
      setWorking(null);
    }
  }

  async function hostControl(item: Item, field: "isActive" | "isDiscoverable", value: boolean) {
    const id = String(item.id);
    if (working === id) return;
    setWorking(id);
    setError("");
    try {
      const response = await fetch("/api/admin/profiles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: id, [field]: value }),
      });
      const result = await response.json() as HostActionResponse;
      if (!response.ok) throw new Error(result.error || "Host control could not be updated.");
      const key = field === "isActive" ? "is_active" : "is_discoverable";
      const returnedValue = result.profile?.[key];
      if (typeof returnedValue !== "boolean") throw new Error("Host control response was invalid. No local state was changed.");
      setItems((current) => current.map((entry) => String(entry.id) === id ? { ...entry, [key]: returnedValue } : entry));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Host control could not be updated.");
    } finally {
      setWorking(null);
    }
  }

  function actions(item: Item) {
    const id = String(item.id);
    const disabled = working === id;
    if (kind === "payments") return <><Button type="button" disabled={disabled} onClick={() => void decide(item, "approve", "/api/admin/payments")}>Approve</Button><Button type="button" variant="danger" disabled={disabled} onClick={() => void decide(item, "reject", "/api/admin/payments")}>Reject</Button></>;
    if (kind === "violations") return <><Button type="button" disabled={disabled} onClick={() => void decide(item, "confirm", "/api/admin/violations")}>Confirm</Button><Button type="button" variant="quiet" disabled={disabled} onClick={() => void decide(item, "dismiss", "/api/admin/violations")}>Dismiss</Button></>;
    if (kind === "host-verification") return <><Button type="button" disabled={disabled} onClick={() => void decide(item, "approve", "/api/admin/host-verification")}>Approve</Button><Button type="button" variant="danger" disabled={disabled} onClick={() => void decide(item, "reject", "/api/admin/host-verification")}>Reject</Button></>;
    if (kind === "users") return <><Button type="button" disabled={disabled} onClick={() => void profile(item, "active")}>Activate</Button><Button type="button" variant="quiet" disabled={disabled} onClick={() => void profile(item, "suspended")}>Suspend</Button><Button type="button" variant="danger" disabled={disabled} onClick={() => void profile(item, "blocked")}>Block</Button></>;
    return null;
  }

  function hostActions(item: Item) {
    const id = String(item.id);
    const disabled = working === id;
    const hasHostProfile = Boolean(item.host_profile_exists);
    const active = Boolean(item.is_active);
    const discoverable = Boolean(item.is_discoverable);
    const blocked = item.account_status === "blocked";
    return <div className="admin-host-controls">
      <div className="admin-host-action-row">
        <Button type="button" variant="danger" disabled={disabled || !hasHostProfile || !active} onClick={() => void hostControl(item, "isActive", false)}>Deactivate Host</Button>
        <Button type="button" variant="danger" disabled={disabled || !hasHostProfile || !discoverable} onClick={() => void hostControl(item, "isDiscoverable", false)}>Disable Discover</Button>
        <Button type="button" variant="danger" disabled={disabled || blocked} onClick={() => void profile(item, blocked ? "active" : "blocked")}>{blocked ? "Unblock Host" : "Block Host"}</Button>
      </div>
      <div className="admin-host-action-row admin-host-action-row-secondary">
        <Button type="button" variant="quiet" disabled={disabled || !hasHostProfile || active} onClick={() => void hostControl(item, "isActive", true)}>Activate Host</Button>
        <Button type="button" variant="quiet" disabled={disabled || !hasHostProfile || discoverable} onClick={() => void hostControl(item, "isDiscoverable", true)}>Enable Host in Discover</Button>
      </div>
      {!hasHostProfile && <p className="admin-host-warning" role="alert">Host profile is missing. No Host control can be changed.</p>}
    </div>;
  }

  function itemView(item: Item, index: number) {
    const title = kind === "users" || kind === "hosts" ? text(item.display_name, text(item.email, "Account")) : labels[kind];
    return <article className="choice-card admin-record-card" key={String(item.id || index)}>
      <div className="admin-record-head">
        <div><strong className="admin-record-title">{title}</strong><div className="muted admin-record-meta">{text(item.email)} <span>•</span> {date(item.created_at)}</div></div>
        <Badge value={item.status ?? item.account_status} />
      </div>
      {kind === "hosts" ? <>
        <div className="admin-host-summary"><span>Role <strong>Host</strong></span><span>Account <strong>{text(item.account_status)}</strong></span><span>Approval <strong>{text(item.approval_status)}</strong></span></div>
        <div className="admin-host-box">
          <div className="admin-host-head"><div><strong>Host controls</strong><div className="muted">Manage Host activity and Discover visibility.</div></div><Badge value={item.approval_status} /></div>
          {hostActions(item)}
          <div className="admin-status-grid">
            <div className="admin-status-card"><span>Account</span><strong>{text(item.account_status)}</strong></div>
            <div className="admin-status-card"><span>Host Active</span><strong>{item.is_active ? "Yes" : "No"}</strong></div>
            <div className="admin-status-card"><span>Discover</span><strong>{item.is_discoverable ? "Enabled" : "Disabled"}</strong></div>
            <div className="admin-status-card"><span>Approval</span><strong>{text(item.approval_status)}</strong></div>
          </div>
        </div>
      </> : <>
        {kind === "users" && <div className="muted">Role: {text(item.role)} · Account: {text(item.account_status)}</div>}
        {kind === "payments" && <div><strong>₹{(Number(item.expected_amount_paise || 0) / 100).toFixed(2)}</strong> · UTR {text(item.utr)} · Txn {text(item.transaction_id)}<div className="muted">Order {text(item.order_id)} · Fraud flags: {Array.isArray(item.fraud_flags) ? item.fraud_flags.length : 0}</div></div>}
        {kind === "reports" && <div><strong>{text(item.reason)}</strong><div className="muted">Reporter {text(item.reporter_id)} → Reported {text(item.reported_id)}</div></div>}
        {kind === "violations" && <div><strong>{text(item.violation_type)}</strong><div className="muted">{text(item.reason)} · Confidence {item.confidence == null ? "—" : `${Math.round(Number(item.confidence) * 100)}%`}</div></div>}
        {kind === "host-verification" && <div>Host {text(item.host_id)} · Photo {text(item.photo_number)}</div>}
        <div className="form-footer">{actions(item)}</div>
      </>}
    </article>;
  }

  return <section className="choice-card admin-queue-shell">
    <div className="admin-queue-toolbar"><label htmlFor="admin-queue">Operations</label><select id="admin-queue" value={kind} onChange={(event) => { setKind(event.target.value as Kind); setPage(1); setSearch(""); }}>{(Object.keys(labels) as Kind[]).map((entry) => <option key={entry} value={entry}>{labels[entry]}</option>)}</select>{(kind === "users" || kind === "hosts") && <input aria-label="Search queue" placeholder="Search email or name" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />}</div>
    {loading ? <Loading label="Loading admin operations" /> : error ? <p role="alert" className="muted">{error}</p> : items.length ? <div className="admin-record-list">{items.map(itemView)}</div> : <p className="muted">No records in this queue.</p>}
    <div className="form-footer"><Button type="button" variant="quiet" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)}>Previous</Button><span className="muted">Page {page} · {total} records</span><Button type="button" variant="quiet" disabled={page * 25 >= total || loading} onClick={() => setPage((current) => current + 1)}>Next</Button></div>
    <style>{`
      .admin-queue-shell{display:grid;gap:1rem}
      .admin-queue-toolbar{display:grid;grid-template-columns:auto minmax(150px,220px) minmax(220px,1fr);gap:.65rem;align-items:center}
      .admin-queue-toolbar label{font-size:.82rem;font-weight:800;color:var(--muted)}
      .admin-queue-toolbar select,.admin-queue-toolbar input{width:100%;min-height:2.8rem;border:1px solid var(--line);border-radius:12px;background:var(--surface-raised);color:var(--cream);padding:.65rem .8rem}
      .admin-record-list{display:grid;gap:.75rem}
      .admin-record-card{display:grid;gap:1rem;padding:1.15rem;border-radius:20px}
      .admin-record-head{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem}
      .admin-record-title{font-size:1.05rem}
      .admin-record-meta{display:flex;flex-wrap:wrap;gap:.35rem;margin-top:.3rem;font-size:.76rem}
      .admin-queue-badge{display:inline-flex;align-items:center;border:1px solid var(--line);border-radius:999px;padding:.32rem .62rem;font-size:.7rem;font-weight:800;background:rgba(255,255,255,.025);white-space:nowrap}
      .admin-host-summary{display:flex;flex-wrap:wrap;gap:.55rem}
      .admin-host-summary span{display:inline-flex;gap:.35rem;align-items:center;padding:.45rem .65rem;border-radius:10px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.07);font-size:.75rem;color:var(--muted)}
      .admin-host-summary strong{color:var(--cream);font-size:.78rem}
      .admin-host-box{display:grid;gap:.85rem;padding:1rem;border:1px solid rgba(215,90,125,.2);border-radius:18px;background:rgba(167,47,92,.06)}
      .admin-host-head{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem}
      .admin-host-head .muted{font-size:.78rem;margin-top:.25rem;line-height:1.45}
      .admin-host-controls{display:grid;gap:.55rem}
      .admin-host-action-row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.55rem}
      .admin-host-action-row-secondary{grid-template-columns:repeat(2,minmax(0,1fr))}
      .admin-host-action-row .button{min-width:0;min-height:2.7rem;padding:.65rem .55rem;font-size:.74rem;line-height:1.15}
      .admin-host-warning{margin:0;padding:.7rem .8rem;border:1px solid var(--line);border-radius:10px;font-size:.78rem}
      .admin-status-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.55rem}
      .admin-status-card{display:grid;gap:.22rem;padding:.7rem;border:1px solid rgba(255,255,255,.07);border-radius:12px;background:rgba(0,0,0,.12)}
      .admin-status-card span{font-size:.68rem;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.05em}
      .admin-status-card strong{font-size:.8rem}
      @media (max-width:720px){.admin-queue-toolbar{grid-template-columns:1fr}.admin-host-action-row,.admin-host-action-row-secondary,.admin-status-grid{grid-template-columns:1fr}.admin-record-head{flex-direction:column}.admin-queue-badge{align-self:flex-start}}
    `}</style>
  </section>;
}
