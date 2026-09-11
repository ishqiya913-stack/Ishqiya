import { AdminShell } from "@/components/app-shell";
import { EmptyState } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminQueue } from "@/components/admin-queue";

export default async function AdminPage() {
  await requireAdmin();

  const admin = createAdminClient();

  const [
    users,
    hosts,
    reports,
    payments,
    violations,
    googlePlay,
    upiApproved,
    upiRejected,
    walletCoins,
  ] = await Promise.all([
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

  const totalWalletCoins =
    (walletCoins.data || []).reduce(
      (sum, row) => sum + (Number(row.balance) || 0),
      0
    );

  const modules = [
    "Overview",
    "Users",
    "Hosts",
    "Profiles",
    "Admin-Created Profiles",
    "Discover Management",
    "Matches",
    "Conversations",
    "Video Calls",
    "Reports",
    "Moderation",
    "Violations",
    "Wallet",
    "Payments",
    "Google Play",
    "UPI Payments",
    "Coin Packages",
    "Host Earnings",
    "Withdrawals",
    "Blocks",
    "Notifications",
    "Audit Logs",
    "System Settings",
  ];

  return (
    <AdminShell>
      <span className="eyebrow">Private operations</span>
      <h1 className="serif">Admin overview</h1>
      <p className="muted">
        Server-authorized operations, payment review, wallet controls and audit visibility.
      </p>

      <div className="stats-grid">
        <div className="stat"><span className="eyebrow">Users</span><strong>{users.count || 0}</strong></div>
        <div className="stat"><span className="eyebrow">Hosts</span><strong>{hosts.count || 0}</strong></div>
        <div className="stat"><span className="eyebrow">UPI pending</span><strong>{payments.count || 0}</strong></div>
        <div className="stat"><span className="eyebrow">UPI approved</span><strong>{upiApproved.count || 0}</strong></div>
        <div className="stat"><span className="eyebrow">UPI rejected</span><strong>{upiRejected.count || 0}</strong></div>
        <div className="stat"><span className="eyebrow">Google Play purchases</span><strong>{googlePlay.count || 0}</strong></div>
        <div className="stat"><span className="eyebrow">Wallet coins</span><strong>{totalWalletCoins.toLocaleString("en-IN")}</strong></div>
        <div className="stat"><span className="eyebrow">Open reports</span><strong>{reports.count || 0}</strong></div>
        <div className="stat"><span className="eyebrow">Moderation flags</span><strong>{violations.count || 0}</strong></div>
      </div>

      <section style={{ marginTop: "2rem" }}>
        <h2>Payment operations</h2>
        <AdminQueue />
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h2>Operations modules</h2>
        <div className="choice-grid">
          {modules.map((module) => (
            <div className="choice-card" key={module}>
              <span className="eyebrow">Admin</span>
              <h3>{module}</h3>
              <p className="muted">Protected operational module.</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginTop: "2rem" }}>
        <EmptyState
          title="Financial decisions remain server-controlled"
          message="UPI payments require proof and Admin review. Google Play purchases require server verification. Wallet changes must originate from the authoritative ledger."
        />
      </section>
    </AdminShell>
  );
}
