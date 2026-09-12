"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AdminSignIn() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/admin/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Admin access denied.");
        return;
      }
      router.replace("/admin");
      router.refresh();
    } catch {
      setError("Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="admin-login-page">
      <div className="admin-login-glow" aria-hidden="true" />
      <section className="admin-login-card" aria-labelledby="admin-login-title">
        <div className="admin-login-brand">
          <span className="admin-brand-mark">I</span>
          <div>
            <p className="eyebrow">ISHQIYA</p>
            <span>Secure Operations</span>
          </div>
        </div>
        <div className="admin-login-heading">
          <p className="admin-kicker">PRIVATE ADMIN CONSOLE</p>
          <h1 id="admin-login-title">Welcome back</h1>
          <p>Sign in to manage users, hosts, payments, moderation and platform settings.</p>
        </div>
        <form onSubmit={submit} className="admin-login-form" autoComplete="off">
          <div className="admin-field">
            <label htmlFor="admin-email">Admin email</label>
            <input id="admin-email" name="admin-console-email" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter admin email" autoComplete="off" required />
          </div>
          <div className="admin-field">
            <label htmlFor="admin-password">Password</label>
            <input id="admin-password" name="admin-console-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" autoComplete="new-password" required />
          </div>
          {error && <p className="admin-login-error" role="alert">{error}</p>}
          <button className="admin-login-submit" type="submit" disabled={loading}>{loading ? "Verifying access…" : "Sign in to Admin"}</button>
          <Link className="admin-forgot-link" href="/auth/admin/forgot-password">Forgot password? <span>Reset it securely →</span></Link>
        </form>
        <div className="admin-login-footer"><span>🔒 Protected administration</span><span>ISHQIYA</span></div>
      </section>
    </main>
  );
}
