"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

function calculateAge(dateOfBirth: string) {
  const dob = new Date(`${dateOfBirth}T00:00:00`);
  if (Number.isNaN(dob.getTime())) return -1;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age -= 1;
  return age;
}

export function FastLoginButton() {
  const router = useRouter();
  const [showAgeGate, setShowAgeGate] = useState(false);
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function login(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setError("");

    if (!dateOfBirth) {
      setError("Please enter your date of birth.");
      return;
    }

    const age = calculateAge(dateOfBirth);
    if (age < 0) {
      setError("Please enter a valid date of birth.");
      return;
    }
    if (age < 18) {
      setError("Ishqiya is available only to people aged 18 or older.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/fast-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateOfBirth }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Fast Login could not be completed.");
      router.push(result.redirect || "/user/discover");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Fast Login could not be completed.");
      setLoading(false);
    }
  }

  return (
    <>
      <div className="landing-button-wrap">
        <button className="landing-button landing-button-primary" type="button" onClick={() => { setError(""); setDateOfBirth(""); setShowAgeGate(true); }}>
          <span aria-hidden="true">✦</span>
          Fast Login
        </button>
      </div>

      {showAgeGate && (
        <div role="dialog" aria-modal="true" aria-labelledby="age-gate-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !loading) setShowAgeGate(false); }}>
          <form onSubmit={(event) => void login(event)} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-5 text-center">
              <div className="mb-3 text-4xl" aria-hidden="true">🔞</div>
              <h2 id="age-gate-title" className="text-2xl font-semibold text-gray-900">18+ Only</h2>
              <p className="mt-2 text-sm text-gray-600">Ishqiya is an adults-only dating platform. Enter your real date of birth to continue.</p>
            </div>

            <label htmlFor="fast-login-dob" className="mb-2 block text-sm font-medium text-gray-800">Date of birth</label>
            <input
              id="fast-login-dob"
              name="dateOfBirth"
              type="date"
              value={dateOfBirth}
              max={new Date().toISOString().split("T")[0]}
              onChange={(event) => { setDateOfBirth(event.target.value); setError(""); }}
              onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void login(); } }}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-200"
              autoComplete="bday"
              autoFocus
              required
            />
            <p className="mt-2 text-xs text-gray-500">You must be 18 or older to use Ishqiya.</p>

            {error && <p className="mt-3 text-sm text-red-600" role="alert">{error}</p>}

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => { setShowAgeGate(false); setError(""); }} disabled={loading} className="rounded-xl border border-gray-300 px-4 py-3 font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50">Cancel</button>
              <button type="submit" disabled={loading || !dateOfBirth} className="rounded-xl bg-black px-4 py-3 font-medium text-white transition hover:bg-gray-800 disabled:opacity-50">{loading ? "Checking..." : "Continue"}</button>
            </div>
            <p className="mt-3 text-center text-[11px] text-gray-400">Press Enter to continue</p>
          </form>
        </div>
      )}
    </>
  );
}
