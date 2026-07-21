import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useParticipant } from "@/lib/participant";
import { LinkParticipant } from "@/components/access/LinkParticipant";
import { requestMemoryRetirement, useHasPendingRequest } from "@/lib/access-grants";
import { WorkspaceIntro } from "@/components/shell/WorkspaceIntro";
import { humanizeState, stateTitle } from "@/lib/state-labels";

/* =============== Types =============== */

type OriginatingDomain =
  | "Estate Planning"
  | "Family Governance"
  | "Business Succession"
  | "Trust Administration"
  | "Philanthropy"
  | "Digital Legacy"
  | "Cross-Domain / Other";
const ORIGINATING_DOMAINS: OriginatingDomain[] = [
  "Estate Planning",
  "Family Governance",
  "Business Succession",
  "Trust Administration",
  "Philanthropy",
  "Digital Legacy",
  "Cross-Domain / Other",
];

type Confidence =
  | "Verified Memory"
  | "Reported Memory"
  | "Inferred Memory"
  | "Unknown Memory";
const CONFIDENCE_LEVELS: Confidence[] = [
  "Verified Memory",
  "Reported Memory",
  "Inferred Memory",
  "Unknown Memory",
];

type Applicability = "Still Applies" | "No Longer Applies";

type ConcernType = "Fossilization" | "Selective Memory" | "Other";
const CONCERN_TYPES: ConcernType[] = ["Fossilization", "Selective Memory", "Other"];
type ConcernStatus = "Active" | "Resolved";

type KnowledgeSteward = {
  id: string;
  owner_participant_id: string;
  full_name: string;
  source_of_authority_note: string | null;
  notes: string | null;
  linked_participant_id: string | null;
  created_at: string;
};

type MemoryRecord = {
  id: string;
  owner_participant_id: string;
  title: string;
  originating_domain: OriginatingDomain;
  originating_steward_note: string | null;
  decision_summary: string;
  rationale_text: string | null;
  alternatives_considered: string | null;
  confidence_classification: Confidence | null;
  applicability_signal: Applicability;
  retired_at: string | null;
  created_at: string;
  updated_at: string;
};

type Retrieval = {
  id: string;
  institutional_memory_record_id: string;
  retrieved_at: string;
  note: string | null;
};

type Review = {
  id: string;
  institutional_memory_record_id: string;
  reviewed_at: string;
  finding: Applicability;
  note: string | null;
};

type Concern = {
  id: string;
  institutional_memory_record_id: string;
  concern_type: ConcernType;
  description: string;
  status: ConcernStatus;
  raised_at: string;
  resolved_at: string | null;
  resolution_note: string | null;
};

type TabKey = "overview" | "retrievals" | "reviews" | "concerns";
const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "retrievals", label: "Retrievals" },
  { key: "reviews", label: "Reviews" },
  { key: "concerns", label: "Concerns" },
];

/* =============== Styles =============== */

const inputCls =
  "mt-xs w-full rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-md py-2 text-sm text-kosha-navy";
const labelCls = "text-xs uppercase tracking-widest text-slate-grey";
const primaryBtn =
  "rounded-md bg-kosha-navy px-md py-2 text-sm font-semibold text-vault-ivory hover:bg-kosha-navy/90 disabled:opacity-40";
const secondaryBtn =
  "rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-md py-2 text-sm font-semibold text-kosha-navy hover:bg-vault-ivory";
const cardCls =
  "rounded-md bg-pure-white p-md shadow-[var(--shadow-1)] ring-1 ring-[color:var(--color-border-default)]";

import { formatDate } from "@/lib/format";

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded px-2 py-0.5 text-[10px] uppercase tracking-widest bg-vault-ivory text-slate-grey ring-1 ring-[color:var(--color-border-default)]">
      {children}
    </span>
  );
}

/* =============== Hooks =============== */

function useStewards(participantId: string | null) {
  const [items, setItems] = useState<KnowledgeSteward[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    if (!participantId) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("knowledge_stewards").select("*")
      .eq("owner_participant_id", participantId)
      .order("created_at", { ascending: true });
    setItems((data ?? []) as KnowledgeSteward[]);
    setLoading(false);
  }, [participantId]);
  useEffect(() => { refresh(); }, [refresh]);
  return { items, loading, refresh };
}

