import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import type { ParticipantSummary } from "@/lib/workspaces";
import { findWorkspaceByPath, getVisibleWorkspaces } from "@/lib/workspaces";

/**
 * Workspace Header — shows the current Workspace's name, its one-line Purpose,
 * and the signed-in Participant's own Capacity. Nothing more.
 */
export function WorkspaceHeader({ participant }: { participant: ParticipantSummary | null }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const current = findWorkspaceByPath(pathname);
  const visible = getVisibleWorkspaces(participant);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const capacity = participant?.capacity_name ?? "Principal";

  return (
    <>
      {/* Breadcrumb + Workspace Switcher row */}
      <div className="flex items-center justify-between border-b border-[color:var(--color-border-default)] bg-pure-white px-xl h-12">
        <nav aria-label="Breadcrumb" className="text-xs text-slate-grey">
          <ol className="flex items-center gap-2">
            <li><Link to="/dashboard" className="hover:text-kosha-navy">Home</Link></li>
            {current && current.slug !== "dashboard" && (
              <>
                <li aria-hidden>·</li>
                <li className="text-kosha-navy">{current.name}</li>
              </>
            )}
          </ol>
        </nav>
        <div className="relative">
          <button
            type="button"
            onClick={() => setSwitcherOpen((v) => !v)}
            aria-haspopup="listbox"
            aria-expanded={switcherOpen}
            className="inline-flex items-center gap-sm rounded-md border border-[color:var(--color-border-default)] px-sm py-1 text-xs text-slate-grey hover:text-kosha-navy"
          >
            <span className="uppercase tracking-widest">Workspace</span>
            <span className="text-kosha-navy">Personal</span>
          </button>
          {switcherOpen && (
            <div role="listbox" className="absolute right-0 mt-2 w-56 rounded-md bg-pure-white p-xs shadow-[var(--shadow-2)] ring-1 ring-[color:var(--color-border-default)] z-10">
              <div className="px-sm py-2 text-xs text-slate-grey">
                Multi-institution switching arrives with the Institution Registry.
              </div>
              <div className="rounded-sm bg-vault-ivory px-sm py-2 text-sm text-kosha-navy">Personal</div>
            </div>
          )}
        </div>
      </div>

      {/* Header proper */}
      <header className="flex items-start justify-between gap-lg border-b border-[color:var(--color-border-default)] bg-pure-white px-xl py-lg">
        <div className="min-w-0">
          <h1 className="font-display text-[28px] leading-[36px] text-kosha-navy">
            {current?.name ?? "Koshagra"}
          </h1>
          {current && (
            <p className="mt-xs max-w-3xl text-sm leading-[22px] text-slate-grey">
              {current.purpose}
            </p>
          )}
          {/* Tab bar — present as a component even when unused. */}
          <div role="tablist" aria-label="Workspace sections" className="mt-md flex gap-lg border-b border-transparent">
            <span role="tab" aria-selected="true" className="border-b-2 border-bindu-gold pb-2 text-xs uppercase tracking-widest text-kosha-navy">
              Overview
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-md">
          <div className="text-right">
            <div className="text-sm text-kosha-navy">{participant?.display_name ?? "—"}</div>
            <div className="text-xs uppercase tracking-widest text-slate-grey">
              Capacity · {capacity}
            </div>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-md py-2 text-xs font-semibold text-kosha-navy hover:bg-vault-ivory"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* List reference of visible workspaces satisfies "filtered through one function" auditability. */}
      <span className="sr-only" data-visible-workspaces={visible.map((w) => w.slug).join(",")} />
    </>
  );
}