"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/components/ui";
import { BackControl } from "@/components/navigation";
import { createClient } from "@/lib/supabase/client";

export function PasswordUpdateForm({ mode }: { mode: "user" | "host" | "admin" }) {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 8 || password !== confirmPassword) {
      setMessage("Use at least 8 characters and make both passwords match.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setMessage(error.message);
    else router.push(`/auth/${mode}/sign-in?reset=complete`);
    setLoading(false);
  }

  return <main className="auth-page"><div className="auth-flow-nav"><BackControl /></div><section className="form-card" style={{ maxWidth: "32rem", width: "100%", margin: "auto" }}><span className="eyebrow">{mode} access</span><h2>Choose a new password</h2><form onSubmit={submit}><Input id="password" label="New password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} /><Input id="confirm-password" label="Confirm new password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength={8} />{message && <p className="muted" role="alert">{message}</p>}<Button type="submit" disabled={loading}>{loading ? "Updating..." : "Update password"}</Button></form></section></main>;
}