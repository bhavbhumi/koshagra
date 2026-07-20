import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  SUBJECT_TYPES,
  useContinuitySubjects,
  type SubjectType,
} from "@/lib/continuity-subjects";

export const Route = createFileRoute("/_authenticated/search")({ component: SearchPage });

function SearchPage() {
  const { subjects, loading } = useContinuitySubjects();
  const [query, setQuery] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<Set<SubjectType>>(new Set());

  const results = useMemo(() => {
    const list = subjects ?? [];
    const q = query.trim().toLowerCase();
    return list.filter((s) => {
      if (selectedTypes.size > 0 && !selectedTypes.has(s.subject_type)) return false;
      if (q && !s.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [subjects, query, selectedTypes]);

  function toggleType(t: SubjectType) {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t); else next.add(t);
      return next;
    });
  }

  return (
    <section className="max-w-[64rem]">
      <label className="flex flex-col gap-xs">
        <span className="text-xs uppercase tracking-widest text-slate-grey">Search</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your Continuity Subjects by name"
          className="rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-md py-2 text-sm text-kosha-navy"
        />
      </label>

      <div className="mt-lg grid grid-cols-1 gap-lg md:grid-cols-[16rem_1fr]">
        <aside className="rounded-md bg-pure-white p-md shadow-[var(--shadow-1)] ring-1 ring-[color:var(--color-border-default)]">
          <p className="text-xs uppercase tracking-widest text-slate-grey">Type</p>
          <ul className="mt-sm space-y-1">
            {SUBJECT_TYPES.map((t) => (
              <li key={t}>
                <label className="flex items-center gap-sm text-sm text-kosha-navy">
                  <input
                    type="checkbox"
                    checked={selectedTypes.has(t)}
                    onChange={() => toggleType(t)}
                    className="h-4 w-4 rounded-sm border-[color:var(--color-border-default)] accent-kosha-navy"
                  />
                  {t}
                </label>
              </li>
            ))}
          </ul>
          {selectedTypes.size > 0 && (
            <button
              type="button"
              onClick={() => setSelectedTypes(new Set())}
              className="mt-md text-xs text-slate-grey underline hover:text-kosha-navy"
            >
              Clear filters
            </button>
          )}
        </aside>

        <div className="rounded-md bg-pure-white shadow-[var(--shadow-1)] ring-1 ring-[color:var(--color-border-default)]">
          {loading ? (
            <div className="p-lg text-sm text-slate-grey" aria-busy="true">
              <span className="mr-sm inline-block h-2 w-2 rounded-full bg-slate-grey align-middle animate-pulse" aria-hidden />
              Searching…
            </div>
          ) : results.length === 0 ? (
            <div className="p-lg text-sm text-slate-grey">
              {(subjects ?? []).length === 0 ? (
                <>
                  Nothing to search yet. Create your first Continuity Subject in{" "}
                  <Link to="/institution-registry" className="underline hover:text-kosha-navy">
                    Institution Registry
                  </Link>
                  .
                </>
              ) : (
                "No Continuity Subjects match this search."
              )}
            </div>
          ) : (
            <ul>
              {results.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-md border-b border-[color:var(--color-border-default)] px-md py-3 last:border-b-0"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm text-kosha-navy">{s.name}</div>
                    {s.purpose_description && (
                      <div className="truncate text-xs text-slate-grey">{s.purpose_description}</div>
                    )}
                  </div>
                  <span className="shrink-0 rounded-full border border-[color:var(--color-border-default)] bg-vault-ivory px-sm py-1 text-xs text-kosha-navy">
                    {s.subject_type}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}