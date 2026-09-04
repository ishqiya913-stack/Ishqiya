import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/ui";
export default function HostHistoryPage() { return <AppShell mode="host" current="history"><span className="eyebrow">Host space</span><h1 className="serif">History</h1><EmptyState title="No history yet" message="Completed conversations and activity will appear here." /></AppShell>; }