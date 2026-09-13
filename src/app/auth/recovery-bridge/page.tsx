"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function RecoveryBridgePage() {
  const router = useRouter();

  useEffect(() => {
    async function recover() {
      const supabase = createClient();
      const params = new URLSearchParams(window.location.search);

      const next = params.get("next");
      const safeNext =
        next && next.startsWith("/") && !next.startsWith("//")
          ? next
          : "/auth/admin/reset-password";

      const code = params.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          router.replace("/auth/admin/sign-in?error=recovery_failed");
          return;
        }

        router.replace(safeNext);
        return;
      }

      const hash = window.location.hash;

      if (hash.includes("access_token=")) {
        const hashParams = new URLSearchParams(hash.slice(1));
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (!error) {
            window.history.replaceState(
              {},
              document.title,
              window.location.pathname + window.location.search
            );

            router.replace(safeNext);
            return;
          }
        }
      }

      router.replace("/auth/admin/sign-in?error=recovery_missing");
    }

    recover();
  }, [router]);

  return (
    <main className="auth-page">
      <section
        className="form-card"
        style={{ maxWidth: "32rem", width: "100%", margin: "auto" }}
      >
        <h2>Preparing password reset...</h2>
        <p className="muted">Please wait...</p>
      </section>
    </main>
  );
}
