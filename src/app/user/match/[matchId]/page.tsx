import { requireRole } from "@/lib/auth";
import { BackControl } from "@/components/navigation";
import { Conversation } from "@/components/conversation";
import { VideoCall } from "@/components/video-call";

export default async function ConversationPage({ params }: { params: Promise<{ matchId: string }> }) {
  await requireRole("user");
  const { matchId } = await params;
  return <main className="auth-page"><div className="auth-flow-nav"><BackControl href="/user/match" label="Back to matches" /></div><section className="form-card" style={{ maxWidth: "48rem", width: "100%", margin: "auto" }}><span className="eyebrow">Private conversation</span><h1 className="serif">A considered beginning.</h1><p className="muted">Each User message costs 100 coins. Contact-sharing messages are blocked before delivery.</p><Conversation matchId={matchId} /><VideoCall matchId={matchId} /></section></main>;
}