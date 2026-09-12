"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Room, RoomEvent, Track } from "livekit-client";
import { Button } from "@/components/ui";

type VideoTokenResponse = {
  token?: string;
  url?: string;
  sessionId?: string;
  error?: string;
};

export function VideoCall({ matchId }: { matchId: string }) {
  const roomRef = useRef<Room | null>(null);
  const sessionIdRef = useRef("");

  const localVideo = useRef<HTMLVideoElement>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);

  const [connected, setConnected] = useState(false);
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [message, setMessage] = useState("");

  const endSession = useCallback(async () => {
    const sessionId = sessionIdRef.current;
    const currentRoom = roomRef.current;

    sessionIdRef.current = "";
    roomRef.current = null;

    setConnected(false);

    if (currentRoom) {
      try {
        currentRoom.disconnect();
      } catch {
        // Local cleanup should continue even if LiveKit disconnect fails.
      }
    }

    if (!sessionId) {
      return;
    }

    try {
      const response = await fetch("/api/video/end", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionId }),
        keepalive: true,
      });

      if (!response.ok) {
        setMessage(
          "The video connection ended, but the server could not confirm the session closure yet."
        );
      }
    } catch {
      setMessage(
        "The video connection ended. Server reconciliation will finalize the session."
      );
    }
  }, []);

  const start = useCallback(async () => {
    if (starting || connected) {
      return;
    }

    setMessage("");
    setStarting(true);

    try {
      const response = await fetch("/api/video/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ matchId }),
        cache: "no-store",
      });

      const result = (await response.json()) as VideoTokenResponse;

      if (
        !response.ok ||
        !result.token ||
        !result.url ||
        !result.sessionId
      ) {
        setMessage(result.error || "Video could not be started.");
        return;
      }

      const nextRoom = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      nextRoom.on(
        RoomEvent.TrackSubscribed,
        (track) => {
          if (track.kind !== Track.Kind.Video) {
            return;
          }

          if (remoteVideo.current) {
            track.attach(remoteVideo.current);
          }
        }
      );

      nextRoom.on(
        RoomEvent.TrackUnsubscribed,
        (track) => {
          if (track.kind === Track.Kind.Video) {
            track.detach();
          }
        }
      );

      nextRoom.on(
        RoomEvent.ParticipantDisconnected,
        () => {
          setMessage("The other participant has left the video call.");
        }
      );

      nextRoom.on(
        RoomEvent.Disconnected,
        () => {
          setConnected(false);
        }
      );

      try {
        await nextRoom.connect(result.url, result.token);

        await nextRoom.localParticipant.setCameraEnabled(true);

        // Do not automatically enable the microphone.
        // User can enable it from the UI after the video connection starts.
      } catch {
        try {
          nextRoom.disconnect();
        } catch {
          // Ignore secondary cleanup errors.
        }

        setMessage(
          "Camera access is required to start video. Please allow camera access and try again."
        );
        return;
      }

      const cameraPublication =
        nextRoom.localParticipant.getTrackPublication(
          Track.Source.Camera
        );

      const cameraTrack = cameraPublication?.track;

      if (cameraTrack && localVideo.current) {
        cameraTrack.attach(localVideo.current);
      }

      roomRef.current = nextRoom;
      sessionIdRef.current = result.sessionId;

      setConnected(true);
    } catch {
      setMessage("Video could not be started. Please try again.");
    } finally {
      setStarting(false);
    }
  }, [connected, matchId, starting]);

  const toggleMicrophone = useCallback(async () => {
    const currentRoom = roomRef.current;

    if (!currentRoom) {
      return;
    }

    try {
      const publication =
        currentRoom.localParticipant.getTrackPublication(
          Track.Source.Microphone
        );

      await currentRoom.localParticipant.setMicrophoneEnabled(
        !publication?.isEnabled
      );
    } catch {
      setMessage(
        "Microphone access could not be changed. Please check your browser permissions."
      );
    }
  }, []);

  useEffect(() => {
    return () => {
      const currentRoom = roomRef.current;
      const sessionId = sessionIdRef.current;

      roomRef.current = null;
      sessionIdRef.current = "";

      if (currentRoom) {
        try {
          currentRoom.disconnect();
        } catch {
          // Ignore cleanup errors during unmount.
        }
      }

      if (sessionId) {
        void fetch("/api/video/end", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sessionId }),
          keepalive: true,
        }).catch(() => {
          // Server reconciliation remains authoritative.
        });
      }
    };
  }, []);

  return (
    <section className="choice-card">
      <span className="eyebrow">Camera video</span>

      <p className="muted">
        Video is billed by the server at the account rate. Your balance is
        checked server-side. Voice-only calls are not available.
      </p>

      {connected ? (
        <>
          <div className="discover-grid">
            <div>
              <video
                ref={localVideo}
                autoPlay
                muted
                playsInline
                style={{
                  width: "100%",
                  borderRadius: 16,
                  background: "#000",
                }}
              />
              <small className="muted">You</small>
            </div>

            <div>
              <video
                ref={remoteVideo}
                autoPlay
                playsInline
                style={{
                  width: "100%",
                  borderRadius: 16,
                  background: "#000",
                }}
              />
              <small className="muted">Host</small>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              marginTop: 16,
            }}
          >
            <Button
              type="button"
              onClick={() => void toggleMicrophone()}
            >
              Toggle microphone
            </Button>

            <Button
              type="button"
              variant="danger"
              disabled={ending}
              onClick={async () => {
                setEnding(true);
                await endSession();
                setEnding(false);
              }}
            >
              {ending ? "Ending…" : "End video"}
            </Button>
          </div>
        </>
      ) : (
        <Button
          type="button"
          disabled={starting}
          onClick={() => void start()}
        >
          {starting ? "Starting video…" : "Start camera video"}
        </Button>
      )}

      {message && (
        <p className="muted" role="alert">
          {message}
        </p>
      )}
    </section>
  );
}