function useRecords(participantId: string | null) {
  const [items, setItems] = useState<MemoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    if (!participantId) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("institutional_memory_records").select("*")
      .eq("owner_participant_id", participantId)
      .order("created_at", { ascending: true });
    setItems((data ?? []) as MemoryRecord[]);
    setLoading(false);
  }, [participantId]);
  useEffect(() => { refresh(); }, [refresh]);
  return { items, loading, refresh };
}

function useRetrievals(recordId: string | null) {
  const [items, setItems] = useState<Retrieval[]>([]);
  const refresh = useCallback(async () => {
    if (!recordId) { setItems([]); return; }
    const { data } = await supabase
      .from("memory_retrievals").select("*")
      .eq("institutional_memory_record_id", recordId)
      .order("retrieved_at", { ascending: false });
    setItems((data ?? []) as Retrieval[]);
  }, [recordId]);
  useEffect(() => { refresh(); }, [refresh]);
  return { items, refresh };
}

function useReviews(recordId: string | null) {
  const [items, setItems] = useState<Review[]>([]);
  const refresh = useCallback(async () => {
    if (!recordId) { setItems([]); return; }
    const { data } = await supabase
      .from("memory_reviews").select("*")
      .eq("institutional_memory_record_id", recordId)
      .order("reviewed_at", { ascending: false });
    setItems((data ?? []) as Review[]);
  }, [recordId]);
  useEffect(() => { refresh(); }, [refresh]);
  return { items, refresh };
}

function useConcerns(recordId: string | null) {
  const [items, setItems] = useState<Concern[]>([]);
  const refresh = useCallback(async () => {
    if (!recordId) { setItems([]); return; }
    const { data } = await supabase
      .from("memory_concerns").select("*")
      .eq("institutional_memory_record_id", recordId)
      .order("raised_at", { ascending: false });
    setItems((data ?? []) as Concern[]);
  }, [recordId]);
  useEffect(() => { refresh(); }, [refresh]);
  return { items, refresh };
}

function isCurated(r: MemoryRecord): boolean {
  return !!(r.rationale_text && r.confidence_classification);
}

/* =============== Root =============== */

