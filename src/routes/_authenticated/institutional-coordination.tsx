import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useParticipant } from "@/lib/participant";
import { useContinuitySubjects, type ContinuitySubject, type SubjectType } from "@/lib/continuity-subjects";

export const Route = createFileRoute("/_authenticated/institutional-coordination")({
  component: InstitutionalCoordinationPage,
});

type TabKey = "overview" | "flags" | "reviews" | "advisors";
const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "flags", label: "Cross-Domain Flags" },
  { key: "reviews", label: "Coherence Reviews" },
  { key: "advisors", label: "Professional Advisors" },
];

type FlagStatus = "Active" | "Resolved";
type Flag = {
  id: string; owner_participant_id: string; title: string; description: string | null;
  related_subject_id: string | null; status: FlagStatus; raised_at: string;
  resolved_at: string | null; resolution_note: string | null;
};
type Review = { id: string; owner_participant_id: string; reviewed_at: string; note: string | null };
type Advisor = {
  id: string; owner_participant_id: string; full_name: string;
  specialty: string | null; contact_note: string | null; notes: string | null;
};

function formatEnInDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" });
}

const DOMAIN_PATH: Record<SubjectType, string | null> = {
  Estate: "/estate-planning",
  Family: "/family-governance",
  Enterprise: "/business-succession",
  Trust: "/trust-administration",
  "Digital Legacy": "/digital-legacy",
};

