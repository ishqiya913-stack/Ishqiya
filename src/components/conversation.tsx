"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button, Loading } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

type Message = { id: string; sender_id: string; body: string; created_at: string };
export function Conversation({ matchId }: { matchId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => { let active = true; const supabase = createClient(); let channel: ReturnType<typeof supabase.channel> | null = null; async function load() { const response = await fetch(`/api/conversations/${matchId}`); const result = await response.json() as { conversationId?: string; messages?: Message[]; error?: string }; if (!active) return; if (!response.ok || !result.conversationId) { setError(result.error || "Conversation unavailable."); setLoading(false); return; } setMessages(result.messages || []); setLoading(false); channel = supabase.channel(`conversation:${result.conversationId}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${result.conversationId}` }, (payload) => { const message = payload.new as Message; setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]); }).subscribe(); } void load(); return () => { active = false; if (channel) void supabase.removeChannel(channel); }; }, [matchId]);
  async function send(event: FormEvent) { event.preventDefault(); if (!body.trim()) return; setError(""); const response = await fetch(`/api/conversations/${matchId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body, idempotencyKey: crypto.randomUUID() }) }); const result = await response.json() as { message?: Message; error?: string }; if (!response.ok) setError(result.error || "Message could not be sent."); else { setMessages((current) => [...current, result.message!]); setBody(""); } }
  if (loading) return <Loading label="Loading conversation" />;
  return <div><div className="empty-panel" aria-live="polite">{messages.length ? messages.map((message) => <p key={message.id}><strong>{message.sender_id.slice(0, 8)}</strong> {message.body}</p>) : <p className="muted">No messages yet. Begin with presence.</p>}</div>{error && <p className="muted" role="alert">{error}</p>}<form onSubmit={send}><label htmlFor="message">Message</label><textarea id="message" value={body} onChange={(event) => setBody(event.target.value)} maxLength={4000} required /><Button type="submit">Send for 100 coins</Button></form></div>;
}