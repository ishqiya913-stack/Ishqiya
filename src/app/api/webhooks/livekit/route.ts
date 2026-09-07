import { NextResponse } from "next/server";
import { WebhookReceiver, authorizeHeader } from "livekit-server-sdk";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { reconcileVideoSession, terminateLiveKitRoom } from "@/lib/livekit/billing";

const supportedEvents = new Set(["room_started", "room_finished", "participant_joined", "participant_left", "participant_connection_aborted"]);

function eventTime(seconds: bigint) {
  const value = Number(seconds);
  return Number.isFinite(value) && value > 0 ? new Date(value * 1000).toISOString() : new Date().toISOString();
}

export async function POST(request: Request) {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
  if (!apiKey || !apiSecret || !livekitUrl) return NextResponse.json({ error: "LiveKit webhook service is not configured." }, { status: 503 });

  const rawBody = await request.text();
  let event;
  try {
    const receiver = new WebhookReceiver(apiKey, apiSecret);
    event = await receiver.receive(rawBody, request.headers.get(authorizeHeader) || undefined);
  } catch {
    return NextResponse.json({ error: "Invalid LiveKit webhook signature." }, { status: 401 });
  }

  if (!event.id || !event.event) return NextResponse.json({ error: "Malformed LiveKit webhook event." }, { status: 400 });
  const admin = createAdminClient();
  const roomName = event.room?.name || null;
  const participantIdentity = event.participant?.identity || null;
  const payloadHash = createHash("sha256").update(rawBody).digest("hex");
  const { data: existing } = await admin.from("livekit_webhook_events").select("event_id,status").eq("event_id", event.id).maybeSingle();
  if (existing?.status === "processed" || existing?.status === "ignored") return NextResponse.json({ accepted: true, duplicate: true });

  const { data: session } = roomName
    ? await admin.from("video_sessions").select("id,room_name,room_name,room_name,user_id,host_id,status").eq("room_name", roomName).maybeSingle()
    : { data: null };
  const eventRow = { event_id: event.id, event_type: event.event, room_name: roomName, participant_identity: participantIdentity, video_session_id: session?.id || null, payload_hash: payloadHash, status: "received" };
  const { error: ledgerError } = existing
    ? await admin.from("livekit_webhook_events").update(eventRow).eq("event_id", event.id)
    : await admin.from("livekit_webhook_events").insert(eventRow);
  if (ledgerError) return NextResponse.json({ error: "Webhook event could not be recorded." }, { status: 500 });

  if (!supportedEvents.has(event.event)) {
    await admin.from("livekit_webhook_events").update({ status: "ignored", processed_at: new Date().toISOString() }).eq("event_id", event.id);
    return NextResponse.json({ accepted: true, ignored: true });
  }
  if (!session) {
    await admin.from("livekit_webhook_events").update({ status: "ignored", error_message: "Unknown room", processed_at: new Date().toISOString() }).eq("event_id", event.id);
    return NextResponse.json({ accepted: true, ignored: true });
  }

  const occurredAt = eventTime(event.createdAt);
  try {
    if (event.event === "room_started") {
      await admin.from("video_sessions").update({ livekit_room_sid: event.room?.sid || null, livekit_started_at: occurredAt, reconciliation_status: "active", reconciliation_error: null }).eq("id", session.id).in("status", ["created", "active"]);
    } else if (event.event === "participant_joined") {
      if (!participantIdentity || ![session.user_id, session.host_id].includes(participantIdentity)) throw new Error("Participant is not part of the matched session");
      const accountRole = participantIdentity === session.user_id ? "user" : "host";
      const { error } = await admin.from("video_session_participants").upsert({ video_session_id: session.id, account_id: participantIdentity, participant_identity: participantIdentity, account_role: accountRole, joined_at: occurredAt, left_at: null }, { onConflict: "video_session_id,participant_identity" });
      if (error) throw error;
      await admin.from("video_sessions").update({ livekit_room_sid: event.room?.sid || null, status: "active", reconciliation_status: "active", reconciliation_error: null }).eq("id", session.id).in("status", ["created", "active"]);
      const { data: refreshedSession } = await admin.from("video_sessions").select("livekit_finished_at").eq("id", session.id).maybeSingle();
      if (refreshedSession?.livekit_finished_at) {
        const active = await reconcileVideoSession(session.id, refreshedSession.livekit_finished_at, true);
        if (!active) { try { await terminateLiveKitRoom(session.room_name); } catch { /* database state remains authoritative */ } }
      }
    } else if (event.event === "participant_left" || event.event === "participant_connection_aborted") {
      if (!participantIdentity || ![session.user_id, session.host_id].includes(participantIdentity)) throw new Error("Participant is not part of the matched session");
      const { error } = await admin.from("video_session_participants").update({ left_at: occurredAt }).eq("video_session_id", session.id).eq("participant_identity", participantIdentity).is("left_at", null);
      if (error) throw error;
      const active = await reconcileVideoSession(session.id, occurredAt, true);
      if (!active) { try { await terminateLiveKitRoom(session.room_name); } catch { /* database termination remains authoritative */ } }
    } else if (event.event === "room_finished") {
      const { error: finishMarkerError } = await admin.from("video_sessions").update({ livekit_finished_at: occurredAt, reconciliation_status: "awaiting_participants" }).eq("id", session.id).in("status", ["created", "active"]);
      if (finishMarkerError) throw finishMarkerError;
      const active = await reconcileVideoSession(session.id, occurredAt, true);
      if (!active) { try { await terminateLiveKitRoom(session.room_name); } catch { /* room is already finishing */ } }
      const { error: finishError } = await admin.from("video_sessions").update({ livekit_finished_at: occurredAt }).eq("id", session.id);
      if (finishError) throw finishError;
    }
    await admin.from("livekit_webhook_events").update({ status: "processed", processed_at: new Date().toISOString(), error_message: null }).eq("event_id", event.id);
    return NextResponse.json({ accepted: true });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : "Webhook processing failed";
    await admin.from("livekit_webhook_events").update({ status: "failed", error_message: message }).eq("event_id", event.id);
    return NextResponse.json({ error: "LiveKit event processing failed." }, { status: 500 });
  }
}
