"use client";

import { useEffect, useState } from "react";
import { Button, Input } from "@/components/ui";

const FIELDS = [
  ["brand_tagline", "Brand tagline"], ["hero_eyebrow", "Hero eyebrow"], ["hero_title", "Hero title"], ["hero_intro", "Hero introduction"],
  ["hero_feature_1", "Feature 1"], ["hero_feature_2", "Feature 2"], ["chat_price_coins", "Chat coins / message"],
  ["video_price_coins_per_minute", "Video coins / minute"], ["host_share_percent", "Host share %"], ["support_email", "Support email"],
  ["child_safety_contact", "Child-safety contact"], ["maintenance_mode", "Maintenance mode (true/false)"],
] as const;

export function AdminSettings() {
  const [settings, setSettings] = useState<Record<string,string>>({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetch("/api/admin/settings").then(async r => { const x = await r.json(); if (!r.ok) throw new Error(x.error); setSettings(x.settings || {}); }).catch(e => setMessage(e.message)).finally(() => setLoading(false)); }, []);
  async function save() {
    setSaving(true); setMessage("");
    try { const r = await fetch("/api/admin/settings", { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify({settings}) }); const x=await r.json(); if(!r.ok) throw new Error(x.error); setMessage("Saved. Changes are live from the database immediately."); } catch(e) { setMessage(e instanceof Error ? e.message : "Save failed."); } finally { setSaving(false); }
  }
  if (loading) return <p className="muted">Loading live settings…</p>;
  return <div className="choice-card" style={{display:"grid",gap:"1rem"}}>
    <div><span className="eyebrow">Live control centre</span><h2>Edit app & portal settings</h2><p className="muted">Changes are stored server-side and are read by the app on the next request; no rebuild is required for database-backed settings.</p></div>
    {FIELDS.map(([key,label]) => <label key={key} style={{display:"grid",gap:".4rem"}}><span>{label}</span><Input id={`setting-${key}`} value={settings[key] ?? ""} label={label} onChange={e=>setSettings(s=>({...s,[key]:e.target.value}))} /></label>)}
    <div className="form-footer"><Button type="button" onClick={()=>void save()} disabled={saving}>{saving?"Saving…":"Save live settings"}</Button>{message&&<span className="muted" role="status">{message}</span>}</div>
  </div>;
}
