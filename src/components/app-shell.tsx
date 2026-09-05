import { AppNav, AppTopbar, BackControl } from "./navigation";

export function AppShell({ mode, current, children }: { mode: "user" | "host"; current: string; children: React.ReactNode }) {
  return <div className="app-layout"><AppTopbar mode={mode} /><main className="app-main">{children}</main><AppNav mode={mode} current={current} /></div>;
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  return <div className="admin-shell"><header className="admin-header"><div className="content-wrap"><BackControl label="Back to Ishqiya" /><strong>ISHQIYA / ADMIN</strong></div></header><main className="admin-main">{children}</main></div>;
}