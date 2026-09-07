import { RoomServiceClient } from "livekit-server-sdk";
import { createAdminClient } from "@/lib/supabase/admin";

export async function terminateLiveKitRoom(roomName: string) {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
  if (!apiKey || !apiSecret || !livekitUrl) throw new Error("LiveKit server configuration is missing.");
  await new RoomServiceClient(livekitUrl, apiKey, apiSecret).deleteRoom(roomName);
}

export async function reconcileVideoSession(sessionId: string, asOf = new Date().toISOString(), finalize = false) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("ishqiya_reconcile_video", {
    session_id: sessionId,
    as_of: asOf,
    finalize,
  });
  if (error) throw new Error(error.message);
  return data === true;
}

export async function processOpenVideoSession(sessionId: string, roomName: string) {
  const active = await reconcileVideoSession(sessionId);
  if (!active) {
    try {
      await terminateLiveKitRoom(roomName);
    } catch {
      // The database remains terminated; a later reconciliation can retry room cleanup.
    }
  }
  return active;
}
