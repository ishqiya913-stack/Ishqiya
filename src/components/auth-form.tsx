"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Input, Loading } from "./ui";

export function AuthForm({ mode, action }: { mode: "user" | "host"; action: "sign in" | "sign up" }) {
  const [values, setValues] = useState({ email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError("");
    if (!values.email || !values.password || (action === "sign up" && !values.confirm)) { setError("Please complete every required field."); return; }
    if (action === "sign up" && values.password !== values.confirm) { setError("Passwords do not match."); return; }
    setLoading(true); window.setTimeout(() => setLoading(false), 700);
  };
  const set = (key: keyof typeof values) => (event: React.ChangeEvent<HTMLInputElement>) => setValues({ ...values, [key]: event.target.value });
  const base = mode === "user" ? "/auth/user" : "/auth/host";
  return <form onSubmit={submit} noValidate>
    <Input id="email" label="Email" type="email" autoComplete="email" value={values.email} onChange={set("email")} />
    <Input id="password" label="Password" type="password" autoComplete={action === "sign in" ? "current-password" : "new-password"} value={values.password} onChange={set("password")} />
    {action === "sign up" && <Input id="confirm-password" label="Confirm password" type="password" autoComplete="new-password" value={values.confirm} onChange={set("confirm")} />}
    {action === "sign in" && <Link className="form-footer" href={`${base}/forgot-password`}>Forgot password?</Link>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <Button type="submit" disabled={loading}>{loading ? <Loading label="Submitting" /> : `${action[0].toUpperCase()}${action.slice(1)}`}</Button>
    <p className="form-footer">{action === "sign in" ? "New here?" : "Already have an account?"} <Link href={`${base}/${action === "sign in" ? "sign-up" : "sign-in"}`}>{action === "sign in" ? "Create an account" : "Sign in"}</Link></p>
  </form>;
}

export function AuthScreen({ mode, action }: { mode: "user" | "host"; action: "sign in" | "sign up" }) {
  return <main className="auth-page"><div className="auth-layout"><aside className="auth-aside"><Link className="brand" href="/"><span className="brand-mark">I</span><span style={{ color: "var(--cream)" }}>ISHQIYA</span></Link><h1 className="serif">Every feeling deserves a beginning.</h1><p>{mode === "user" ? "Enter a softer space to discover connection at your own pace." : "A considered space for hosts to meet every conversation with presence."}</p></aside><section className="form-card"><span className="eyebrow">{mode} access</span><h2>{action === "sign in" ? "Welcome back" : "Begin your story"}</h2><p className="muted">{action === "sign in" ? "Sign in to continue to your space." : "Create your Ishqiya account with your email."}</p><AuthForm mode={mode} action={action} /></section></div></main>;
}