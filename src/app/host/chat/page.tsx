import { AppShell } from "@/components/app-shell";
import { HostChatList } from "@/components/host-chat-list";
export default function HostChatPage() { return <AppShell mode="host" current="chat"><span className="eyebrow">Host space</span><h1 className="serif">Chat</h1><HostChatList /></AppShell>; }