function InstitutionalCoordinationPage() {
  const { participant } = useParticipant();
  const { subjects, loading } = useContinuitySubjects();
  const [tab, setTab] = useState<TabKey>("overview");

  if (loading || !participant) {
    return (
      <section aria-busy="true" className="max-w-[64rem]">
        <div className="inline-flex items-center gap-sm text-sm text-slate-grey">
          <span className="h-2 w-2 rounded-full bg-slate-grey animate-pulse" aria-hidden />
          Loading Institutional Coordination…
        </div>
      </section>
    );
  }

  const owned = subjects ?? [];

  if (owned.length === 0) {
    return (
      <section className="max-w-[42rem]">
        <div className="rounded-md border border-[color:var(--color-border-default)] bg-pure-white p-lg">
          <h2 className="font-display text-[20px] leading-[28px] text-kosha-navy">
            Nothing to coordinate yet
          </h2>
          <p className="mt-xs text-sm text-slate-grey">
            Institutional Coordination reads across your Estate, Family, Enterprise, and Trust
            workspaces once you have at least one. Begin by creating your first Continuity Subject
            in Institution Registry.
          </p>
          <Link
            to="/institution-registry"
            className="mt-md inline-flex items-center rounded-md bg-kosha-navy px-md py-2 text-sm font-semibold text-vault-ivory hover:bg-kosha-navy/90"
          >
            Open Institution Registry
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-[72rem]">
      <TabBar tab={tab} onChange={setTab} />
      <div className="mt-lg">
        {tab === "overview" && <OverviewTab participantId={participant.id} subjects={owned} onNavigate={setTab} />}
        {tab === "flags" && <FlagsTab participantId={participant.id} subjects={owned} />}
        {tab === "reviews" && <ReviewsTab participantId={participant.id} />}
        {tab === "advisors" && <AdvisorsTab participantId={participant.id} />}
      </div>
    </section>
  );
}

function TabBar({ tab, onChange }: { tab: TabKey; onChange: (t: TabKey) => void }) {
  return (
    <div role="tablist" aria-label="Institutional Coordination sections" className="flex flex-wrap gap-lg border-b border-[color:var(--color-border-default)]">
      {TABS.map((t) => {
        const active = t.key === tab;
        return (
          <button
            key={t.key}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(t.key)}
            className={
              "pb-2 text-xs uppercase tracking-widest transition-colors " +
              (active
                ? "border-b-2 border-bindu-gold text-kosha-navy"
                : "border-b-2 border-transparent text-slate-grey hover:text-kosha-navy")
            }
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

/* ================= Hooks ================= */

function useFlags(participantId: string) {
  const [items, setItems] = useState<Flag[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("cross_domain_flags").select("*")
      .eq("owner_participant_id", participantId)
      .order("raised_at", { ascending: false });
    setItems((data ?? []) as Flag[]);
    setLoading(false);
  }, [participantId]);
  useEffect(() => { refresh(); }, [refresh]);
  return { items, loading, refresh };
}

function useReviews(participantId: string) {
  const [items, setItems] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("coherence_reviews").select("*")
      .eq("owner_participant_id", participantId)
      .order("reviewed_at", { ascending: false });
    setItems((data ?? []) as Review[]);
    setLoading(false);
  }, [participantId]);
  useEffect(() => { refresh(); }, [refresh]);
  return { items, loading, refresh };
}

function useAdvisors(participantId: string) {
  const [items, setItems] = useState<Advisor[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("professional_advisors").select("*")
      .eq("owner_participant_id", participantId)
      .order("created_at", { ascending: true });
    setItems((data ?? []) as Advisor[]);
    setLoading(false);
  }, [participantId]);
  useEffect(() => { refresh(); }, [refresh]);
  return { items, loading, refresh };
}

/* ================= Overview ================= */

function OverviewTab({ participantId, subjects, onNavigate }: {
  participantId: string; subjects: ContinuitySubject[]; onNavigate: (t: TabKey) => void;
}) {
  const { items: flags } = useFlags(participantId);
  const { items: reviews, refresh: refreshReviews } = useReviews(participantId);
  const [recording, setRecording] = useState(false);

  const activeFlags = flags.filter((f) => f.status === "Active").length;
  const lastReview = reviews[0]?.reviewed_at ?? null;

  const state: { label: string; tone: "navy" | "slate" } = useMemo(() => {
    if (activeFlags >= 2) return { label: "Fragmented", tone: "slate" };
    if (activeFlags === 1) return { label: "Flagged", tone: "slate" };
    if (reviews.length > 0) return { label: "Coherent", tone: "navy" };
    return { label: "Monitoring", tone: "slate" };
  }, [activeFlags, reviews.length]);

  const counts: Record<SubjectType, number> = {
    Estate: 0, Family: 0, Enterprise: 0, Trust: 0, "Digital Legacy": 0,
  };
  for (const s of subjects) counts[s.subject_type] += 1;

  return (
    <div className="space-y-xl">
      <header>
        <h2 className="font-display text-[28px] leading-[36px] text-kosha-navy">Institutional Coherence</h2>
        <p className="mt-xs max-w-[48rem] text-sm text-slate-grey">
          A read-only view across your Estate, Family, Enterprise, and Trust workspaces. Institutional
          Coordination never writes into another domain — resolution always belongs to that domain's own Steward.
        </p>
        <div className="mt-md flex flex-wrap items-center gap-md">
          <span
            className={
              "inline-flex items-center rounded-md px-md py-1 text-xs uppercase tracking-widest " +
              (state.tone === "navy"
                ? "bg-kosha-navy text-vault-ivory"
                : "bg-vault-ivory text-slate-grey ring-1 ring-[color:var(--color-border-default)]")
            }
          >
            {state.label}
          </span>
          <span className="text-xs text-slate-grey">
            {lastReview
              ? <>Last reviewed <span className="font-numeral">{formatEnInDate(lastReview)}</span></>
              : "Never reviewed"}
          </span>
        </div>
      </header>

      <div>
        <div className="text-xs uppercase tracking-widest text-slate-grey">What you steward</div>
        <div className="mt-sm grid grid-cols-2 gap-md sm:grid-cols-3 lg:grid-cols-4">
          {(Object.keys(counts) as SubjectType[])
            .filter((k) => counts[k] > 0)
            .map((k) => (
              <div key={k} className="rounded-md bg-pure-white p-md shadow-[var(--shadow-1)] ring-1 ring-[color:var(--color-border-default)]">
                <div className="text-xs uppercase tracking-widest text-slate-grey">{k === "Digital Legacy" ? "Digital Legacies" : `${k}s`}</div>
                <div className="mt-xs font-numeral text-[28px] leading-[36px] text-kosha-navy">{counts[k]}</div>
              </div>
            ))}
          <div className="rounded-md bg-pure-white p-md shadow-[var(--shadow-1)] ring-1 ring-[color:var(--color-border-default)]">
            <div className="text-xs uppercase tracking-widest text-slate-grey">Active flags</div>
            <div className="mt-xs font-numeral text-[28px] leading-[36px] text-kosha-navy">{activeFlags}</div>
            {activeFlags > 0 && (
              <button
                type="button"
                onClick={() => onNavigate("flags")}
                className="mt-xs block text-left text-xs text-slate-grey underline underline-offset-2 hover:text-kosha-navy"
              >
                Review flags
              </button>
            )}
          </div>
        </div>
      </div>

      <div>
        <div className="text-xs uppercase tracking-widest text-slate-grey">Subjects</div>
        <ul className="mt-sm space-y-xs">
          {subjects.map((s) => (
            <SubjectRow key={s.id} subject={s} />
          ))}
        </ul>
      </div>

      <div className="rounded-md bg-pure-white p-lg shadow-[var(--shadow-1)] ring-1 ring-[color:var(--color-border-default)]">
        <div className="flex flex-wrap items-center justify-between gap-md">
          <div>
            <div className="font-display text-[20px] leading-[28px] text-kosha-navy">Coherence Review</div>
            <p className="mt-xs text-sm text-slate-grey">
              Record that you have confirmed what is current across every workspace. This does not
              change anything in the concerned domains.
            </p>
          </div>
          {!recording && (
            <button
              type="button"
              onClick={() => setRecording(true)}
              className="rounded-md bg-kosha-navy px-md py-2 text-sm font-semibold text-vault-ivory hover:bg-kosha-navy/90"
            >
              Record Coherence Review
            </button>
          )}
        </div>
        {recording && (
          <ReviewForm
            participantId={participantId}
            onCancel={() => setRecording(false)}
            onCreated={async () => { setRecording(false); await refreshReviews(); }}
          />
        )}
      </div>
    </div>
  );
}

function SubjectRow({ subject }: { subject: ContinuitySubject }) {
  const path = DOMAIN_PATH[subject.subject_type];
  const [fact, setFact] = useState<string>("—");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let text = "—";
      try {
        if (subject.subject_type === "Estate") {
          const { data } = await supabase.from("wills").select("status").eq("estate_id", subject.id).maybeSingle();
          text = data ? `Will · ${data.status}` : "No Will recorded";
        } else if (subject.subject_type === "Family") {
          const { count } = await supabase.from("family_members").select("id", { count: "exact", head: true }).eq("family_id", subject.id);
          text = `${count ?? 0} Member${(count ?? 0) === 1 ? "" : "s"}`;
        } else if (subject.subject_type === "Enterprise") {
          const { count } = await supabase.from("successors").select("id", { count: "exact", head: true }).eq("enterprise_id", subject.id);
          text = `${count ?? 0} Successor${(count ?? 0) === 1 ? "" : "s"}`;
        } else if (subject.subject_type === "Trust") {
          const { count } = await supabase.from("trustees").select("id", { count: "exact", head: true }).eq("trust_id", subject.id);
          text = `${count ?? 0} Trustee${(count ?? 0) === 1 ? "" : "s"}`;
        } else {
          text = "Digital Legacy";
        }
      } catch { /* keep dash */ }
      if (!cancelled) setFact(text);
    })();
    return () => { cancelled = true; };
  }, [subject.id, subject.subject_type]);

  return (
    <li className="flex flex-wrap items-center justify-between gap-sm rounded-md bg-pure-white px-md py-3 ring-1 ring-[color:var(--color-border-default)]">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-kosha-navy">{subject.name}</div>
        <div className="text-xs text-slate-grey">
          <span className="uppercase tracking-widest">{subject.subject_type}</span>
          <span className="mx-xs">·</span>
          <span>{fact}</span>
        </div>
      </div>
      {path && (
        <Link to={path} className="text-xs text-kosha-navy underline underline-offset-2 hover:opacity-80">
          Open workspace →
        </Link>
      )}
    </li>
  );
}

