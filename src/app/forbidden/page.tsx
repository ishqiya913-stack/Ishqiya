import { BackControl } from "@/components/navigation";

export default function ForbiddenPage() {
  return (
    <main className="auth-page">
      <div className="auth-flow-nav"><BackControl /></div>
      <section className="form-card" style={{ maxWidth: "32rem", width: "100%", margin: "auto" }}>
        <span className="eyebrow">Access restricted</span>
        <h1 className="serif">This space is not available to this account.</h1>
        <p className="muted">Use the sign-in page for the account type you registered.</p>
      </section>
    </main>
  );
}