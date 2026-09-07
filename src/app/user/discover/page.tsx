import { AppShell } from "@/components/app-shell";
import { DiscoverBrowser } from "@/components/discover-browser";

export default function DiscoverPage() {
	return <AppShell mode="user" current="discover"><span className="eyebrow">Your discovery</span><h1 className="serif">Meet with intention.</h1><p className="muted">Only approved Hosts who are ready to be discovered appear here.</p><DiscoverBrowser /></AppShell>;
}