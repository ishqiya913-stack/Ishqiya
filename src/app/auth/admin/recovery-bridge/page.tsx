"use client";

import { useEffect, useState } from "react";

export default function AdminRecoveryBridge() {
  const [ready, setReady] = useState(false);
  const [url, setUrl] = useState("");

  useEffect(() => {
    const value = window.location.hash.startsWith("#u=")
      ? decodeURIComponent(window.location.hash.slice(3))
      : "";

    if (value && /^https:\/\/[^/]+\.supabase\.co\//i.test(value)) {
      setUrl(value);
      setReady(true);
    }
  }, []);

  function continueRecovery() {
    if (url) window.location.assign(url);
  }

  return (
    <main className="auth-page">
      <section
        className="form-card"
        style={{ maxWidth: "32rem", width: "100%", margin: "auto" }}
      >
        <span className="eyebrow">Ishqiya Admin</span>
        <h2>Continue password recovery</h2>
        <p className="muted">
          For security, the recovery link is opened only after you press the
          button below.
        </p>

        <button
          className="button"
          type="button"
          disabled={!ready}
          onClick={continueRecovery}
        >
          {ready ? "Continue securely" : "Preparing secure link…"}
        </button>
      </section>
    </main>
  );
}
