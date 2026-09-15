import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { AppNav, AppTopbar } from "@/components/navigation";

export default async function AccountPage() {
  await requireRole("user");

  return (
    <main className="auth-page">
      <AppTopbar mode="user" />
      <section className="auth-card" aria-labelledby="account-title">
        <p className="eyebrow">Account & settings</p>
        <h1 id="account-title">Manage your account</h1>
        <p className="muted">
          Update your account preferences and manage your Ishqiya account data.
        </p>

        <div className="card" style={{ marginTop: 24 }}>
          <h2 style={{ marginTop: 0 }}>Account deletion</h2>
          <p className="muted">
            You can permanently delete your Ishqiya account and associated personal data.
            Some information may be retained where required for legal, security, fraud-prevention,
            or dispute-resolution purposes, as described in the Privacy Policy.
          </p>
          <Link className="button" href="/account/delete">
            Delete my account
          </Link>
        </div>
      </section>
      <AppNav mode="user" current="account" />
    </main>
  );
}
