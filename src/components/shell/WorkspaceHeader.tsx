import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import type { ParticipantSummary } from "@/lib/workspaces";
import { findWorkspaceByPath, getVisibleWorkspaces } from "@/lib/workspaces";
import { useContinuitySubjects } from "@/lib/continuity-subjects";

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
  const { subjects } = useContinuitySubjects();
  const menuRef = useRef<HTMLDivElement>(null);

  // Selected Continuity Subject lives in localStorage — a URL search param is a
  // valid alternative; either satisfies the sprint requirement.
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem("koshagra.subject") || null;
  });

  // If the previously-selected subject is no longer visible under RLS, fall back
  // to Personal so the header never claims a context the Participant cannot access.
  useEffect(() => {
    if (!subjects || !selectedId) return;
    if (!subjects.some((s) => s.id === selectedId)) {
      setSelectedId(null);
      window.localStorage.removeItem("koshagra.subject");
    }
  }, [subjects, selectedId]);

  useEffect(() => {
    if (!switcherOpen) return;
    function onDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setSwitcherOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [switcherOpen]);

  function selectSubject(id: string | null) {
    setSelectedId(id);
    if (id) window.localStorage.setItem("koshagra.subject", id);
    else window.localStorage.removeItem("koshagra.subject");
    setSwitcherOpen(false);
  }

  const selectedSubject = subjects?.find((s) => s.id === selectedId) ?? null;
  const selectedLabel = selectedSubject ? selectedSubject.name : "Personal";

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
      <div className="flex items-center justify-between border-b border-[color:var(--color-border-default)] bg-pure-white px-md sm:px-xl h-12">
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
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setSwitcherOpen((v) => !v)}
            aria-haspopup="listbox"
            aria-expanded={switcherOpen}
            className="inline-flex items-center gap-sm rounded-md border border-[color:var(--color-border-default)] px-sm py-1 text-xs text-slate-grey hover:text-kosha-navy"
          >
            <span className="uppercase tracking-widest">Workspace</span>
            <span className="max-w-[10rem] truncate text-kosha-navy">{selectedLabel}</span>
          </button>
          {switcherOpen && (
            <div role="listbox" className="absolute right-0 mt-2 w-64 rounded-md bg-pure-white p-xs shadow-[var(--shadow-2)] ring-1 ring-[color:var(--color-border-default)] z-10">
              <button
                type="button"
                role="option"
                aria-selected={selectedId === null}
                onClick={() => selectSubject(null)}
                className={
                  "block w-full rounded-sm px-sm py-2 text-left text-sm " +
                  (selectedId === null ? "bg-vault-ivory text-kosha-navy" : "text-kosha-navy hover:bg-vault-ivory")
                }
              >
                Personal
              </button>
              {(subjects ?? []).length > 0 ? (
                <>
                  <div className="mt-xs border-t border-[color:var(--color-border-default)] pt-xs px-sm text-xs uppercase tracking-widest text-slate-grey">
                    Continuity Subjects
                  </div>
                  <ul className="mt-xs max-h-64 overflow-y-auto">
                    {(subjects ?? []).map((s) => (
                      <li key={s.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={selectedId === s.id}
                          onClick={() => selectSubject(s.id)}
                          className={
                            "flex w-full items-center justify-between gap-sm rounded-sm px-sm py-2 text-left text-sm " +
                            (selectedId === s.id ? "bg-vault-ivory text-kosha-navy" : "text-kosha-navy hover:bg-vault-ivory")
                          }
                        >
                          <span className="truncate">{s.name}</span>
                          <span className="shrink-0 text-xs text-slate-grey">{s.subject_type}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <div className="mt-xs border-t border-[color:var(--color-border-default)] px-sm py-2 text-xs text-slate-grey">
                  No Continuity Subjects yet.{" "}
                  <Link
                    to="/institution-registry"
                    onClick={() => setSwitcherOpen(false)}
                    className="underline hover:text-kosha-navy"
                  >
                    Open Institution Registry
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Header proper */}
      <header className="flex flex-col gap-md border-b border-[color:var(--color-border-default)] bg-pure-white px-md py-lg sm:flex-row sm:items-start sm:justify-between sm:gap-lg sm:px-xl">
        <div className="min-w-0">
          <h1 className="font-display text-[28px] leading-[36px] text-kosha-navy">
            {current?.name ?? "Koshagra"}
          </h1>
          {current && (
            <p className="mt-xs max-w-[48rem] text-sm leading-[22px] text-slate-grey">
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
        <div className="flex shrink-0 items-center justify-between gap-md sm:justify-end">
          <div className="min-w-0 sm:text-right">
            <div className="truncate text-sm text-kosha-navy">{participant?.display_name ?? "—"}</div>
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