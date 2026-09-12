"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/components/ui";
import { BackControl } from "@/components/navigation";
import { createClient } from "@/lib/supabase/client";

export function PasswordUpdateForm({ mode }: { mode: "user" | "host" | "admin" }) {
  const router = useRouter();
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  const getSupabase = () => (supabaseRef.current ??= createClient());
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const supabase = getSupabase();

    const markReady = () => {
      if (!mounted) return;

      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search
      );

      setReady(true);
      setLoading(false);
    };

    const failRecovery = () => {
      if (!mounted) return;
      setMessage("This reset link is invalid or expired. Please request a new one.");
      setReady(false);
      setLoading(false);
    };

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) {
        markReady();
      }
    });

    const prepare = async () => {
      setLoading(true);
      setMessage("");

      // Supabase may already have processed the recovery URL.
      const { data: sessionData } = await supabase.auth.getSession();

      if (!mounted) return;

      if (sessionData.session) {
        markReady();
        return;
      }

      // Fallback for the implicit recovery flow where the tokens are
      // still present in the URL hash.
      const fragment = new URLSearchParams(
        window.location.hash.replace(/^#/, "")
      );

      const accessToken = fragment.get("access_token");
      const refreshToken = fragment.get("refresh_token");
      const type = fragment.get("type");

      if (type === "recovery" && accessToken && refreshToken) {
        const { data: recoveryData, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (!mounted) return;

        if (!error && recoveryData.session) {
          markReady();
          return;
        }
      }

      // Give Supabase auth-state processing a moment before declaring
      // the link invalid, avoiding the initialization race.

    };

    void prepare();

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
      event.preventDefault();
    if (!ready) return;
    if (password.length < 8 || password !== confirmPassword) {
      setMessage("Use at least 8 characters and make both passwords match.");
      return;
    }
    setLoading(true);
    setMessage("");
    const { error } = await getSupabase().auth.updateUser({ password });
    if (error) { setMessage(error.message); setLoading(false); return; }
    await getSupabase().auth.signOut();
    router.replace(`/auth/${mode}/sign-in?reset=complete`);
  }

  return <main className="auth-page"><div className="auth-flow-nav"><BackControl /></div><section className="form-card" style={{ maxWidth: "32rem", width: "100%", margin: "auto" }}><span className="eyebrow">{mode} access</span><h2>Choose a new password</h2><form onSubmit={submit}><Input id="password" label="New password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} /><Input id="confirm-password" label="Confirm new password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength={8} />{message && <p className="muted" role="alert">{message}</p>}<Button type="submit" disabled={loading || !ready}>{loading ? "Preparing…" : "Update password"}</Button></form></section></main>;
}
