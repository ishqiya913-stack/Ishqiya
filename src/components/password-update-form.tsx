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
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const markReady = () => {
      if (!mounted) return;
      if (timeout) clearTimeout(timeout);

      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search
      );

      setReady(true);
      setLoading(false);
      setMessage("");
    };

    const markInvalid = () => {
      if (!mounted) return;
      setReady(false);
      setLoading(false);
      setMessage(
        "This reset link is invalid or expired. Please request a new reset link."
      );
    };

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;

        if (
          session &&
          (event === "PASSWORD_RECOVERY" ||
            event === "INITIAL_SESSION" ||
            event === "SIGNED_IN")
        ) {
          markReady();
        }
      }
    );

    const bootstrap = async () => {
      const { data: sessionData } = await supabase.auth.getSession();

      if (!mounted) return;

      if (sessionData.session) {
        markReady();
        return;
      }

      const fragment = new URLSearchParams(
        window.location.hash.replace(/^#/, "")
      );

      const type = fragment.get("type");
      const accessToken = fragment.get("access_token");
      const refreshToken = fragment.get("refresh_token");

      if (type === "recovery" && accessToken && refreshToken) {
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (!mounted) return;

        if (data.session && !error) {
          markReady();
          return;
        }
      }

      timeout = setTimeout(() => {
        if (!mounted) return;

        supabase.auth.getSession().then(({ data }) => {
          if (data.session) {
            markReady();
          } else {
            markInvalid();
          }
        });
      }, 4000);
    };

    void bootstrap();

    return () => {
      mounted = false;
      if (timeout) clearTimeout(timeout);
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!ready) return;

    if (password.length < 8) {
      setMessage("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);

    const { error } = await getSupabase().auth.updateUser({
      password,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    await getSupabase().auth.signOut();
    router.replace(`/auth/${mode}/sign-in?reset=complete`);
  }

  return (
    <main className="auth-page">
      <div className="auth-flow-nav">
        <BackControl />
      </div>

      <section
        className="form-card"
        style={{ maxWidth: "32rem", width: "100%", margin: "auto" }}
      >
        <span className="eyebrow">{mode} access</span>
        <h2>Choose a new password</h2>

        {loading && (
          <p className="muted" role="status">
            Preparing secure password reset…
          </p>
        )}

        <form onSubmit={submit}>
          <Input
            id="password"
            label="New password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
            disabled={!ready || loading}
          />

          <Input
            id="confirm-password"
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            minLength={8}
            disabled={!ready || loading}
          />

          {message && (
            <p className="muted" role="alert">
              {message}
            </p>
          )}

          <Button type="submit" disabled={loading || !ready}>
            {loading ? "Preparing…" : "Update password"}
          </Button>
        </form>
      </section>
    </main>
  );
}
