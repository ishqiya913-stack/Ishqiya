"use client";

export default function AdminRecoveryBridge() {
  function continueRecovery() {
    let value = "";

    try {
      value = window.location.hash.startsWith("#u=")
        ? decodeURIComponent(window.location.hash.slice(3))
        : "";
    } catch {
      value = "";
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
        <span className="eyebrow">Ishqiya Admin</span>
        <h2>Continue password recovery</h2>
        <p className="muted">
          For security, the recovery link is opened only after you press the
          button below.
        </p>
        <button className="button" type="button" onClick={continueRecovery}>
          Continue securely
        </button>
      </section>
    </main>
  );
}
