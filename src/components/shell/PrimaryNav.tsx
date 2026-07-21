import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
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
      {/* Mobile-only header inside drawer: reversed lockup + close button.
          Desktop rail sits under the fixed AppHeader, so no logo here. */}
      <div className="md:hidden flex h-14 shrink-0 items-center justify-between px-lg border-b border-white/5">
        <img src="/brand/lockup-horizontal-reversed.svg" alt="Koshagra" className="h-6 w-auto" />
        {onMobileClose && (
          <button
            type="button"
            onClick={onMobileClose}
            aria-label="Close navigation"
            className="rounded-md p-2 text-vault-ivory/70 hover:text-vault-ivory"
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
      <UserFooter participant={participant} />
    </>
  );

  return (
    <>
      {/* Desktop rail — fixed under the top AppHeader (h-14) */}
      <aside
        aria-label="Primary navigation"
        className="hidden md:flex md:flex-col fixed left-0 top-14 bottom-0 w-64 bg-kosha-navy text-vault-ivory z-30"
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

/**
 * UserFooter — signed-in Participant identity anchored at the sidebar bottom.
 * Shows an initials avatar, display name, and Capacity. Click opens a small
 * menu with contextual actions (Account, Notifications, Review, Sign out).
 * A dedicated Account screen will replace the placeholder link later.
 */
function UserFooter({ participant }: { participant: ParticipantSummary | null }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const name = participant?.display_name ?? "Participant";
  const email = participant?.email ?? "";
  const capacity = participant?.capacity_name ?? "Principal";
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("") || "K";

  return (
    <div ref={rootRef} className="relative shrink-0 border-t border-white/5 px-md py-md">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex w-full items-center gap-sm rounded-md px-sm py-2 text-left hover:bg-vault-ivory/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-bindu-gold focus-visible:ring-offset-2 focus-visible:ring-offset-kosha-navy"
      >
        <span
          aria-hidden
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-vault-ivory/10 text-sm font-semibold text-vault-ivory"
        >
          {initials}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm text-vault-ivory">{name}</span>
          <span className="block truncate text-xs text-vault-ivory/50">
            Capacity · {capacity}
          </span>
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="shrink-0 text-vault-ivory/50"
          aria-hidden
        >
          <path d="M6 15l6-6 6 6" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute bottom-[calc(100%-4px)] left-md right-md rounded-md bg-pure-white p-xs shadow-[var(--shadow-3)] ring-1 ring-[color:var(--color-border-default)] z-50"
        >
          <div className="px-sm py-2">
            <div className="truncate text-sm text-kosha-navy">{name}</div>
            {email && (
              <div className="truncate text-xs text-slate-grey">{email}</div>
            )}
          </div>
          <div className="border-t border-[color:var(--color-border-default)]" />
          <MenuLink to="/review" onNavigate={() => setOpen(false)}>Review queue</MenuLink>
          <MenuLink to="/notifications" onNavigate={() => setOpen(false)}>Notifications</MenuLink>
          <MenuLink to="/admin" onNavigate={() => setOpen(false)}>Account &amp; admin</MenuLink>
          <div className="border-t border-[color:var(--color-border-default)]" />
          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            className="block w-full rounded-sm px-sm py-2 text-left text-sm text-kosha-navy hover:bg-vault-ivory"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  to,
  onNavigate,
  children,
}: {
  to: string;
  onNavigate: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      role="menuitem"
      onClick={onNavigate}
      className="block rounded-sm px-sm py-2 text-sm text-kosha-navy hover:bg-vault-ivory"
    >
      {children}
    </Link>
  );
}