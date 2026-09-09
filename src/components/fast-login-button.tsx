"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function FastLoginButton() {
  const router = useRouter();
  const [showAgeGate, setShowAgeGate] = useState(false);
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function login() {
    setError("");

    if (!dateOfBirth) {
      setError("Please enter your date of birth.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/fast-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ dateOfBirth }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Fast Login could not be completed.");
      }

      router.push(result.redirect || "/user/discover");
      router.refresh();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Fast Login could not be completed."
      );
      setLoading(false);
    }
  }

  return (
    <>
      <div className="landing-button-wrap">
        <button
          className="landing-button landing-button-primary"
          type="button"
          onClick={() => {
            setError("");
            setShowAgeGate(true);
          }}
        >
          <span aria-hidden="true">✦</span>
          Fast Login
        </button>
      </div>

      {showAgeGate && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="age-gate-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        >
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-5 text-center">
              <div className="mb-3 text-4xl">🔞</div>

              <h2
                id="age-gate-title"
                className="text-2xl font-semibold text-gray-900"
              >
                18+ Only
              </h2>

              <p className="mt-2 text-sm text-gray-600">
                Ishqiya is an adults-only dating platform. Enter your real date
                of birth to continue.
              </p>
            </div>

            <label
              htmlFor="fast-login-dob"
              className="mb-2 block text-sm font-medium text-gray-800"
            >
              Date of birth
            </label>

            <input
              id="fast-login-dob"
              type="date"
              value={dateOfBirth}
              max={new Date().toISOString().split("T")[0]}
              onChange={(event) => setDateOfBirth(event.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-gray-900"
              autoComplete="bday"
            />

            <p className="mt-2 text-xs text-gray-500">
              You must be 18 or older to use Ishqiya.
            </p>

            {error && (
              <p className="mt-3 text-sm text-red-600" role="alert">
                {error}
              </p>
            )}

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowAgeGate(false);
                  setError("");
                }}
                disabled={loading}
                className="flex-1 rounded-xl border border-gray-300 px-4 py-3 font-medium text-gray-700"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void login()}
                disabled={loading || !dateOfBirth}
                className="flex-1 rounded-xl bg-black px-4 py-3 font-medium text-white disabled:opacity-50"
              >
                {loading ? "Checking..." : "Continue"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
