import { requireRole } from "@/lib/auth";
import { BackControl } from "@/components/navigation";
import { Conversation } from "@/components/conversation";
import { VideoCall } from "@/components/video-call";

export default async function HostConversationPage({ params }: { params: Promise<{ matchId: string }> }) {
  await requireRole("host");
  const { matchId } = await params;
  return <main className="auth-page"><div className="auth-flow-nav"><BackControl href="/host/chat" label="Back to chat" /></div><section className="form-card" style={{ maxWidth: "48rem", width: "100%", margin: "auto" }}><span className="eyebrow">Host conversation</span><h1 className="serif">Meet with presence.</h1><Conversation matchId={matchId} /><VideoCall matchId={matchId} /></section></main>;
}
