"use client";

const ALLOWED_NEXT = new Set([
  "/auth/admin/reset-password",
  "/auth/host/reset-password",
  "/auth/user/reset-password",
]);

export default function RecoveryBridge() {
  function continueRecovery() {
    const params = new URLSearchParams(window.location.search);
    const requestedNext = params.get("next") || "";

    let value = "";

    try {
      value = window.location.hash.startsWith("#u=")
        ? decodeURIComponent(window.location.hash.slice(3))
        : "";
    } catch {
      value = "";
    }

    if (!ALLOWED_NEXT.has(requestedNext)) {
      window.alert("Invalid recovery link.");
      return;
    }

    if (!/^https:\/\/[^/]+\.supabase\.co\/auth\/v1\/verify\?/i.test(value)) {
      window.alert("Invalid or expired recovery link.");
      return;
    }

    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = value;
  }

  return (
    <main className="auth-page">
      <section
        className="form-card"
        style={{ maxWidth: "32rem", width: "100%", margin: "auto" }}
      >
        <span className="eyebrow">ISHQIYA SECURITY</span>
        <h2>Continue password recovery</h2>
        <p className="muted">
          For security, the recovery link is activated only after you press
          the button below.
        </p>
        <button className="button" type="button" onClick={continueRecovery}>
          Continue securely
        </button>
      </section>
    </main>
  );
}
