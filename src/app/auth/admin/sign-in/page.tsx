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
    <main className="min-h-screen bg-[#07070b] text-white flex items-center justify-center px-4 py-10 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(236,72,153,0.16),transparent_42%)]" />
      <div className="absolute -top-32 -right-32 h-80 w-80 rounded-full bg-pink-600/10 blur-3xl" />
      <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-purple-600/10 blur-3xl" />

      <section className="relative w-full max-w-md">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-pink-500/20 bg-pink-500/10 shadow-2xl shadow-pink-950/30">
            <span className="text-2xl font-black text-pink-400">I</span>
          </div>
          <p className="text-[11px] font-bold tracking-[0.3em] text-pink-400 uppercase">Ishqiya</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Admin Console</h1>
          <p className="mt-2 text-sm text-zinc-400">Secure access to Ishqiya operations</p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-7 shadow-2xl shadow-black/40 backdrop-blur-xl">
          <div className="mb-6">
            <h2 className="text-lg font-semibold">Welcome back</h2>
            <p className="mt-1 text-sm text-zinc-500">Sign in with your authorized administrator account.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="mb-2 block text-xs font-semibold text-zinc-300">Admin email</label>
              <input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-pink-500/60 focus:ring-2 focus:ring-pink-500/10"
                placeholder="admin@ishqiya.com" />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-xs font-semibold text-zinc-300">Password</label>
              <input id="password" name="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-pink-500/60 focus:ring-2 focus:ring-pink-500/10"
                placeholder="Enter your password" />
            </div>

            <div className="flex justify-end">
              <a href="/auth/admin/forgot-password" className="text-xs font-semibold text-pink-400 transition hover:text-pink-300">
                Forgot password?
              </a>
            </div>

            <button type="submit" disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-pink-600 to-fuchsia-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-pink-950/30 transition hover:from-pink-500 hover:to-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-50">
              {loading ? "Signing in securely…" : "Sign in to Admin Console"}
            </button>

            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}
          </form>
        </div>

        <div className="mt-5 flex items-center justify-center gap-2 text-[11px] text-zinc-600">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Protected administration · Authorized access only
        </div>
      </section>
    </main>
  )

}
