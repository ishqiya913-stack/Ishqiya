"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BackControl } from "@/components/navigation";
import { Button } from "@/components/ui";

const ALLOWED_NEXT = new Set([
  "/auth/admin/reset-password",
  "/auth/host/reset-password",
  "/auth/user/reset-password",
]);

export default function AuthConfirmPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tokenHash, setTokenHash] = useState("");
  const [next, setNext] = useState("/");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedNext = params.get("next") || "/";
    setTokenHash(params.get("token_hash") || "");
    setNext(ALLOWED_NEXT.has(requestedNext) ? requestedNext : "/");
  }, []);

  async function continueRecovery() {
    if (!tokenHash) {
      setError("This recovery link is incomplete or invalid.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token_hash: tokenHash, next }),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        setError(result?.error || "This recovery link has expired or is no longer valid.");
        return;
      }

      router.replace(result?.next || next);
      router.refresh();
    } catch {
      setError("Unable to verify this recovery link. Please request a new one.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-flow-nav"><BackControl /></div>
      <section className="form-card" style={{ maxWidth: "32rem", width: "100%", margin: "auto" }}>
        <span className="eyebrow">ISHQIYA SECURITY</span>
        <h2>Continue password recovery</h2>
        <p className="muted">
          For security, this page does not activate the recovery link automatically. Click below to continue.
        </p>
        {error && <p className="muted" role="alert">{error}</p>}
        <Button type="button" onClick={continueRecovery} disabled={loading || !tokenHash}>
          {loading ? "Verifying..." : "Continue"}
        </Button>
      </section>
    </main>
  );
}
