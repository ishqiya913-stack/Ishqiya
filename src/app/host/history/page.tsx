import { AppShell } from "@/components/app-shell";
import { HostHistory } from "@/components/host-history";
export default function HostHistoryPage() { return <AppShell mode="host" current="history"><span className="eyebrow">Host space</span><h1 className="serif">History</h1><HostHistory /></AppShell>; }