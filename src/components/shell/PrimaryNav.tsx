import { Link, useRouterState } from "@tanstack/react-router";
import type { ParticipantSummary, Workspace } from "@/lib/workspaces";
import { getVisibleWorkspaces, findWorkspaceByPath } from "@/lib/workspaces";

/**
 * Primary Navigation — sidebar rail rendered on every _authenticated screen.
 *
 * All visibility flows through getVisibleWorkspaces(). Individual nav items
 * MUST NOT gate themselves with per-page conditionals.
 */
export function PrimaryNav({ participant }: { participant: ParticipantSummary | null }) {
  const workspaces = getVisibleWorkspaces(participant);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const groups: Array<[string, Workspace[]]> = [
    ["Home", workspaces.filter((w) => w.kind === "dashboard")],
    ["Continuity workspaces", workspaces.filter((w) => w.kind === "domain")],
    ["Utilities", workspaces.filter((w) => w.kind === "utility")],
  ];

  return (
    <aside
      aria-label="Primary navigation"
      className="hidden md:flex md:w-64 md:flex-col bg-kosha-navy text-vault-ivory"
    >
      <div className="flex h-20 items-center px-lg border-b border-white/5">
        <img src="/brand/lockup-horizontal-reversed.svg" alt="Koshagra" className="h-8 w-auto" />
      </div>
      <nav className="flex-1 overflow-y-auto px-md py-lg" aria-label="Workspaces">
        {groups.map(([label, items]) => (
          <div key={label} className="mb-lg">
            <p className="px-sm text-xs uppercase tracking-widest text-vault-ivory/40">{label}</p>
            <ul className="mt-sm space-y-1">
              {items.map((w) => {
                const active = findWorkspaceByPath(pathname)?.slug === w.slug;
                return (
                  <li key={w.slug}>
                    <Link
                      to={w.path}
                      className={
                        "block rounded-md px-sm py-2 text-sm transition-colors " +
                        (active
                          ? "bg-vault-ivory/10 text-vault-ivory"
                          : "text-vault-ivory/70 hover:bg-vault-ivory/5 hover:text-vault-ivory")
                      }
                    >
                      {w.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="px-lg py-md text-xs text-vault-ivory/40">Sprint 1 · Foundation</div>
    </aside>
  );
}