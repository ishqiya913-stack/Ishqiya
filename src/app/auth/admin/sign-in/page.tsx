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
          <div className="admin-field" style={{marginBottom:"20px"}}>
            <label htmlFor="admin-email">Admin email</label>
            <input style={{width:"100%",boxSizing:"border-box",padding:"14px 16px",marginTop:"8px",borderRadius:"12px",border:"1px solid #3a3a42",background:"#111116",color:"#fff",fontSize:"16px",outline:"none"}} id="admin-email" name="admin-console-email" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter admin email" autoComplete="off" required />
          </div>
          <div className="admin-field" style={{marginBottom:"20px"}}>
            <label htmlFor="admin-password">Password</label>
            <input style={{width:"100%",boxSizing:"border-box",padding:"14px 16px",marginTop:"8px",borderRadius:"12px",border:"1px solid #3a3a42",background:"#111116",color:"#fff",fontSize:"16px",outline:"none"}} id="admin-password" name="admin-console-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" autoComplete="new-password" required />
          </div>
          {error && <p className="admin-login-error" role="alert">{error}</p>}
          <button style={{width:"100%",padding:"15px 18px",border:0,borderRadius:"12px",background:"linear-gradient(135deg,#e11d48,#be123c)",color:"#fff",fontWeight:700,fontSize:"16px",cursor:"pointer",marginTop:"6px"}} className="admin-login-submit" type="submit" disabled={loading}>{loading ? "Verifying access…" : "Sign in to Admin"}</button>
          <Link className="admin-forgot-link" href="/auth/admin/forgot-password">Forgot password? <span>Reset it securely →</span></Link>
        </form>
        <div className="admin-login-footer" style={{marginTop:"28px",paddingTop:"20px",borderTop:"1px solid rgba(255,255,255,.08)",display:"flex",justifyContent:"space-between",fontSize:"13px",color:"#9ca3af"}}><span>🔒 Protected administration</span><span>ISHQIYA</span></div>
      </section>
    </main>
  );
}
