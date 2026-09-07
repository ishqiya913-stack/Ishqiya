"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { BackControl } from "@/components/navigation";
import { Button, Input } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export function AuthResetForm({ mode }: { mode: "user" | "host" }) {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/${mode}/reset-password`,
    });
    setMessage(error ? error.message : "If an account exists for that email, a reset link is on its way.");
    setLoading(false);
  }

  return <main className="auth-page"><div className="auth-flow-nav"><BackControl /></div><section className="form-card" style={{ maxWidth: "32rem", width: "100%", margin: "auto" }}><span className="eyebrow">{mode} access</span><h2>Reset your password</h2><p className="muted">Enter your email and we will make space for the next step.</p><form onSubmit={submit}><Input id="email" label="Email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /><Button type="submit" disabled={loading}>{loading ? "Sending..." : "Request reset"}</Button>{message && <p className="muted" role="status">{message}</p>}<Link className="form-footer" href={`/auth/${mode}/sign-in`}>Back to sign in</Link></form></section></main>;
}