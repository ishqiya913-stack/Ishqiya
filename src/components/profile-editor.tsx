"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button, Input } from "@/components/ui";

export function ProfileEditor({ mode }: { mode: "user" | "host" }) {
  const [values, setValues] = useState<Record<string, string | boolean>>({ displayName: "", bio: "", city: "", headline: "", age: "", isActive: false, isVisible: false, isDiscoverable: false });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch("/api/profile").then(async (response) => { const result = await response.json() as { profile?: Record<string, string | boolean> }; if (result.profile) setValues((current) => ({ ...current, ...result.profile })); setLoading(false); }); }, []);
  function set(key: string, value: string | boolean) { setValues((current) => ({ ...current, [key]: value })); }
  async function submit(event: FormEvent) { event.preventDefault(); setMessage(""); const payload = mode === "host" ? { displayName: values.displayName, headline: values.headline, bio: values.bio, city: values.city, age: values.age } : { displayName: values.displayName, bio: values.bio, city: values.city }; const response = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); const result = await response.json() as { error?: string }; setMessage(response.ok ? "Profile saved." : result.error || "Profile could not be saved."); }
  if (loading) return <p className="muted">Loading your profile...</p>;
  return <form onSubmit={submit}><Input id="displayName" label="Display name" value={String(values.displayName || "")} onChange={(event) => set("displayName", event.target.value)} required /><Input id="city" label="City" value={String(values.city || "")} onChange={(event) => set("city", event.target.value)} />{mode === "host" && <><Input id="headline" label="Headline" value={String(values.headline || "")} onChange={(event) => set("headline", event.target.value)} /><Input id="age" label="Age" type="number" min={18} max={100} value={String(values.age || "")} onChange={(event) => set("age", event.target.value)} /></>}<label htmlFor="bio">Bio</label><textarea id="bio" value={String(values.bio || "")} onChange={(event) => set("bio", event.target.value)} maxLength={2000} /><Button type="submit">Save profile</Button>{message && <p className="muted" role="status">{message}</p>}</form>;
}