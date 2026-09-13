import { AdminShell } from "@/components/app-shell";
import { EmptyState } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminQueue } from "@/components/admin-queue";
import { AdminSettings } from "@/components/admin-settings";
import { AdminTabs } from "@/components/admin-tabs";

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
      .admin-console{display:grid;gap:1.35rem}
      .admin-hero{display:flex;align-items:flex-end;justify-content:space-between;gap:1rem;padding:.5rem 0 .25rem}
      .admin-hero h1{font-size:clamp(2.1rem,5vw,3.7rem);margin:.35rem 0 .45rem;line-height:1}
      .admin-status{display:inline-flex;align-items:center;gap:.5rem;border:1px solid var(--line);border-radius:999px;padding:.55rem .8rem;color:var(--muted);font-size:.78rem;background:rgba(255,255,255,.03)}
      .admin-status i{width:.5rem;height:.5rem;border-radius:50%;background:#61c48a;display:block;box-shadow:0 0 0 .2rem rgba(97,196,138,.08)}
      .admin-tabs{position:sticky;top:0;z-index:5;display:flex;gap:.35rem;overflow-x:auto;padding:.55rem;background:rgba(9,7,10,.94);backdrop-filter:blur(14px);border:1px solid var(--line);border-radius:16px}
      .admin-tabs a{padding:.65rem .9rem;border-radius:11px;color:var(--muted);font-size:.8rem;font-weight:800;white-space:nowrap;transition:.2s ease;cursor:pointer}
      .admin-tabs a:hover,.admin-tabs a:focus-visible{background:var(--blush);color:var(--cream);transform:translateY(-1px)}
      .admin-section{scroll-margin-top:6rem;background:linear-gradient(180deg,rgba(255,255,255,.035),rgba(255,255,255,.018));border:1px solid var(--line);border-radius:22px;padding:1rem;box-shadow:0 12px 30px rgba(0,0,0,.12)}
      .admin-section-head{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;margin-bottom:1rem}
      .admin-section-head h2{margin:0;font-size:1.25rem}.admin-section-head p{margin:.35rem 0 0;color:var(--muted);font-size:.85rem}
      .admin-stat-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.7rem}
      .admin-stat-card{position:relative;overflow:hidden;background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:.9rem;min-height:92px}
      .admin-stat-card:after{content:"";position:absolute;right:-18px;top:-18px;width:72px;height:72px;border-radius:50%;background:rgba(217,78,135,.10)}
      .admin-stat-card strong{display:block;font-size:1.55rem;margin-top:.3rem;position:relative;z-index:1}.admin-stat-card small{color:var(--muted)}
      .payment-links{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:.7rem;margin-bottom:1rem}
      .payment-link{display:block;padding:.95rem;border-radius:16px;border:1px solid var(--line);background:var(--surface);text-decoration:none;transition:.2s ease}.payment-link:hover{transform:translateY(-2px);border-color:var(--blush)}
      .payment-link strong{display:block}.payment-link span{display:block;color:var(--muted);font-size:.8rem;margin-top:.25rem}
      .admin-payments-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem}
      .admin-payment-panel{display:grid;gap:.8rem;padding:1rem;border:1px solid var(--line);border-radius:20px;background:rgba(255,255,255,.02)}
      .admin-payment-panel h3{margin:0;font-size:1.05rem}.admin-payment-panel p{margin:0;color:var(--muted);font-size:.8rem}.admin-system-grid{display:grid;gap:1rem}
      @media(max-width:700px){.admin-payments-grid{grid-template-columns:1fr}.admin-hero{align-items:flex-start;flex-direction:column}.admin-status{align-self:flex-start}}
      @media(min-width:800px){.admin-stat-grid{grid-template-columns:repeat(4,minmax(0,1fr))}.admin-section{padding:1.35rem}}
    `}</style>
    <div className="admin-console" id="overview">
      <div className="admin-hero"><div><span className="eyebrow">Private operations</span><h1 className="serif">Ishqiya Admin</h1><p className="muted">Production control center for people, payments, safety, content and system operations.</p></div><span className="admin-status"><i /> Production console</span></div>
      <AdminTabs />
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
      <section className="admin-section" id="people"><div className="admin-section-head"><div><h2>People & Hosts</h2><p>Search accounts and control account status and Host discoverability.</p></div></div><div className="payment-links"><a className="payment-link" href="#people"><strong>Users</strong><span>Activate, suspend or block user accounts</span></a><a className="payment-link" href="#people"><strong>Hosts</strong><span>Account status and Discover controls</span></a><a className="payment-link" href="#safety"><strong>Host verification</strong><span>Review submitted verification photos</span></a></div><AdminQueue initialKind="users" /></section>
      <section className="admin-section" id="payments"><div className="admin-section-head"><div><h2>Payments Received</h2><p>UPI and Google Play are shown side-by-side as separate ledgers. Google Play uses existing purchase records only.</p></div></div><div className="admin-payments-grid"><div className="admin-payment-panel" id="upi-received"><h3>💳 UPI Received</h3><p>Payment proofs, ₹ amount, coins, UTR/transaction references, proof image and approval status.</p><AdminQueue initialKind="payments" /></div><div className="admin-payment-panel" id="google-play-received"><h3>🟢 Google Play Received</h3><p>Verified purchase records, package, coins, Google order ID, purchase state and consumption state.</p><AdminQueue initialKind="google-play" /></div></div></section>
      <section className="admin-section" id="safety"><div className="admin-section-head"><div><h2>Safety & reports</h2><p>Resolve reports, confirm or dismiss violations, and review Host verification photos.</p></div></div><AdminQueue initialKind="reports" /></section>
      <section className="admin-section" id="content"><div className="admin-section-head"><div><h2>Content & settings</h2><p>Database-backed public content and operational settings with audit logging.</p></div></div><AdminSettings /></section>
      <section className="admin-section" id="system"><div className="admin-section-head"><div><h2>System operations</h2><p>Operational visibility for video billing, Host earnings and administrative actions.</p></div></div><div className="admin-system-grid"><AdminQueue initialKind="video" /><AdminQueue initialKind="earnings" /><AdminQueue initialKind="audit" /></div></section>
      <EmptyState title="Server-controlled administration" message="Financial credits, payment approvals, moderation decisions and account enforcement are performed through authenticated server routes and recorded in the audit trail." />
    </div>
  </AdminShell>;
}
