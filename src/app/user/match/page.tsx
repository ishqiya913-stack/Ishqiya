import { AppShell } from "@/components/app-shell";
import { MatchList } from "@/components/match-list";
export default function MatchPage() { return <AppShell mode="user" current="match"><span className="eyebrow">Your connections</span><h1 className="serif">Match</h1><MatchList /></AppShell>; }