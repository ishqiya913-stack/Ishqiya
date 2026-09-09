"use client";

import { FormEvent, useState } from "react";
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
        body: JSON.stringify({ email, password }),
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
    <main className="auth-page">
      <section className="auth-card">
        <p className="eyebrow">ISHQIYA</p>
        <h1>Admin Login</h1>
        <p className="muted">Authorized administration only.</p>

        <form onSubmit={submit} className="auth-form">
          <label>
            Admin Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="ishqiya913@gmail.com"
              autoComplete="username"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter admin password"
              autoComplete="current-password"
              required
            />
          </label>

          {error && <p role="alert" className="muted">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Verifying..." : "Sign in as Admin"}
          </button>
        </form>
      </section>
    </main>
  );
}
