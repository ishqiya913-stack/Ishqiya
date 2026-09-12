import { AdminShell } from "@/components/app-shell";
import { EmptyState } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminQueue } from "@/components/admin-queue";
import { AdminSettings } from "@/components/admin-settings";

const navTabs = [["overview", "Overview"], ["people", "People"], ["payments", "Payments"], ["safety", "Safety & Reports"], ["content", "Content"], ["system", "System"]] as const;

export default async function AdminPage() {
  await requireAdmin();
  const admin = createAdminClient();
  const [users, hosts, reports, payments, violations, googlePlay, upiApproved, upiRejected, walletCoins, earnings, videos, auditLogs] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "user"),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "host"),
    admin.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    admin.from("payment_verifications").select("id", { count: "exact", head: true }).eq("status", "awaiting_review"),
    admin.from("violations").select("id", { count: "exact", head: true }).eq("status", "flagged"),
    admin.from("google_play_purchases").select("id", { count: "exact", head: true }).eq("purchase_state", "purchased"),
    admin.from("payment_verifications").select("id", { count: "exact", head: true }).eq("status", "approved"),
    admin.from("payment_verifications").select("id", { count: "exact", head: true }).eq("status", "rejected"),
    admin.from("wallets").select("balance"),
    admin.from("host_earnings").select("id", { count: "exact", head: true }),
    admin.from("video_sessions").select("id", { count: "exact", head: true }),
    admin.from("audit_logs").select("id", { count: "exact", head: true }),
  ]);
  const totalWalletCoins = (walletCoins.data || []).reduce((sum, row) => sum + (Number(row.balance) || 0), 0);

  return <AdminShell>
    <style>{`
      .admin-console{display:grid;gap:1.5rem}.admin-hero{display:flex;align-items:flex-end;justify-content:space-between;gap:1rem;padding:1rem 0 .5rem}.admin-hero h1{font-size:clamp(2rem,5vw,3.5rem);margin:.35rem 0 .45rem;line-height:1}.admin-status{display:inline-flex;align-items:center;gap:.5rem;border:1px solid var(--line);border-radius:999px;padding:.55rem .8rem;color:var(--muted);font-size:.78rem}.admin-status i{width:.5rem;height:.5rem;border-radius:50%;background:#61c48a;display:block}.admin-tabs{position:sticky;top:0;z-index:5;display:flex;gap:.35rem;overflow-x:auto;padding:.65rem;background:rgba(9,7,10,.94);backdrop-filter:blur(14px);border:1px solid var(--line);border-radius:16px}.admin-tabs a{padding:.65rem .9rem;border-radius:10px;color:var(--muted);font-size:.8rem;font-weight:800;white-space:nowrap}.admin-tabs a:hover,.admin-tabs a:focus-visible{background:var(--blush);color:var(--cream)}.admin-section{scroll-margin-top:6rem;background:rgba(255,255,255,.025);border:1px solid var(--line);border-radius:22px;padding:1.25rem}.admin-section-head{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;margin-bottom:1rem}.admin-section-head h2{margin:0;font-size:1.25rem}.admin-section-head p{margin:.35rem 0 0;color:var(--muted);font-size:.85rem}.admin-stat-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.75rem}.admin-stat-card{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:1rem}.admin-stat-card strong{display:block;font-size:1.65rem;margin-top:.3rem}.admin-stat-card small{color:var(--muted)}@media(min-width:800px){.admin-stat-grid{grid-template-columns:repeat(4,minmax(0,1fr))}.admin-section{padding:1.5rem}}
    `}</style>
    <div className="admin-console" id="overview">
      <div className="admin-hero"><div><span className="eyebrow">Private operations</span><h1 className="serif">Ishqiya Admin</h1><p className="muted">Production control center for people, payments, safety, content and system operations.</p></div><span className="admin-status"><i /> Production console</span></div>
      <nav className="admin-tabs" aria-label="Admin sections">{navTabs.map(([id,label])=><a key={id} href={`#${id}`}>{label}</a>)}</nav>

      <section className="admin-section" aria-labelledby="overview-title"><div className="admin-section-head"><div><h2 id="overview-title">Live overview</h2><p>Server-side operational counts from the production database.</p></div></div><div className="admin-stat-grid">
        <div className="admin-stat-card"><span className="eyebrow">Users</span><strong>{users.count||0}</strong><small>Registered</small></div>
        <div className="admin-stat-card"><span className="eyebrow">Hosts</span><strong>{hosts.count||0}</strong><small>Host accounts</small></div>
        <div className="admin-stat-card"><span className="eyebrow">UPI pending</span><strong>{payments.count||0}</strong><small>Needs review</small></div>
        <div className="admin-stat-card"><span className="eyebrow">UPI approved</span><strong>{upiApproved.count||0}</strong><small>Approved</small></div>
        <div className="admin-stat-card"><span className="eyebrow">UPI rejected</span><strong>{upiRejected.count||0}</strong><small>Rejected</small></div>
        <div className="admin-stat-card"><span className="eyebrow">Google Play</span><strong>{googlePlay.count||0}</strong><small>Purchased records</small></div>
        <div className="admin-stat-card"><span className="eyebrow">Wallet coins</span><strong>{totalWalletCoins.toLocaleString("en-IN")}</strong><small>Current balances</small></div>
        <div className="admin-stat-card"><span className="eyebrow">Open reports</span><strong>{reports.count||0}</strong><small>Needs review</small></div>
        <div className="admin-stat-card"><span className="eyebrow">Flags</span><strong>{violations.count||0}</strong><small>Moderation</small></div>
        <div className="admin-stat-card"><span className="eyebrow">Host earnings</span><strong>{earnings.count||0}</strong><small>Ledger rows</small></div>
        <div className="admin-stat-card"><span className="eyebrow">Video sessions</span><strong>{videos.count||0}</strong><small>Sessions</small></div>
        <div className="admin-stat-card"><span className="eyebrow">Audit events</span><strong>{auditLogs.count||0}</strong><small>Traceable actions</small></div>
      </div></section>

      <section className="admin-section" id="people"><div className="admin-section-head"><div><h2>People & Hosts</h2><p>Search accounts and apply controlled activation, suspension or blocking actions.</p></div></div><AdminQueue initialKind="users" /></section>
      <section className="admin-section" id="payments"><div className="admin-section-head"><div><h2>Payments & earnings</h2><p>Review UPI proofs, inspect Google Play verification records and read the Host earnings ledger.</p></div></div><AdminQueue initialKind="payments" /></section>
      <section className="admin-section" id="safety"><div className="admin-section-head"><div><h2>Safety & reports</h2><p>Resolve reports, confirm or dismiss violations, and review Host verification photos.</p></div></div><AdminQueue initialKind="reports" /></section>
      <section className="admin-section" id="content"><div className="admin-section-head"><div><h2>Content & settings</h2><p>Database-backed public content and operational settings with audit logging.</p></div></div><AdminSettings /></section>
      <section className="admin-section" id="system"><div className="admin-section-head"><div><h2>System operations</h2><p>Read-only operational visibility for video billing, Host earnings and every administrative action.</p></div></div><div style={{display:"grid",gap:"1rem"}}><AdminQueue initialKind="video" /><AdminQueue initialKind="earnings" /><AdminQueue initialKind="audit" /></div></section>
      <EmptyState title="Server-controlled administration" message="Financial credits, payment approvals, moderation decisions and account enforcement are performed through authenticated server routes and recorded in the audit trail." />
    </div>
  </AdminShell>;
}
