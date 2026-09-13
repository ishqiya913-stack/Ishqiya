"use client";

const tabs = [
  ["overview", "Overview"],
  ["people", "People"],
  ["payments", "Payments"],
  ["safety", "Safety & Reports"],
  ["content", "Content"],
  ["system", "System"],
] as const;

export function AdminTabs() {
  function goTo(id: string) {
    const target = document.getElementById(id);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", `#${id}`);
  }

  return (
    <nav className="admin-tabs" aria-label="Admin sections">
      {tabs.map(([id, label]) => (
        <a
          key={id}
          href={`#${id}`}
          onClick={(event) => {
            event.preventDefault();
            goTo(id);
          }}
        >
          {label}
        </a>
      ))}
    </nav>
  );
}
