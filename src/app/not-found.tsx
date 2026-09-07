import { BackControl } from "@/components/navigation";

export default function NotFound() {
  return (
    <main className="auth-page">
      <div className="auth-flow-nav"><BackControl /></div>
      <section className="form-card" style={{ maxWidth: "32rem", width: "100%", margin: "auto" }}>
        <span className="eyebrow">Not found</span>
        <h1 className="serif">That page is not available.</h1>
        <p className="muted">The requested space could not be found.</p>
      </section>
    </main>
  );
}