/* ================= Flags ================= */

function FlagsTab({ participantId, subjects }: { participantId: string; subjects: ContinuitySubject[] }) {
  const { items, refresh } = useFlags(participantId);
  const [filter, setFilter] = useState<"all" | FlagStatus>("all");
  const [creating, setCreating] = useState(false);
  const [resolving, setResolving] = useState<string | null>(null);

  const shown = items.filter((f) => filter === "all" || f.status === filter);

  return (
    <div className="space-y-lg">
      <div className="flex flex-wrap items-center justify-between gap-md">
        <div role="tablist" aria-label="Filter flags" className="inline-flex rounded-md ring-1 ring-[color:var(--color-border-default)] overflow-hidden text-xs">
          {(["all", "Active", "Resolved"] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={filter === k}
              onClick={() => setFilter(k)}
              className={"px-md py-2 uppercase tracking-widest " + (filter === k ? "bg-kosha-navy text-vault-ivory" : "bg-pure-white text-slate-grey hover:text-kosha-navy")}
            >
              {k === "all" ? "All" : k}
            </button>
          ))}
        </div>
        {!creating && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="rounded-md bg-kosha-navy px-md py-2 text-sm font-semibold text-vault-ivory hover:bg-kosha-navy/90"
          >
            Raise Cross-Domain Flag
          </button>
        )}
      </div>

      {creating && (
        <FlagForm
          participantId={participantId}
          subjects={subjects}
          onCancel={() => setCreating(false)}
          onCreated={async () => { setCreating(false); await refresh(); }}
        />
      )}

      {shown.length === 0 ? (
        <p className="text-sm text-slate-grey">No Cross-Domain Flags to show.</p>
      ) : (
        <ul className="space-y-sm">
          {shown.map((f) => {
            const subject = subjects.find((s) => s.id === f.related_subject_id) ?? null;
            const path = subject ? DOMAIN_PATH[subject.subject_type] : null;
            return (
              <li key={f.id} className="rounded-md bg-pure-white p-md ring-1 ring-[color:var(--color-border-default)]">
                <div className="flex flex-wrap items-start justify-between gap-md">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-sm">
                      <span className="text-sm font-semibold text-kosha-navy">{f.title}</span>
                      <span
                        className={
                          "inline-flex items-center rounded px-2 py-0.5 text-[10px] uppercase tracking-widest " +
                          (f.status === "Active"
                            ? "bg-vault-ivory text-slate-grey ring-1 ring-[color:var(--color-border-default)]"
                            : "bg-kosha-navy text-vault-ivory")
                        }
                      >
                        {f.status}
                      </span>
                    </div>
                    {f.description && <p className="mt-xs text-sm text-slate-grey">{f.description}</p>}
                    <div className="mt-xs text-xs text-slate-grey">
                      Raised <span className="font-numeral">{formatEnInDate(f.raised_at)}</span>
                      {subject && (
                        <>
                          <span className="mx-xs">·</span>
                          Concerns{" "}
                          {path ? (
                            <Link to={path} className="text-kosha-navy underline underline-offset-2">
                              {subject.name} ({subject.subject_type})
                            </Link>
                          ) : (
                            <span>{subject.name} ({subject.subject_type})</span>
                          )}
                        </>
                      )}
                    </div>
                    {f.status === "Resolved" && f.resolved_at && (
                      <p className="mt-xs text-xs text-slate-grey">
                        Resolved <span className="font-numeral">{formatEnInDate(f.resolved_at)}</span>
                        {f.resolution_note ? ` · ${f.resolution_note}` : ""}
                      </p>
                    )}
                  </div>
                  {f.status === "Active" && resolving !== f.id && (
                    <button
                      type="button"
                      onClick={() => setResolving(f.id)}
                      className="rounded-md bg-vault-ivory px-md py-2 text-xs font-semibold text-kosha-navy ring-1 ring-[color:var(--color-border-default)] hover:bg-pure-white"
                    >
                      Mark Resolved
                    </button>
                  )}
                </div>

                {resolving === f.id && (
                  <ResolveFlagForm
                    flagId={f.id}
                    onCancel={() => setResolving(null)}
                    onResolved={async () => { setResolving(null); await refresh(); }}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function FlagForm({ participantId, subjects, onCancel, onCreated }: {
  participantId: string; subjects: ContinuitySubject[]; onCancel: () => void; onCreated: () => void | Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subjectId, setSubjectId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!title.trim()) { setErr("A short title is required."); return; }
        setSaving(true); setErr(null);
        const { error } = await supabase.from("cross_domain_flags").insert({
          owner_participant_id: participantId,
          title: title.trim(),
          description: description.trim() || null,
          related_subject_id: subjectId || null,
        });
        setSaving(false);
        if (error) setErr(error.message); else await onCreated();
      }}
      className="rounded-md bg-pure-white p-md ring-1 ring-[color:var(--color-border-default)] space-y-sm"
    >
      <FieldLabel label="Title">
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="Short description" />
      </FieldLabel>
      <FieldLabel label="Description">
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputCls} placeholder="What appears inconsistent, and why it matters." />
      </FieldLabel>
      <FieldLabel label="Concerns (optional)">
        <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className={inputCls}>
          <option value="">— None —</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>{s.name} · {s.subject_type}</option>
          ))}
        </select>
      </FieldLabel>
      {err && <p className="text-xs text-slate-grey">{err}</p>}
      <div className="flex gap-sm">
        <button type="submit" disabled={saving} className="rounded-md bg-kosha-navy px-md py-2 text-sm font-semibold text-vault-ivory hover:bg-kosha-navy/90 disabled:opacity-60">
          {saving ? "Saving…" : "Raise Flag"}
        </button>
        <button type="button" onClick={onCancel} className="rounded-md px-md py-2 text-sm text-slate-grey hover:text-kosha-navy">Cancel</button>
      </div>
    </form>
  );
}

function ResolveFlagForm({ flagId, onCancel, onResolved }: {
  flagId: string; onCancel: () => void; onResolved: () => void | Promise<void>;
}) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true); setErr(null);
        const { error } = await supabase.from("cross_domain_flags").update({
          status: "Resolved",
          resolved_at: new Date().toISOString(),
          resolution_note: note.trim() || null,
        }).eq("id", flagId);
        setSaving(false);
        if (error) setErr(error.message); else await onResolved();
      }}
      className="mt-md rounded-md bg-vault-ivory p-md ring-1 ring-[color:var(--color-border-default)] space-y-sm"
    >
      <p className="text-xs text-slate-grey">
        This records that the matter was addressed in its own domain — Institutional Coordination never resolves a Flag itself.
      </p>
      <FieldLabel label="Resolution note (optional)">
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={inputCls} placeholder="How it was addressed, and where." />
      </FieldLabel>
      {err && <p className="text-xs text-slate-grey">{err}</p>}
      <div className="flex gap-sm">
        <button type="submit" disabled={saving} className="rounded-md bg-kosha-navy px-md py-2 text-sm font-semibold text-vault-ivory hover:bg-kosha-navy/90 disabled:opacity-60">
          {saving ? "Saving…" : "Mark Resolved"}
        </button>
        <button type="button" onClick={onCancel} className="rounded-md px-md py-2 text-sm text-slate-grey hover:text-kosha-navy">Cancel</button>
      </div>
    </form>
  );
}

