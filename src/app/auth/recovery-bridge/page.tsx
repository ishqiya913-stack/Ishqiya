"use client";

import { useEffect, useState } from "react";

const ALLOWED_NEXT = new Set([
  "/auth/admin/reset-password",
  "/auth/host/reset-password",
  "/auth/user/reset-password",
]);

export default function RecoveryBridge() {
  const [url, setUrl] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedNext = params.get("next") || "";
    const value = window.location.hash.startsWith("#u=")
      ? decodeURIComponent(window.location.hash.slice(3))
      : "";

    if (!ALLOWED_NEXT.has(requestedNext)) return;
    if (!/^https:\/\/[^/]+\.supabase\.co\/auth\/v1\/verify\?/i.test(value)) return;

    setUrl(value);
    setReady(true);
  }, []);

  function continueRecovery() {
    if (url) window.location.assign(url);
  }

  return (
    <main className="auth-page">
      <section className="form-card" style={{ maxWidth: "32rem", width: "100%", margin: "auto" }}>
        <span className="eyebrow">ISHQIYA SECURITY</span>
        <h2>Continue password recovery</h2>
        <p className="muted">
          For security, the recovery link is activated only after you press the button below.
        </p>
        <button className="button" type="button" disabled={!ready} onClick={continueRecovery}>
          {ready ? "Continue securely" : "Preparing secure link…"}
        </button>
      </section>
    </main>
  );
}
