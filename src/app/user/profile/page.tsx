import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/ui";
export default function ProfilePage() { return <AppShell mode="user" current="profile"><span className="eyebrow">Your space</span><h1 className="serif">Profile</h1><EmptyState title="Your profile starts here" message="Add the details that feel true to you when you are ready." /></AppShell>; }