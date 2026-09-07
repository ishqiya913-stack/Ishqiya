"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function FastLoginButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function login() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/fast-login", { method: "POST" });
      const result = await response.json() as { error?: string; redirect?: string };
      if (!response.ok) throw new Error(result.error || "Fast Login could not be completed.");
      router.push(result.redirect || "/user/discover");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Fast Login could not be completed.");
      setLoading(false);
    }
  }

  return <div className={className}><button className="landing-button landing-button-primary" type="button" onClick={() => void login()} disabled={loading}>{loading ? "Opening Ishqiya..." : "Fast Login"}<span aria-hidden="true">↗</span></button>{error && <p className="muted" role="alert">{error}</p>}</div>;
}