/* ================= Reviews ================= */

function ReviewsTab({ participantId }: { participantId: string }) {
  const { items, refresh } = useReviews(participantId);
  const [recording, setRecording] = useState(false);
  return (
    <div className="space-y-lg">
      <div className="flex flex-wrap items-center justify-between gap-md">
        <p className="text-sm text-slate-grey">
          {items.length === 0
            ? "No Coherence Reviews recorded yet."
            : `${items.length} Coherence Review${items.length === 1 ? "" : "s"} recorded.`}
        </p>
        {!recording && (
          <button
            type="button"
            onClick={() => setRecording(true)}
            className="rounded-md bg-kosha-navy px-md py-2 text-sm font-semibold text-vault-ivory hover:bg-kosha-navy/90"
          >
            Record Coherence Review
          </button>
        )}
      </div>
      {recording && (
        <ReviewForm
          participantId={participantId}
          onCancel={() => setRecording(false)}
          onCreated={async () => { setRecording(false); await refresh(); }}
        />
      )}
      {items.length > 0 && (
        <ul className="space-y-xs">
          {items.map((r) => (
            <li key={r.id} className="rounded-md bg-pure-white p-md ring-1 ring-[color:var(--color-border-default)]">
              <div className="text-xs uppercase tracking-widest text-slate-grey">Reviewed</div>
              <div className="mt-xs font-numeral text-sm text-kosha-navy">{formatEnInDate(r.reviewed_at)}</div>
              {r.note && <p className="mt-xs text-sm text-slate-grey">{r.note}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ReviewForm({ participantId, onCancel, onCreated }: {
  participantId: string; onCancel: () => void; onCreated: () => void | Promise<void>;
}) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true); setErr(null);
        const { error } = await supabase.from("coherence_reviews").insert({
          owner_participant_id: participantId,
          note: note.trim() || null,
        });
        setSaving(false);
        if (error) setErr(error.message); else await onCreated();
      }}
      className="mt-md rounded-md bg-vault-ivory p-md ring-1 ring-[color:var(--color-border-default)] space-y-sm"
    >
      <FieldLabel label="Note (optional)">
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className={inputCls} placeholder="What you confirmed as current across your workspaces." />
      </FieldLabel>
      {err && <p className="text-xs text-slate-grey">{err}</p>}
      <div className="flex gap-sm">
        <button type="submit" disabled={saving} className="rounded-md bg-kosha-navy px-md py-2 text-sm font-semibold text-vault-ivory hover:bg-kosha-navy/90 disabled:opacity-60">
          {saving ? "Saving…" : "Record Review"}
        </button>
        <button type="button" onClick={onCancel} className="rounded-md px-md py-2 text-sm text-slate-grey hover:text-kosha-navy">Cancel</button>
      </div>
    </form>
  );
}

/* ================= Advisors ================= */

function AdvisorsTab({ participantId }: { participantId: string }) {
  const { items, refresh } = useAdvisors(participantId);
  const [creating, setCreating] = useState(false);
  return (
    <div className="space-y-lg">
      <div className="flex flex-wrap items-center justify-between gap-md">
        <p className="text-sm text-slate-grey">
          {items.length === 0
            ? "No Professional Advisors recorded yet."
            : `${items.length} Professional Advisor${items.length === 1 ? "" : "s"} on record.`}
        </p>
        {!creating && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="rounded-md bg-kosha-navy px-md py-2 text-sm font-semibold text-vault-ivory hover:bg-kosha-navy/90"
          >
            Add Professional Advisor
          </button>
        )}
      </div>
      {creating && (
        <AdvisorForm
          participantId={participantId}
          onCancel={() => setCreating(false)}
          onCreated={async () => { setCreating(false); await refresh(); }}
        />
      )}
      {items.length > 0 && (
        <ul className="space-y-xs">
          {items.map((a) => (
            <li key={a.id} className="rounded-md bg-pure-white p-md ring-1 ring-[color:var(--color-border-default)]">
              <div className="flex flex-wrap items-baseline justify-between gap-sm">
                <div className="text-sm font-semibold text-kosha-navy">{a.full_name}</div>
                {a.specialty && <div className="text-xs uppercase tracking-widest text-slate-grey">{a.specialty}</div>}
              </div>
              {a.contact_note && <p className="mt-xs text-sm text-slate-grey">{a.contact_note}</p>}
              {a.notes && <p className="mt-xs text-xs text-slate-grey">{a.notes}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AdvisorForm({ participantId, onCancel, onCreated }: {
  participantId: string; onCancel: () => void; onCreated: () => void | Promise<void>;
}) {
  const [fullName, setFullName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [contact, setContact] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!fullName.trim()) { setErr("Name is required."); return; }
        setSaving(true); setErr(null);
        const { error } = await supabase.from("professional_advisors").insert({
          owner_participant_id: participantId,
          full_name: fullName.trim(),
          specialty: specialty.trim() || null,
          contact_note: contact.trim() || null,
          notes: notes.trim() || null,
        });
        setSaving(false);
        if (error) setErr(error.message); else await onCreated();
      }}
      className="rounded-md bg-pure-white p-md ring-1 ring-[color:var(--color-border-default)] space-y-sm"
    >
      <FieldLabel label="Full name">
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} />
      </FieldLabel>
      <FieldLabel label="Specialty">
        <input value={specialty} onChange={(e) => setSpecialty(e.target.value)} className={inputCls} placeholder="e.g. Tax Advisor, Investment Manager, Legal Counsel" />
      </FieldLabel>
      <FieldLabel label="Contact note">
        <input value={contact} onChange={(e) => setContact(e.target.value)} className={inputCls} placeholder="Firm, phone, or email — a note, not a directory." />
      </FieldLabel>
      <FieldLabel label="Notes">
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputCls} />
      </FieldLabel>
      {err && <p className="text-xs text-slate-grey">{err}</p>}
      <div className="flex gap-sm">
        <button type="submit" disabled={saving} className="rounded-md bg-kosha-navy px-md py-2 text-sm font-semibold text-vault-ivory hover:bg-kosha-navy/90 disabled:opacity-60">
          {saving ? "Saving…" : "Add Advisor"}
        </button>
        <button type="button" onClick={onCancel} className="rounded-md px-md py-2 text-sm text-slate-grey hover:text-kosha-navy">Cancel</button>
      </div>
    </form>
  );
}

/* ================= Shared bits ================= */

const inputCls =
  "mt-xs w-full rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-md py-2 text-sm text-kosha-navy focus:outline-none focus:ring-2 focus:ring-bindu-gold focus:ring-offset-2";

function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-slate-grey">{label}</span>
      {children}
    </label>
  );
}