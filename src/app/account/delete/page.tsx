"use client";

import { useState } from "react";

export default function AccountDeletionPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    const response = await fetch("/api/account/delete-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const result = await response.json() as { message?: string; error?: string };
    setMessage(response.ok
      ? result.message || "Your deletion request has been received."
      : result.error || "Request could not be submitted.");
  }

  return (
    <main style={{ maxWidth: 640, margin: "60px auto", padding: 24 }}>
      <p>Ishqiya</p>
      <h1>Delete your Ishqiya account</h1>
      <p>
        Submit your account deletion request below. We will process deletion
        of the account and associated personal data, subject to any legally
        required retention.
      </p>

      <form onSubmit={submit}>
        <label>
          Email address
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ display: "block", width: "100%", marginTop: 8, marginBottom: 16 }}
          />
        </label>
        <button type="submit">Request account deletion</button>
      </form>

      {message && <p role="status">{message}</p>}
    </main>
  );
}
