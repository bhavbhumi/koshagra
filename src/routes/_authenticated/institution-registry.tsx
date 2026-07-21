import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useParticipant } from "@/lib/participant";
import {
  SUBJECT_TYPES,
  useContinuitySubjects,
  type SubjectType,
} from "@/lib/continuity-subjects";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/institution-registry")({
  component: InstitutionRegistryPage,
});

function InstitutionRegistryPage() {
  const { participant } = useParticipant();
  const { subjects, loading, refresh } = useContinuitySubjects();
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<Set<SubjectType>>(new Set());

  const hasEstate = useMemo(
    () => (subjects ?? []).some((s) => s.subject_type === "Estate"),
    [subjects],
  );

  const filtered = useMemo(() => {
    const list = subjects ?? [];
    const q = query.trim().toLowerCase();
    return list.filter((s) => {
      if (selectedTypes.size > 0 && !selectedTypes.has(s.subject_type)) return false;
      if (q) {
        const hay = `${s.name} ${s.purpose_description ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [subjects, query, selectedTypes]);

  function toggleType(t: SubjectType) {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }

  const hasAny = (subjects ?? []).length > 0;
  const isFiltering = query.trim().length > 0 || selectedTypes.size > 0;

  return (
    <section className="max-w-[64rem]">
      <div className="flex items-center justify-between gap-md">
        <p className="text-sm text-slate-grey">
          {subjects && subjects.length > 0
            ? `${subjects.length} Continuity Subject${subjects.length === 1 ? "" : "s"} under your stewardship.`
            : "Establish your first Continuity Subject to begin."}
        </p>
        {!creating && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="rounded-md bg-kosha-navy px-md py-2 text-sm font-semibold text-vault-ivory hover:bg-kosha-navy/90"
          >
            Create new
          </button>
        )}
      </div>

      {creating && (
        <CreateForm
          hasEstate={hasEstate}
          ownerParticipantId={participant?.id ?? null}
          onCancel={() => setCreating(false)}
          onCreated={async () => {
            setCreating(false);
            await refresh();
          }}
        />
      )}

      {hasAny && (
        <div className="mt-lg flex flex-col gap-sm sm:flex-row sm:items-center sm:justify-between">
          <label className="flex flex-1 flex-col gap-xs sm:max-w-[24rem]">
            <span className="sr-only">Search Continuity Subjects</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or purpose"
              className="rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-md py-2 text-sm text-kosha-navy"
            />
          </label>
          <div className="flex flex-wrap items-center gap-xs">
            {SUBJECT_TYPES.map((t) => {
              const active = selectedTypes.has(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleType(t)}
                  aria-pressed={active}
                  className={
                    "rounded-full border px-sm py-1 text-xs transition-colors " +
                    (active
                      ? "border-kosha-navy bg-kosha-navy text-vault-ivory"
                      : "border-[color:var(--color-border-default)] bg-pure-white text-kosha-navy hover:bg-vault-ivory")
                  }
                >
                  {t}
                </button>
              );
            })}
            {isFiltering && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setSelectedTypes(new Set());
                }}
                className="ml-xs text-xs text-slate-grey underline hover:text-kosha-navy"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      <div className="mt-lg overflow-hidden rounded-md bg-pure-white shadow-[var(--shadow-1)] ring-1 ring-[color:var(--color-border-default)]">
        {loading ? (
          <div className="p-lg text-sm text-slate-grey" aria-busy="true">
            <span className="mr-sm inline-block h-2 w-2 rounded-full bg-slate-grey align-middle animate-pulse" aria-hidden />
            Loading your registry…
          </div>
        ) : (subjects ?? []).length === 0 ? (
          <div className="p-xl">
            <h2 className="font-display text-[20px] leading-[28px] text-kosha-navy">
              No Continuity Subjects yet
            </h2>
            <p className="mt-xs text-sm text-slate-grey">
              A Continuity Subject is the Estate, Family, Enterprise, Trust, or Digital Legacy
              your continuity work is organized around. Create your first one to begin.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-lg text-sm text-slate-grey">
            No Continuity Subjects match this search.
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-vault-ivory text-xs uppercase tracking-widest text-slate-grey">
              <tr>
                <th className="px-md py-3 font-semibold">Name</th>
                <th className="px-md py-3 font-semibold">Type</th>
                <th className="px-md py-3 font-semibold">Created</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-t border-[color:var(--color-border-default)]">
                  <td className="px-md py-3 text-kosha-navy">
                    <div>{s.name}</div>
                    {s.purpose_description && (
                      <div className="mt-1 truncate text-xs text-slate-grey">{s.purpose_description}</div>
                    )}
                  </td>
                  <td className="px-md py-3">
                    <TypeBadge type={s.subject_type} />
                  </td>
                  <td className="px-md py-3 font-numeral text-slate-grey">
                    {formatDate(s.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

function TypeBadge({ type }: { type: SubjectType }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[color:var(--color-border-default)] bg-vault-ivory px-sm py-1 text-xs text-kosha-navy">
      {type}
    </span>
  );
}

function CreateForm({
  hasEstate,
  ownerParticipantId,
  onCancel,
  onCreated,
}: {
  hasEstate: boolean;
  ownerParticipantId: string | null;
  onCancel: () => void;
  onCreated: () => void;
}) {
  const firstAvailable = SUBJECT_TYPES.find((t) => !(t === "Estate" && hasEstate)) ?? "Family";
  const [subjectType, setSubjectType] = useState<SubjectType>(firstAvailable);
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ownerParticipantId) {
      setMessage("Your Participant record is still loading. Please try again in a moment.");
      return;
    }
    if (!name.trim()) {
      setMessage("A name is required.");
      return;
    }
    setSubmitting(true);
    setMessage(null);
    const { error } = await supabase.from("continuity_subjects").insert({
      owner_participant_id: ownerParticipantId,
      name: name.trim(),
      subject_type: subjectType,
      purpose_description: purpose.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      setMessage(
        error.code === "23505"
          ? "You already steward an Estate. A Participant may hold only one."
          : "Something needs attention — please review the entry and try again.",
      );
      return;
    }
    onCreated();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-md rounded-md bg-pure-white p-lg shadow-[var(--shadow-1)] ring-1 ring-[color:var(--color-border-default)]"
    >
      <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
        <label className="flex flex-col gap-xs">
          <span className="text-xs uppercase tracking-widest text-slate-grey">Type</span>
          <select
            value={subjectType}
            onChange={(e) => setSubjectType(e.target.value as SubjectType)}
            className="rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-sm py-2 text-sm text-kosha-navy"
          >
            {SUBJECT_TYPES.map((t) => {
              const estateBlocked = t === "Estate" && hasEstate;
              return (
                <option key={t} value={t} disabled={estateBlocked}>
                  {t}{estateBlocked ? " — one already stewarded" : ""}
                </option>
              );
            })}
          </select>
          {hasEstate && (
            <span className="text-xs text-slate-grey">
              A Participant may steward only one Estate.
            </span>
          )}
        </label>
        <label className="flex flex-col gap-xs">
          <span className="text-xs uppercase tracking-widest text-slate-grey">Name</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. The Sharma Family Trust"
            className="rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-sm py-2 text-sm text-kosha-navy"
          />
        </label>
      </div>
      <label className="mt-md flex flex-col gap-xs">
        <span className="text-xs uppercase tracking-widest text-slate-grey">
          Purpose <span className="normal-case tracking-normal text-slate-grey/70">(optional)</span>
        </span>
        <textarea
          rows={3}
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          className="rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-sm py-2 text-sm text-kosha-navy"
        />
      </label>
      {message && <p className="mt-md text-sm text-slate-grey">{message}</p>}
      <div className="mt-lg flex items-center justify-end gap-sm">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-md py-2 text-sm font-semibold text-kosha-navy hover:bg-vault-ivory"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-kosha-navy px-md py-2 text-sm font-semibold text-vault-ivory hover:bg-kosha-navy/90 disabled:opacity-40"
        >
          {submitting ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}