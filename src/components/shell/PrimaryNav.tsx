import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import type { ParticipantSummary, Workspace } from "@/lib/workspaces";
import { getVisibleWorkspaces, findWorkspaceByPath } from "@/lib/workspaces";

/**
 * Primary Navigation — sidebar rail rendered on every _authenticated screen.
 *
 * All visibility flows through getVisibleWorkspaces(). Individual nav items
 * MUST NOT gate themselves with per-page conditionals.
 */
export function PrimaryNav({
  participant,
  mobileOpen = false,
  onMobileClose,
}: {
  participant: ParticipantSummary | null;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}) {
  const workspaces = getVisibleWorkspaces(participant);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    if (mobileOpen) onMobileClose?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const groups: Array<[string, Workspace[]]> = [
    ["Start here", workspaces.filter((w) => w.kind === "start")],
    ["Home", workspaces.filter((w) => w.kind === "dashboard")],
    ["Continuity workspaces", workspaces.filter((w) => w.kind === "domain")],
    ["Shared", workspaces.filter((w) => w.kind === "shared")],
    ["Admin", workspaces.filter((w) => w.kind === "admin")],
  ];

  const railInner = (
    <>
      <div className="flex h-20 shrink-0 items-center justify-between px-lg border-b border-white/5">
        <img src="/brand/lockup-horizontal-reversed.svg" alt="Koshagra" className="h-8 w-auto" />
        {onMobileClose && (
          <button
            type="button"
            onClick={onMobileClose}
            aria-label="Close navigation"
            className="md:hidden rounded-md p-2 text-vault-ivory/70 hover:text-vault-ivory"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
          </button>
        )}
      </div>
      <nav className="flex-1 overflow-y-auto px-md py-lg" aria-label="Workspaces">
        {groups.filter(([, items]) => items.length > 0).map(([label, items]) => (
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
    </>
  );

  return (
    <>
      {/* Desktop rail */}
      <aside
        aria-label="Primary navigation"
        className="hidden md:flex md:w-64 md:flex-col bg-kosha-navy text-vault-ivory"
      >
        {railInner}
      </aside>

      {/* Mobile drawer */}
      <div
        className={
          "fixed inset-0 z-40 md:hidden transition-opacity duration-200 " +
          (mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none")
        }
        aria-hidden={!mobileOpen}
      >
        <button
          type="button"
          aria-label="Close navigation overlay"
          onClick={onMobileClose}
          className="absolute inset-0 bg-kosha-navy/50"
        />
        <aside
          aria-label="Primary navigation"
          className={
            "absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-kosha-navy text-vault-ivory shadow-[var(--shadow-3)] transition-transform duration-200 " +
            (mobileOpen ? "translate-x-0" : "-translate-x-full")
          }
        >
          {railInner}
        </aside>
      </div>
    </>
  );
}