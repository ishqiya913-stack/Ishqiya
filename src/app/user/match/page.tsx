import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/ui";
export default function MatchPage() { return <AppShell mode="user" current="match"><span className="eyebrow">Your connections</span><h1 className="serif">Match</h1><EmptyState title="Your matches will live here" message="When a mutual connection begins, this is where you will find it." /></AppShell>; }