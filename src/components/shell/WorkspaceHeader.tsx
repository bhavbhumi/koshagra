import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { ParticipantSummary } from "@/lib/workspaces";
import { findWorkspaceByPath, getVisibleWorkspaces } from "@/lib/workspaces";
import { useContinuitySubjects } from "@/lib/continuity-subjects";

/**
 * AppHeader — fixed top bar spanning the full viewport width.
 *
 * Left:   mobile hamburger + brand lockup + breadcrumb
 * Center: current workspace name with (i) tooltip for its Purpose
 * Right:  workspace switcher (Personal / Continuity Subject)
 *
 * The signed-in Participant's own identity block has moved to the
 * Primary Navigation footer — do NOT reintroduce it here.
 */
export function AppHeader({
  participant,
  onOpenMobileNav,
}: {
  participant: ParticipantSummary | null;
  onOpenMobileNav: () => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const current = findWorkspaceByPath(pathname);
  const visible = getVisibleWorkspaces(participant);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [purposeOpen, setPurposeOpen] = useState(false);
  const { subjects } = useContinuitySubjects();
  const menuRef = useRef<HTMLDivElement>(null);

  const [selectedId, setSelectedId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem("koshagra.subject") || null;
  });

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

  return (
    <header
      className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between gap-md border-b border-[color:var(--color-border-default)] bg-pure-white px-md sm:px-xl"
      aria-label="Application header"
    >
      {/* Left: hamburger (mobile) + brand + breadcrumb */}
      <div className="flex min-w-0 items-center gap-md">
        <button
          type="button"
          aria-label="Open navigation"
          onClick={onOpenMobileNav}
          className="md:hidden rounded-md p-2 text-kosha-navy hover:bg-vault-ivory"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
        </button>
        <Link to="/dashboard" className="shrink-0" aria-label="Koshagra home">
          <img src="/brand/lockup-horizontal-primary.svg" alt="Koshagra" className="h-6 w-auto" />
        </Link>
        <nav aria-label="Breadcrumb" className="hidden sm:block min-w-0 text-xs text-slate-grey">
          <ol className="flex items-center gap-2">
            <li className="shrink-0"><Link to="/dashboard" className="hover:text-kosha-navy">Home</Link></li>
            {current && current.slug !== "dashboard" && (
              <>
                <li aria-hidden className="shrink-0">·</li>
                <li className="min-w-0 truncate text-kosha-navy inline-flex items-center gap-1">
                  <span className="truncate">{current.name}</span>
                  <button
                    type="button"
                    aria-label={`About ${current.name}`}
                    onMouseEnter={() => setPurposeOpen(true)}
                    onMouseLeave={() => setPurposeOpen(false)}
                    onFocus={() => setPurposeOpen(true)}
                    onBlur={() => setPurposeOpen(false)}
                    onClick={() => setPurposeOpen((v) => !v)}
                    className="relative inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-slate-grey/40 text-[10px] font-semibold text-slate-grey hover:border-kosha-navy hover:text-kosha-navy focus:outline-none focus-visible:ring-2 focus-visible:ring-bindu-gold focus-visible:ring-offset-2"
                  >
                    i
                    {purposeOpen && (
                      <span
                        role="tooltip"
                        className="absolute left-1/2 top-full z-50 mt-2 w-64 -translate-x-1/2 rounded-md bg-kosha-navy px-md py-sm text-xs font-normal normal-case tracking-normal text-vault-ivory shadow-[var(--shadow-2)]"
                      >
                        {current.purpose}
                      </span>
                    )}
                  </button>
                </li>
              </>
            )}
          </ol>
        </nav>
      </div>

      {/* Right: workspace switcher */}
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setSwitcherOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={switcherOpen}
          className="inline-flex items-center gap-sm rounded-md border border-[color:var(--color-border-default)] px-sm py-1 text-xs text-slate-grey hover:text-kosha-navy"
        >
          <span className="hidden sm:inline uppercase tracking-widest">Workspace</span>
          <span className="max-w-[10rem] truncate text-kosha-navy">{selectedLabel}</span>
        </button>
        {switcherOpen && (
          <div role="listbox" className="absolute right-0 mt-2 w-64 rounded-md bg-pure-white p-xs shadow-[var(--shadow-2)] ring-1 ring-[color:var(--color-border-default)] z-50">
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

      <span className="sr-only" data-visible-workspaces={visible.map((w) => w.slug).join(",")} />
    </header>
  );
}

/**
 * WorkspaceTabs — thin tab strip that renders directly below the fixed AppHeader.
 * Presently a single "Overview" tab is shown; per-workspace tabs slot in here.
 */
export function WorkspaceTabs() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const current = findWorkspaceByPath(pathname);
  if (!current) return null;
  return (
    <div
      role="tablist"
      aria-label="Workspace sections"
      className="sticky top-14 z-30 flex gap-lg border-b border-[color:var(--color-border-default)] bg-pure-white px-md sm:px-xl"
    >
      <span
        role="tab"
        aria-selected="true"
        className="border-b-2 border-bindu-gold py-sm text-xs font-semibold uppercase tracking-widest text-kosha-navy"
      >
        Overview
      </span>
    </div>
  );
}

// Back-compat alias — nothing imports this any more but keeps external refs safe.
export function WorkspaceHeader(props: { participant: ParticipantSummary | null }) {
  return <AppHeader participant={props.participant} onOpenMobileNav={() => {}} />;
}
