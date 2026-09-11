import { AdminShell } from "@/components/app-shell";
import { EmptyState } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminQueue } from "@/components/admin-queue";
import { AdminSettings } from "@/components/admin-settings";

const navTabs = [
  ["overview", "Overview"],
  ["people", "People"],
  ["payments", "Payments"],
  ["safety", "Safety & Reports"],
  ["content", "Content"],
  ["system", "System"],
] as const;

export default async function AdminPage() {
  await requireAdmin();
  const admin = createAdminClient();
  const [users, hosts, reports, payments, violations, googlePlay, upiApproved, upiRejected, walletCoins] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "user"),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "host"),
    admin.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    admin.from("payment_verifications").select("id", { count: "exact", head: true }).eq("status", "awaiting_review"),
    admin.from("violations").select("id", { count: "exact", head: true }).eq("status", "flagged"),
    admin.from("google_play_purchases").select("id", { count: "exact", head: true }).eq("purchase_state", "purchased"),
    admin.from("payment_verifications").select("id", { count: "exact", head: true }).eq("status", "approved"),
    admin.from("payment_verifications").select("id", { count: "exact", head: true }).eq("status", "rejected"),
    admin.from("wallets").select("balance"),
  ]);
  const totalWalletCoins = (walletCoins.data || []).reduce((sum, row) => sum + (Number(row.balance) || 0), 0);

  return (
    <AdminShell>
      <style>{`
        .admin-console { display:grid; gap:1.5rem; }
        .admin-hero { display:flex; align-items:flex-end; justify-content:space-between; gap:1rem; padding:1rem 0 .5rem; }
        .admin-hero h1 { font-size:clamp(2rem,5vw,3.5rem); margin:.35rem 0 .45rem; line-height:1; }
        .admin-status { display:inline-flex; align-items:center; gap:.5rem; border:1px solid var(--line); border-radius:999px; padding:.55rem .8rem; color:var(--muted); font-size:.78rem; white-space:nowrap; }
        .admin-status i { width:.5rem; height:.5rem; border-radius:50%; background:#61c48a; display:block; }
        .admin-tabs { position:sticky; top:0; z-index:5; display:flex; gap:.35rem; overflow-x:auto; padding:.65rem; background:rgba(9,7,10,.94); backdrop-filter:blur(14px); border:1px solid var(--line); border-radius:16px; }
        .admin-tabs a { padding:.65rem .9rem; border-radius:10px; color:var(--muted); font-size:.8rem; font-weight:800; white-space:nowrap; }
        .admin-tabs a:hover, .admin-tabs a:focus-visible { background:var(--blush); color:var(--cream); }
        .admin-section { scroll-margin-top:6rem; background:rgba(255,255,255,.025); border:1px solid var(--line); border-radius:22px; padding:1.25rem; }
        .admin-section-head { display:flex; justify-content:space-between; align-items:flex-start; gap:1rem; margin-bottom:1rem; }
        .admin-section-head h2 { margin:0; font-size:1.25rem; }
        .admin-section-head p { margin:.35rem 0 0; color:var(--muted); font-size:.85rem; }
        .admin-stat-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:.75rem; }
        .admin-stat-card { background:var(--surface); border:1px solid var(--line); border-radius:16px; padding:1rem; }
        .admin-stat-card strong { display:block; font-size:1.65rem; margin-top:.3rem; }
        .admin-stat-card small { color:var(--muted); }
        .admin-module-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:.75rem; }
        .admin-module { background:var(--surface); border:1px solid var(--line); border-radius:16px; padding:1rem; }
        .admin-module h3 { margin:.5rem 0 .25rem; font-size:.98rem; }
        .admin-module p { margin:0; color:var(--muted); font-size:.78rem; line-height:1.5; }
        .admin-action { display:inline-flex; align-items:center; justify-content:center; border:1px solid var(--rose-700); background:var(--rose-700); color:white; border-radius:10px; padding:.65rem .9rem; font-weight:800; font-size:.78rem; }
        @media(min-width:800px){ .admin-stat-grid{grid-template-columns:repeat(3,minmax(0,1fr));} .admin-module-grid{grid-template-columns:repeat(3,minmax(0,1fr));} .admin-section{padding:1.5rem;} }
      `}</style>

      <div className="admin-console" id="overview">
        <div className="admin-hero">
          <div>
            <span className="eyebrow">Private operations</span>
            <h1 className="serif">Ishqiya Admin</h1>
            <p className="muted">One control center for people, payments, safety, content and platform operations.</p>
          </div>
          <span className="admin-status"><i /> Production console</span>
        </div>

        <nav className="admin-tabs" aria-label="Admin sections">
          {navTabs.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}
        </nav>

        <section className="admin-section" aria-labelledby="overview-title">
          <div className="admin-section-head"><div><h2 id="overview-title">Live overview</h2><p>Current server-side counts and wallet totals.</p></div></div>
          <div className="admin-stat-grid">
            <div className="admin-stat-card"><span className="eyebrow">Users</span><strong>{users.count || 0}</strong><small>Registered users</small></div>
            <div className="admin-stat-card"><span className="eyebrow">Hosts</span><strong>{hosts.count || 0}</strong><small>Host accounts</small></div>
            <div className="admin-stat-card"><span className="eyebrow">UPI pending</span><strong>{payments.count || 0}</strong><small>Awaiting review</small></div>
            <div className="admin-stat-card"><span className="eyebrow">UPI approved</span><strong>{upiApproved.count || 0}</strong><small>Approved payments</small></div>
            <div className="admin-stat-card"><span className="eyebrow">UPI rejected</span><strong>{upiRejected.count || 0}</strong><small>Rejected payments</small></div>
            <div className="admin-stat-card"><span className="eyebrow">Google Play</span><strong>{googlePlay.count || 0}</strong><small>Purchased records</small></div>
            <div className="admin-stat-card"><span className="eyebrow">Wallet coins</span><strong>{totalWalletCoins.toLocaleString("en-IN")}</strong><small>Total current balances</small></div>
            <div className="admin-stat-card"><span className="eyebrow">Open reports</span><strong>{reports.count || 0}</strong><small>Reports needing review</small></div>
            <div className="admin-stat-card"><span className="eyebrow">Flags</span><strong>{violations.count || 0}</strong><small>Moderation flags</small></div>
          </div>
        </section>

        <section className="admin-section" id="people"><div className="admin-section-head"><div><h2>People</h2><p>User and Host operations are protected by server-side authorization.</p></div></div><div className="admin-module-grid"><div className="admin-module"><span className="eyebrow">Users</span><h3>User accounts</h3><p>Search and inspect registered user records.</p></div><div className="admin-module"><span className="eyebrow">Hosts</span><h3>Host management</h3><p>Verification and Host operational review.</p></div><div className="admin-module"><span className="eyebrow">Profiles</span><h3>Profile operations</h3><p>Profile and discovery management.</p></div></div></section>

        <section className="admin-section" id="payments"><div className="admin-section-head"><div><h2>Payments & earnings</h2><p>Review payment proofs and monitor the production purchase pipeline.</p></div></div><AdminQueue /></section>

        <section className="admin-section" id="safety"><div className="admin-section-head"><div><h2>Safety & reports</h2><p>Moderation flags, reports, violations and enforcement operations.</p></div><span className="admin-action">{(reports.count || 0) + (violations.count || 0)} items</span></div><div className="admin-module-grid"><div className="admin-module"><span className="eyebrow">Reports</span><h3>Open reports</h3><p>Review reports and apply the appropriate moderation action.</p></div><div className="admin-module"><span className="eyebrow">Moderation</span><h3>Violation queue</h3><p>Confirm or dismiss server-recorded moderation flags.</p></div><div className="admin-module"><span className="eyebrow">Blocks</span><h3>Safety controls</h3><p>Maintain blocking and account-safety workflows.</p></div></div></section>

        <section className="admin-section" id="content"><div className="admin-section-head"><div><h2>Content control</h2><p>Manage public-facing platform content without rebuilding the application.</p></div></div><AdminSettings /></section>

        <section className="admin-section" id="system"><div className="admin-section-head"><div><h2>System</h2><p>Operational areas reserved for verified production controls.</p></div></div><div className="admin-module-grid"><div className="admin-module"><span className="eyebrow">Audit</span><h3>Audit logs</h3><p>Financial and administrative activity must remain traceable.</p></div><div className="admin-module"><span className="eyebrow">Video</span><h3>LiveKit operations</h3><p>Production video and billing reconciliation controls.</p></div><div className="admin-module"><span className="eyebrow">Configuration</span><h3>System settings</h3><p>Controlled configuration with server-side validation.</p></div></div></section>

        <EmptyState title="Financial decisions remain server-controlled" message="UPI payments require proof and Admin review. Google Play purchases require server verification. Wallet changes originate from the authoritative ledger." />
      </div>
    </AdminShell>
  );
}