export function InstitutionalMemoryPage() {
  const { participant } = useParticipant();
  const stewards = useStewards(participant?.id ?? null);
  const records = useRecords(participant?.id ?? null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [tab, setTab] = useState<TabKey>("overview");

  useEffect(() => {
    if (records.items.length === 0) { setSelectedId(null); return; }
    setSelectedId((prev) => (prev && records.items.some((r) => r.id === prev) ? prev : null));
  }, [records.items]);

  const record = records.items.find((r) => r.id === selectedId) ?? null;

  if (!participant || records.loading || stewards.loading) {
    return (
      <section aria-busy="true" className="max-w-[64rem]">
        <div className="inline-flex items-center gap-sm text-sm text-slate-grey">
          <span className="h-2 w-2 rounded-full bg-slate-grey animate-pulse" aria-hidden />
          Loading Institutional Memory…
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-[72rem] space-y-xl">
      <WorkspaceIntro slug="memory" />
      <StewardsSection
        participantId={participant.id}
        items={stewards.items}
        onChanged={stewards.refresh}
      />

      <div className="space-y-lg">
        <div className="flex flex-wrap items-center justify-between gap-md">
          <h2 className="font-display text-[20px] leading-[28px] text-kosha-navy">
            Institutional Memory Records
          </h2>
          {!creating && records.items.length > 0 && (
            <button type="button" onClick={() => setCreating(true)} className={secondaryBtn}>
              Recognize Candidate Memory
            </button>
          )}
        </div>

        {records.items.length === 0 && !creating && (
          <div className={cardCls}>
            <p className="text-sm text-slate-grey">
              Institutional Memory preserves not just what was decided, but why — so whoever
              stewards this institution next inherits the judgment, not only the outcome.
              Recognize your first record to begin.
            </p>
            <button type="button" onClick={() => setCreating(true)} className={"mt-md " + primaryBtn}>
              Recognize Candidate Memory
            </button>
          </div>
        )}

        {creating && (
          <RecognizeForm
            participantId={participant.id}
            onCancel={() => setCreating(false)}
            onCreated={async (id) => { setCreating(false); await records.refresh(); setSelectedId(id); }}
          />
        )}

        {records.items.length > 0 && !record && (
          <div className={cardCls}>
            <h3 className="font-display text-[20px] leading-[28px] text-kosha-navy">
              Choose a record
            </h3>
            <p className="mt-xs text-sm text-slate-grey">
              Pick an Institutional Memory Record to open its workspace.
            </p>
            <ul className="mt-md space-y-xs">
              {records.items.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(r.id)}
                    className="flex w-full flex-wrap items-center justify-between gap-sm rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-md py-3 text-left text-sm text-kosha-navy hover:bg-vault-ivory"
                  >
                    <span className="font-semibold">{r.title}</span>
                    <span className="flex items-center gap-xs">
                      <Badge>{r.originating_domain}</Badge>
                      <span title={stateTitle(isCurated(r) ? "Curated Memory" : "Emerging Memory")}>
                        <Badge>
                          {humanizeState(isCurated(r) ? "Curated Memory" : "Emerging Memory").label}
                        </Badge>
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {record && (
          <div className="space-y-lg">
            {records.items.length > 1 && (
              <div className="flex flex-wrap items-center gap-sm">
                <span className={labelCls}>Record</span>
                <select
                  value={record.id}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className="rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-md py-1 text-sm text-kosha-navy"
                >
                  {records.items.map((r) => (
                    <option key={r.id} value={r.id}>{r.title}</option>
                  ))}
                </select>
              </div>
            )}

            <TabBar tab={tab} onChange={setTab} />
            <div>
              {tab === "overview" && <OverviewTab record={record} onRefresh={records.refresh} />}
              {tab === "retrievals" && <RetrievalsTab record={record} />}
              {tab === "reviews" && <ReviewsTab record={record} onRefresh={records.refresh} />}
              {tab === "concerns" && <ConcernsTab record={record} />}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function TabBar({ tab, onChange }: { tab: TabKey; onChange: (t: TabKey) => void }) {
  return (
    <div role="tablist" aria-label="Institutional Memory sections" className="flex flex-wrap gap-lg border-b border-[color:var(--color-border-default)]">
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

/* =============== Knowledge Stewards =============== */

function StewardsSection({
  participantId, items, onChanged,
}: { participantId: string; items: KnowledgeSteward[]; onChanged: () => Promise<void> | void }) {
  const [creating, setCreating] = useState(false);
  const [fullName, setFullName] = useState("");
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) { setMessage("A full name is required."); return; }
    setBusy(true);
    const { error } = await supabase.from("knowledge_stewards").insert({
      owner_participant_id: participantId,
      full_name: fullName.trim(),
      source_of_authority_note: source.trim() || null,
      notes: notes.trim() || null,
    });
    setBusy(false);
    if (error) { setMessage("Could not save this Knowledge Steward. Please try again."); return; }
    setFullName(""); setSource(""); setNotes(""); setCreating(false); setMessage(null);
    await onChanged();
  }

  return (
    <div className="space-y-md">
      <div className="flex flex-wrap items-center justify-between gap-md">
        <div>
          <h2 className="font-display text-[20px] leading-[28px] text-kosha-navy">Knowledge Stewards</h2>
          <p className="mt-xs max-w-[52rem] text-sm text-slate-grey">
            A Knowledge Steward's curatorial standing spans whichever decisions and domains are
            judged significant — not any single record.
          </p>
        </div>
        {!creating && (
          <button type="button" onClick={() => setCreating(true)} className={secondaryBtn}>
            Add Knowledge Steward
          </button>
        )}
      </div>

      {creating && (
        <form onSubmit={submit} className={cardCls + " space-y-md"}>
          <div><label className={labelCls}>Full name</label><input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Source of authority (optional)</label><input value={source} onChange={(e) => setSource(e.target.value)} className={inputCls} placeholder="e.g. Named in the family charter" /></div>
          <div><label className={labelCls}>Notes (optional)</label><textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} /></div>
          {message && <p className="text-sm text-slate-grey">{message}</p>}
          <div className="flex items-center gap-sm">
            <button type="submit" disabled={busy} className={primaryBtn}>{busy ? "Saving…" : "Save Knowledge Steward"}</button>
            <button type="button" onClick={() => setCreating(false)} className={secondaryBtn}>Cancel</button>
          </div>
        </form>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-slate-grey">No Knowledge Steward recorded yet.</p>
      ) : (
        <ul className="space-y-xs">
          {items.map((s) => (
            <li key={s.id} className={cardCls}>
              <div className="text-sm font-semibold text-kosha-navy">{s.full_name}</div>
              {s.source_of_authority_note && <div className="mt-xs text-xs text-slate-grey">Source of authority · {s.source_of_authority_note}</div>}
              {s.notes && <p className="mt-xs text-sm text-slate-grey">{s.notes}</p>}
              <LinkParticipant
                table="knowledge_stewards"
                rowId={s.id}
                linkedParticipantId={s.linked_participant_id}
                onChanged={onChanged}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* =============== Recognize form =============== */

function RecognizeForm({
  participantId, onCancel, onCreated,
}: { participantId: string; onCancel: () => void; onCreated: (id: string) => void | Promise<void> }) {
  const [title, setTitle] = useState("");
  const [domain, setDomain] = useState<OriginatingDomain>("Cross-Domain / Other");
  const [stewardNote, setStewardNote] = useState("");
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setMessage("A title is required."); return; }
    if (!summary.trim()) { setMessage("A decision summary is required."); return; }
    setBusy(true);
    const { data, error } = await supabase.from("institutional_memory_records").insert({
      owner_participant_id: participantId,
      title: title.trim(),
      originating_domain: domain,
      originating_steward_note: stewardNote.trim() || null,
      decision_summary: summary.trim(),
    }).select("id").single();
    setBusy(false);
    if (error || !data) { setMessage("Could not recognize this record. Please try again."); return; }
    await onCreated(data.id);
  }

  return (
    <form onSubmit={submit} className={cardCls + " space-y-md"}>
      <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
        <div>
          <label className={labelCls} htmlFor="mem-title">Title</label>
          <input id="mem-title" value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="A short label — freely editable later" />
        </div>
        <div>
          <label className={labelCls} htmlFor="mem-domain">Originating domain</label>
          <select id="mem-domain" value={domain} onChange={(e) => setDomain(e.target.value as OriginatingDomain)} className={inputCls}>
            {ORIGINATING_DOMAINS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className={labelCls} htmlFor="mem-steward">Originating steward (optional)</label>
        <input id="mem-steward" value={stewardNote} onChange={(e) => setStewardNote(e.target.value)} className={inputCls} placeholder="e.g. Grandfather, as recounted by Mother" />
        <p className="mt-xs text-xs text-slate-grey">Descriptive only — this is not linked to another domain's Participant record.</p>
      </div>
      <div>
        <label className={labelCls} htmlFor="mem-summary">Decision summary</label>
        <textarea id="mem-summary" rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} className={inputCls} placeholder="What was decided." />
        <p className="mt-xs text-xs text-slate-grey">
          The rationale — the why — is added during Curation, on the record's own workspace.
          Until then this record is Emerging Memory.
        </p>
      </div>
      {message && <p className="text-sm text-slate-grey">{message}</p>}
      <div className="flex items-center gap-sm">
        <button type="submit" disabled={busy} className={primaryBtn}>{busy ? "Saving…" : "Recognize"}</button>
        <button type="button" onClick={onCancel} className={secondaryBtn}>Cancel</button>
      </div>
    </form>
  );
}

/* =============== Overview =============== */

function OverviewTab({ record, onRefresh }: { record: MemoryRecord; onRefresh: () => Promise<void> | void }) {
  const { items: retrievals } = useRetrievals(record.id);
  const { items: concerns } = useConcerns(record.id);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(record.title);
  useEffect(() => { setTitleDraft(record.title); }, [record.id, record.title]);
  const [busy, setBusy] = useState(false);

  async function saveTitle() {
    if (!titleDraft.trim()) return;
    setBusy(true);
    await supabase.from("institutional_memory_records").update({ title: titleDraft.trim() }).eq("id", record.id);
    setBusy(false); setEditingTitle(false);
    await onRefresh();
  }

  const curated = isCurated(record);
  const lastRetrievedAt = retrievals[0]?.retrieved_at ?? null;
  const activeConcerns = concerns.filter((c) => c.status === "Active").length;

  return (
    <div className="space-y-xl">
      <header>
        {!editingTitle ? (
          <div className="flex flex-wrap items-center gap-sm">
            <h2 className="font-display text-[28px] leading-[36px] text-kosha-navy">{record.title}</h2>
            <button type="button" onClick={() => setEditingTitle(true)} className="rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-sm py-1 text-xs font-semibold text-kosha-navy hover:bg-vault-ivory">
              Edit title
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-sm">
            <input value={titleDraft} onChange={(e) => setTitleDraft(e.target.value)} className="rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-md py-2 text-lg text-kosha-navy" />
            <button type="button" disabled={busy} onClick={saveTitle} className={primaryBtn}>{busy ? "Saving…" : "Save"}</button>
            <button type="button" onClick={() => { setEditingTitle(false); setTitleDraft(record.title); }} className={secondaryBtn}>Cancel</button>
          </div>
        )}
        <div className="mt-sm flex flex-wrap items-center gap-xs">
          <Badge>{record.originating_domain}</Badge>
          <span title={stateTitle(curated ? "Curated Memory" : "Emerging Memory")}>
            <Badge>{humanizeState(curated ? "Curated Memory" : "Emerging Memory").label}</Badge>
          </span>
        </div>
        {record.originating_steward_note && (
          <p className="mt-sm text-sm text-slate-grey">Originating steward · {record.originating_steward_note}</p>
        )}
      </header>

      <div className={cardCls}>
        <div className={labelCls}>Decision summary</div>
        <p className="mt-xs whitespace-pre-wrap text-sm text-kosha-navy">{record.decision_summary}</p>
      </div>

      {curated ? (
        <CuratedView record={record} />
      ) : (
        <CurationForm record={record} onRefresh={onRefresh} />
      )}

      <div className="grid grid-cols-1 gap-md sm:grid-cols-3">
        <div className={cardCls}>
          <div className={labelCls}>Last retrieved</div>
          <div className="mt-xs font-numeral text-sm text-kosha-navy">
            {lastRetrievedAt ? formatDate(lastRetrievedAt) : "Never retrieved"}
          </div>
        </div>
        <div className={cardCls}>
          <div className={labelCls}>Retrievals</div>
          <div className="mt-xs font-numeral text-sm text-kosha-navy">{retrievals.length}</div>
        </div>
        <div className={cardCls}>
          <div className={labelCls}>Active concerns</div>
          <div className="mt-xs font-numeral text-sm text-kosha-navy">{activeConcerns}</div>
        </div>
      </div>
    </div>
  );
}

function CuratedView({ record }: { record: MemoryRecord }) {
  return (
    <div className="space-y-md">
      <div className={cardCls}>
        <div className={labelCls}>Decision rationale</div>
        <p className="mt-xs whitespace-pre-wrap text-sm text-kosha-navy">{record.rationale_text}</p>
      </div>
      {record.alternatives_considered && (
        <div className={cardCls}>
          <div className={labelCls}>Alternatives considered</div>
          <p className="mt-xs whitespace-pre-wrap text-sm text-kosha-navy">{record.alternatives_considered}</p>
        </div>
      )}
      <div className={cardCls}>
        <div className="flex flex-wrap items-center gap-md">
          <div>
            <div className={labelCls}>Confidence classification</div>
            <div className="mt-xs"><Badge>{record.confidence_classification}</Badge></div>
          </div>
          <div>
            <div className={labelCls}>Applicability signal</div>
            <div className="mt-xs"><Badge>{record.applicability_signal}</Badge></div>
          </div>
        </div>
        <p className="mt-md text-xs text-slate-grey">
          Institutional Memory preserves what was decided and why — never whether a successor
          has come to understand it. This signal reflects the rationale's own continued
          relevance, not anyone's comprehension of it.
        </p>
      </div>
    </div>
  );
}

function CurationForm({ record, onRefresh }: { record: MemoryRecord; onRefresh: () => Promise<void> | void }) {
  const [rationale, setRationale] = useState(record.rationale_text ?? "");
  const [alternatives, setAlternatives] = useState(record.alternatives_considered ?? "");
  const [confidence, setConfidence] = useState<Confidence | "">("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!rationale.trim()) { setMessage("Rationale is required to complete Curation."); return; }
    if (!confidence) { setMessage("A Confidence Classification is required."); return; }
    setBusy(true);
    const { error } = await supabase.from("institutional_memory_records").update({
      rationale_text: rationale.trim(),
      alternatives_considered: alternatives.trim() || null,
      confidence_classification: confidence,
    }).eq("id", record.id);
    setBusy(false);
    if (error) { setMessage("Could not save Curation. Please try again."); return; }
    await onRefresh();
  }

  return (
    <form onSubmit={submit} className={cardCls + " space-y-md"}>
      <h3 className="font-display text-[18px] leading-[26px] text-kosha-navy">Complete Curation</h3>
      <div>
        <label className={labelCls} htmlFor="mem-rationale">Decision rationale</label>
        <textarea id="mem-rationale" rows={5} value={rationale} onChange={(e) => setRationale(e.target.value)} className={inputCls} />
        <p className="mt-xs text-xs text-slate-grey">
          The why. Once saved, this becomes part of the historical record and cannot be edited —
          only added to, through Review.
        </p>
      </div>
      <div>
        <label className={labelCls} htmlFor="mem-conf">Confidence classification</label>
        <select id="mem-conf" value={confidence} onChange={(e) => setConfidence(e.target.value as Confidence)} className={inputCls}>
          <option value="">Select…</option>
          {CONFIDENCE_LEVELS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="mt-sm space-y-xs text-xs text-slate-grey">
          <p><span className="text-kosha-navy">Verified Memory</span> — directly corroborated by contemporaneous record or the originating steward's own confirmed account.</p>
          <p><span className="text-kosha-navy">Reported Memory</span> — recounted by someone present or directly informed, not independently corroborated.</p>
          <p><span className="text-kosha-navy">Inferred Memory</span> — reconstructed from indirect evidence or pattern; never to be elevated to Verified or Reported no matter how plausible it seems.</p>
          <p><span className="text-kosha-navy">Unknown Memory</span> — a recognized gap: a decision known to exist whose rationale could not be captured. Record this honestly rather than inventing a plausible-sounding account.</p>
        </div>
      </div>
      <div>
        <label className={labelCls} htmlFor="mem-alt">Alternatives considered (optional)</label>
        <textarea id="mem-alt" rows={3} value={alternatives} onChange={(e) => setAlternatives(e.target.value)} className={inputCls} />
      </div>
      {message && <p className="text-sm text-slate-grey">{message}</p>}
      <div className="flex items-center gap-sm">
        <button type="submit" disabled={busy} className={primaryBtn}>{busy ? "Saving…" : "Save Curation"}</button>
      </div>
    </form>
  );
}

/* =============== Retrievals =============== */

function RetrievalsTab({ record }: { record: MemoryRecord }) {
  const { items, refresh } = useRetrievals(record.id);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    await supabase.from("memory_retrievals").insert({
      institutional_memory_record_id: record.id,
      note: note.trim() || null,
    });
    setBusy(false);
    setNote("");
    await refresh();
  }

  return (
    <div className="space-y-lg">
      <form onSubmit={submit} className={cardCls + " space-y-md"}>
        <h3 className="font-display text-[18px] leading-[26px] text-kosha-navy">Log Retrieval</h3>
        <p className="text-xs text-slate-grey">
          Retrieval is a usage event — the rationale informed a present decision. It never
          changes the record itself.
        </p>
        <div>
          <label className={labelCls} htmlFor="ret-note">Note (optional)</label>
          <textarea id="ret-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} />
        </div>
        <button type="submit" disabled={busy} className={primaryBtn}>{busy ? "Saving…" : "Log Retrieval"}</button>
      </form>

      {items.length === 0 ? (
        <p className="text-sm text-slate-grey">No retrievals logged yet.</p>
      ) : (
        <ul className="space-y-xs">
          {items.map((r) => (
            <li key={r.id} className={cardCls}>
              <div className="font-numeral text-xs text-slate-grey">{formatDate(r.retrieved_at)}</div>
              {r.note && <p className="mt-xs text-sm text-kosha-navy">{r.note}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* =============== Reviews =============== */

function ReviewsTab({ record, onRefresh }: { record: MemoryRecord; onRefresh: () => Promise<void> | void }) {
  const { items, refresh } = useReviews(record.id);
  const [finding, setFinding] = useState<Applicability>("Still Applies");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const curated = isCurated(record);
  const retired = !!record.retired_at;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (retired) return;
    setBusy(true);
    const { error } = await supabase.from("memory_reviews").insert({
      institutional_memory_record_id: record.id,
      finding,
      note: note.trim() || null,
    });
    setBusy(false);
    if (error) { setMessage("Could not record this Review. Please try again."); return; }
    setNote("");
    setMessage(null);
    await refresh();
    await onRefresh();
  }

  if (!curated) {
    return (
      <div className={cardCls}>
        <p className="text-sm text-slate-grey">
          A record with no rationale yet has nothing to review. Complete Curation on the
          Overview tab first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-lg">
      {retired && (
        <div className={cardCls}>
          <div className={labelCls}>Record retired</div>
          <div className="mt-xs font-numeral text-sm text-kosha-navy">{formatDate(record.retired_at)}</div>
          <p className="mt-sm text-xs text-slate-grey">
            Retired through Maker-Checker. The Curated rationale is preserved unchanged — the record
            is simply no longer surfaced as an active retrieval.
          </p>
        </div>
      )}
      <form onSubmit={submit} className={cardCls + " space-y-md"}>
        <h3 className="font-display text-[18px] leading-[26px] text-kosha-navy">Record Review</h3>
        <p className="text-xs text-slate-grey">
          Recording a finding of "No Longer Applies" updates this record's Applicability Signal.
          It does not retire the record — Retirement is a separate Maker-Checker decision below.
        </p>
        <div>
          <label className={labelCls} htmlFor="rev-finding">Finding</label>
          <select id="rev-finding" value={finding} onChange={(e) => setFinding(e.target.value as Applicability)} className={inputCls}>
            <option value="Still Applies">Still Applies</option>
            <option value="No Longer Applies">No Longer Applies</option>
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="rev-note">Note (optional)</label>
          <textarea id="rev-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} />
        </div>
        {message && <p className="text-sm text-slate-grey">{message}</p>}
        <button type="submit" disabled={busy || retired} className={primaryBtn}>{busy ? "Saving…" : "Record Review"}</button>
      </form>

      {!retired && <RequestMemoryRetirementCard record={record} />}

      {items.length === 0 ? (
        <p className="text-sm text-slate-grey">No reviews recorded yet.</p>
      ) : (
        <ul className="space-y-xs">
          {items.map((r) => (
            <li key={r.id} className={cardCls}>
              <div className="flex flex-wrap items-center justify-between gap-sm">
                <div className="font-numeral text-xs text-slate-grey">{formatDate(r.reviewed_at)}</div>
                <Badge>{r.finding}</Badge>
              </div>
              {r.note && <p className="mt-xs text-sm text-kosha-navy">{r.note}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RequestMemoryRetirementCard({ record }: { record: MemoryRecord }) {
  const { participant } = useParticipant();
  const { pending, refresh } = useHasPendingRequest(
    participant?.id ?? null, "institutional_memory_record", record.id, "Retire",
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit() {
    if (!participant) return;
    setBusy(true); setMessage(null);
    const { error } = await requestMemoryRetirement(record.id, record.title, participant.id);
    setBusy(false);
    if (error) { setMessage(error.message || "Could not submit this request."); return; }
    await refresh();
  }

  if (pending) {
    return (
      <div className={cardCls}>
        <div className={labelCls}>Retirement request pending</div>
        <p className="mt-xs text-sm text-slate-grey">
          A Knowledge Steward linked to this workspace can approve or deny on the Review workspace.
          The Curated rationale remains intact regardless of the decision.
        </p>
      </div>
    );
  }

  return (
    <div className={cardCls + " space-y-sm"}>
      <h3 className="font-display text-[18px] leading-[26px] text-kosha-navy">Request Retirement</h3>
      <p className="text-xs text-slate-grey">
        Retirement stops surfacing this record in active retrieval. The historical rationale
        is preserved verbatim (DM-0008 §4.4). A Knowledge Steward other than you must approve.
      </p>
      {message && <p className="text-sm text-slate-grey">{message}</p>}
      <button type="button" onClick={submit} disabled={busy || !participant} className={primaryBtn}>
        {busy ? "Submitting…" : "Send for Steward approval"}
      </button>
    </div>
  );
}

/* =============== Concerns =============== */

function ConcernsTab({ record }: { record: MemoryRecord }) {
  const { items, refresh } = useConcerns(record.id);
  const [filter, setFilter] = useState<"All" | ConcernStatus>("All");
  const [type, setType] = useState<ConcernType>("Fossilization");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const filtered = useMemo(
    () => (filter === "All" ? items : items.filter((c) => c.status === filter)),
    [items, filter],
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) { setMessage("A description is required."); return; }
    setBusy(true);
    const { error } = await supabase.from("memory_concerns").insert({
      institutional_memory_record_id: record.id,
      concern_type: type,
      description: description.trim(),
    });
    setBusy(false);
    if (error) { setMessage("Could not save this concern. Please try again."); return; }
    setDescription(""); setMessage(null);
    await refresh();
  }

  async function resolve(c: Concern) {
    const note = window.prompt("Resolution note (optional)") ?? "";
    await supabase.from("memory_concerns").update({
      status: "Resolved",
      resolved_at: new Date().toISOString(),
      resolution_note: note.trim() || null,
    }).eq("id", c.id);
    await refresh();
  }

  return (
    <div className="space-y-lg">
      <form onSubmit={submit} className={cardCls + " space-y-md"}>
        <h3 className="font-display text-[18px] leading-[26px] text-kosha-navy">Raise a Concern</h3>
        <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
          <div>
            <label className={labelCls} htmlFor="conc-type">Type</label>
            <select id="conc-type" value={type} onChange={(e) => setType(e.target.value as ConcernType)} className={inputCls}>
              {CONCERN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className={labelCls} htmlFor="conc-desc">Description</label>
          <textarea id="conc-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} />
        </div>
        {message && <p className="text-sm text-slate-grey">{message}</p>}
        <button type="submit" disabled={busy} className={primaryBtn}>{busy ? "Saving…" : "Raise Concern"}</button>
      </form>

      <div className="flex flex-wrap items-center gap-sm">
        <span className={labelCls}>Filter</span>
        {(["All", "Active", "Resolved"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={
              "rounded-md px-md py-1 text-xs font-semibold " +
              (filter === f
                ? "bg-kosha-navy text-vault-ivory"
                : "border border-[color:var(--color-border-default)] bg-pure-white text-kosha-navy hover:bg-vault-ivory")
            }
          >
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-slate-grey">No concerns to show.</p>
      ) : (
        <ul className="space-y-xs">
          {filtered.map((c) => (
            <li key={c.id} className={cardCls}>
              <div className="flex flex-wrap items-center justify-between gap-sm">
                <div className="flex items-center gap-xs">
                  <Badge>{c.concern_type}</Badge>
                  <Badge>{c.status}</Badge>
                </div>
                <div className="font-numeral text-xs text-slate-grey">{formatDate(c.raised_at)}</div>
              </div>
              <p className="mt-xs text-sm text-kosha-navy">{c.description}</p>
              {c.status === "Resolved" && c.resolution_note && (
                <p className="mt-xs text-xs text-slate-grey">Resolution · {c.resolution_note}</p>
              )}
              {c.status === "Active" && (
                <div className="mt-sm">
                  <button type="button" onClick={() => resolve(c)} className={secondaryBtn}>Mark Resolved</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}