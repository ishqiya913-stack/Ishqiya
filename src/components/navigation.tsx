import Link from "next/link";

export function Brand({ light = false }: { light?: boolean }) { return <Link className="brand" href="/"><span className="brand-mark">I</span><span style={light ? { color: "var(--cream)" } : undefined}>ISHQIYA</span></Link>; }

export function BackControl({ href = "/", label = "Back to Ishqiya" }: { href?: string; label?: string }) {
  return <Link className="flow-back" href={href} aria-label={label}><span aria-hidden="true">←</span><span>{label}</span></Link>;
}

const userLinks = [["⌂", "Discover", "/user/discover"], ["♡", "Match", "/user/match"], ["◈", "Wallet", "/user/wallet"]];
const hostLinks = [["◌", "Chat", "/host/chat"], ["◷", "History", "/host/history"], ["○", "Profile", "/host/profile"]];

export function AppNav({ mode, current }: { mode: "user" | "host"; current: string }) {
  const links = mode === "user" ? userLinks : hostLinks;
  return <nav className="bottom-nav" aria-label={`${mode} navigation`}>{links.map(([icon, label, href]) => <Link href={href} key={href} aria-current={current === label.toLowerCase() ? "page" : undefined}><span className="nav-icon" aria-hidden="true">{icon}</span>{label}</Link>)}</nav>;
}

export function AppTopbar({ mode }: { mode: "user" | "host" }) { return <header className="app-topbar"><BackControl label="Home" /><Brand /><span className="eyebrow">{mode} space</span></header>; }