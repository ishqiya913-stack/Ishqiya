"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Notification = { id: string; title: string; body: string; read_at: string | null };
export function NotificationInbox() {
  const [items, setItems] = useState<Notification[]>([]);
  useEffect(() => { let active = true; const supabase = createClient(); async function load() { const response = await fetch("/api/notifications"); const result = await response.json() as { notifications?: Notification[] }; if (active) setItems(result.notifications || []); } async function subscribe() { const { data: authData } = await supabase.auth.getUser(); if (!authData.user) return null; return supabase.channel(`notifications:${authData.user.id}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${authData.user.id}` }, (payload) => setItems((current) => [payload.new as Notification, ...current])).subscribe(); } void load(); let channel: Awaited<ReturnType<typeof subscribe>> = null; void subscribe().then((nextChannel) => { channel = nextChannel; }); return () => { active = false; if (channel) void supabase.removeChannel(channel); }; }, []);
  if (!items.length) return <p className="muted">No new notifications.</p>;
  return <div>{items.slice(0, 5).map((item) => <button className="choice-card" type="button" key={item.id} onClick={() => { void fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notificationId: item.id }) }); setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, read_at: new Date().toISOString() } : entry)); }}><strong>{item.title}</strong><p>{item.body}</p></button>)}</div>;
}