import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useParticipant } from "@/lib/participant";
import { LinkParticipant } from "@/components/access/LinkParticipant";
import { requestPreparednessRetirement, useHasPendingRequest } from "@/lib/access-grants";
import { humanizeState, stateTitle } from "@/lib/state-labels";

/* =============== Types =============== */

type AffectedDomain =
  | "Estate Planning"
  | "Family Governance"
  | "Business Succession"
  | "Trust Administration"
  | "Philanthropy"
  | "Digital Legacy"
  | "Institutional Memory"
  | "Cross-Domain / Other";
const AFFECTED_DOMAINS: AffectedDomain[] = [
  "Estate Planning",
  "Family Governance",
  "Business Succession",
  "Trust Administration",
  "Philanthropy",
  "Digital Legacy",
  "Institutional Memory",
  "Cross-Domain / Other",
];

type Confidence =
  | "Verified Preparedness"
  | "Partially Verified Preparedness"
  | "Reported Preparedness"
  | "Inferred Preparedness"
  | "Unknown Preparedness";
const CONFIDENCE_LEVELS: Confidence[] = [
  "Verified Preparedness",
  "Partially Verified Preparedness",
  "Reported Preparedness",
  "Inferred Preparedness",
  "Unknown Preparedness",
];

type GapScope = "Full" | "Partial";
type GapStatus = "Active" | "Resolved";
type Finding = "Still Adequate" | "No Longer Adequate";
type ConcernType = "Preparedness Theater" | "Manufactured Urgency" | "Other";
const CONCERN_TYPES: ConcernType[] = ["Preparedness Theater", "Manufactured Urgency", "Other"];
type ConcernStatus = "Active" | "Resolved";

type Steward = {
  id: string;
  owner_participant_id: string;
  full_name: string;
  source_of_authority_note: string | null;
  notes: string | null;
  linked_participant_id: string | null;
  created_at: string;
};

type PreparednessRecord = {
  id: string;
  owner_participant_id: string;
  category_name: string;
  category_description: string | null;
  affected_domain: AffectedDomain;
  contingency_reference_note: string | null;
  confidence_classification: Confidence | null;
  retired_at: string | null;
  created_at: string;
  updated_at: string;
};

type GapFlag = {
  id: string;
  preparedness_record_id: string;
  scope: GapScope;
  description: string;
  status: GapStatus;
  raised_at: string;
  resolved_at: string | null;
  resolution_note: string | null;
};

type CurrencyReview = {
  id: string;
  preparedness_record_id: string;
  reviewed_at: string;
  finding: Finding;
  note: string | null;
};

type Concern = {
  id: string;
  preparedness_record_id: string;
  concern_type: ConcernType;
  description: string;
  status: ConcernStatus;
  raised_at: string;
  resolved_at: string | null;
  resolution_note: string | null;
};

type TabKey = "overview" | "gaps" | "reviews" | "concerns";
const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "gaps", label: "Gaps" },
  { key: "reviews", label: "Currency Reviews" },
  { key: "concerns", label: "Concerns" },
];

type State =
  | "Emerging Preparedness"
  | "Gap Identified"
  | "Partial Preparedness"
  | "Invalidated Preparedness"
  | "Confirmed Preparedness";

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

// Every badge uses the same calm navy/ivory treatment — Gap Identified,
// Partial Preparedness, and Invalidated Preparedness must never look alarmed.
function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded px-2 py-0.5 text-[10px] uppercase tracking-widest bg-vault-ivory text-slate-grey ring-1 ring-[color:var(--color-border-default)]">
      {children}
    </span>
  );
}

/* =============== Hooks =============== */

function useStewards(participantId: string | null) {
  const [items, setItems] = useState<Steward[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    if (!participantId) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("preparedness_stewards").select("*")
      .eq("owner_participant_id", participantId)
      .order("created_at", { ascending: true });
    setItems((data ?? []) as Steward[]);
    setLoading(false);
  }, [participantId]);
  useEffect(() => { refresh(); }, [refresh]);
  return { items, loading, refresh };
}

function useRecords(participantId: string | null) {
  const [items, setItems] = useState<PreparednessRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    if (!participantId) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("preparedness_records").select("*")
      .eq("owner_participant_id", participantId)
      .order("created_at", { ascending: true });
    setItems((data ?? []) as PreparednessRecord[]);
    setLoading(false);
  }, [participantId]);
  useEffect(() => { refresh(); }, [refresh]);
  return { items, loading, refresh };
}

function useGaps(recordId: string | null) {
  const [items, setItems] = useState<GapFlag[]>([]);
  const refresh = useCallback(async () => {
    if (!recordId) { setItems([]); return; }
    const { data } = await supabase
      .from("preparedness_gap_flags").select("*")
      .eq("preparedness_record_id", recordId)
      .order("raised_at", { ascending: false });
    setItems((data ?? []) as GapFlag[]);
  }, [recordId]);
  useEffect(() => { refresh(); }, [refresh]);
  return { items, refresh };
}

function useCurrencyReviews(recordId: string | null) {
  const [items, setItems] = useState<CurrencyReview[]>([]);
  const refresh = useCallback(async () => {
    if (!recordId) { setItems([]); return; }
    const { data } = await supabase
      .from("currency_reviews").select("*")
      .eq("preparedness_record_id", recordId)
      .order("reviewed_at", { ascending: false });
    setItems((data ?? []) as CurrencyReview[]);
  }, [recordId]);
  useEffect(() => { refresh(); }, [refresh]);
  return { items, refresh };
}

function useConcerns(recordId: string | null) {
  const [items, setItems] = useState<Concern[]>([]);
  const refresh = useCallback(async () => {
    if (!recordId) { setItems([]); return; }
    const { data } = await supabase
      .from("preparedness_concerns").select("*")
      .eq("preparedness_record_id", recordId)
      .order("raised_at", { ascending: false });
    setItems((data ?? []) as Concern[]);
  }, [recordId]);
  useEffect(() => { refresh(); }, [refresh]);
  return { items, refresh };
}

function computeState(
  record: PreparednessRecord,
  gaps: GapFlag[],
  reviews: CurrencyReview[],
): State {
  if (!record.contingency_reference_note || !record.confidence_classification) {
    return "Emerging Preparedness";
  }
  const activeGaps = gaps.filter((g) => g.status === "Active");
  if (activeGaps.some((g) => g.scope === "Full")) return "Gap Identified";
  if (activeGaps.some((g) => g.scope === "Partial")) return "Partial Preparedness";
  const latest = reviews[0];
  if (latest && latest.finding === "No Longer Adequate"
      && new Date(latest.reviewed_at) > new Date(record.updated_at)) {
    return "Invalidated Preparedness";
  }
  return "Confirmed Preparedness";
}

/* =============== Root =============== */

export function InstitutionalPreparednessPage() {
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
          Loading Institutional Preparedness…
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-[72rem] space-y-xl">
      <StewardsSection
        participantId={participant.id}
        items={stewards.items}
        onChanged={stewards.refresh}
      />

      <div className="space-y-lg">
        <div className="flex flex-wrap items-center justify-between gap-md">
          <h2 className="font-display text-[20px] leading-[28px] text-kosha-navy">
            Preparedness Records
          </h2>
          {!creating && records.items.length > 0 && (
            <button type="button" onClick={() => setCreating(true)} className={secondaryBtn}>
              Recognize Category
            </button>
          )}
        </div>

        {records.items.length === 0 && !creating && (
          <div className={cardCls}>
            <p className="text-sm text-slate-grey">
              Preparedness confirms that readiness already exists for foreseeable disruption,
              before it arrives — so response draws on provision already in place, never
              improvised for the first time in crisis. Recognize your first category to begin.
            </p>
            <button type="button" onClick={() => setCreating(true)} className={"mt-md " + primaryBtn}>
              Recognize Category
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
          <RecordPicker records={records.items} onSelect={setSelectedId} />
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
                    <option key={r.id} value={r.id}>{r.category_name}</option>
                  ))}
                </select>
                <button type="button" onClick={() => setSelectedId(null)} className={secondaryBtn}>
                  Back to list
                </button>
              </div>
            )}

            <TabBar tab={tab} onChange={setTab} />
            <div>
              {tab === "overview" && <OverviewTab record={record} onRefresh={records.refresh} />}
              {tab === "gaps" && <GapsTab record={record} />}
              {tab === "reviews" && <ReviewsTab record={record} />}
              {tab === "concerns" && <ConcernsTab record={record} />}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function RecordPicker({
  records, onSelect,
}: { records: PreparednessRecord[]; onSelect: (id: string) => void }) {
  return (
    <div className={cardCls}>
      <h3 className="font-display text-[20px] leading-[28px] text-kosha-navy">Choose a record</h3>
      <p className="mt-xs text-sm text-slate-grey">
        Pick a Preparedness Record to open its workspace.
      </p>
      <ul className="mt-md space-y-xs">
        {records.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => onSelect(r.id)}
              className="flex w-full flex-wrap items-center justify-between gap-sm rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-md py-3 text-left text-sm text-kosha-navy hover:bg-vault-ivory"
            >
              <span className="font-semibold">{r.category_name}</span>
              <span className="flex items-center gap-xs">
                <Badge>{r.affected_domain}</Badge>
                <span title={stateTitle(!r.contingency_reference_note || !r.confidence_classification ? "Emerging Preparedness" : "Recorded")}>
                  <Badge>
                    {!r.contingency_reference_note || !r.confidence_classification
                      ? humanizeState("Emerging Preparedness").label
                      : "Recorded"}
                  </Badge>
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TabBar({ tab, onChange }: { tab: TabKey; onChange: (t: TabKey) => void }) {
  return (
    <div role="tablist" aria-label="Institutional Preparedness sections" className="flex flex-wrap gap-lg border-b border-[color:var(--color-border-default)]">
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

/* =============== Preparedness Stewards =============== */

function StewardsSection({
  participantId, items, onChanged,
}: { participantId: string; items: Steward[]; onChanged: () => Promise<void> | void }) {
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
    const { error } = await supabase.from("preparedness_stewards").insert({
      owner_participant_id: participantId,
      full_name: fullName.trim(),
      source_of_authority_note: source.trim() || null,
      notes: notes.trim() || null,
    });
    setBusy(false);
    if (error) { setMessage("Could not save this Preparedness Steward. Please try again."); return; }
    setFullName(""); setSource(""); setNotes(""); setCreating(false); setMessage(null);
    await onChanged();
  }

  return (
    <div className="space-y-md">
      <div className="flex flex-wrap items-center justify-between gap-md">
        <div>
          <h2 className="font-display text-[20px] leading-[28px] text-kosha-navy">Preparedness Stewards</h2>
          <p className="mt-xs max-w-[52rem] text-sm text-slate-grey">
            A Preparedness Steward confirms that provision exists. They never act as the one
            who responds when disruption actually strikes — that response belongs to whichever
            domain's own Steward is affected.
          </p>
        </div>
        {!creating && (
          <button type="button" onClick={() => setCreating(true)} className={secondaryBtn}>
            Add Preparedness Steward
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
            <button type="submit" disabled={busy} className={primaryBtn}>{busy ? "Saving…" : "Save Preparedness Steward"}</button>
            <button type="button" onClick={() => setCreating(false)} className={secondaryBtn}>Cancel</button>
          </div>
        </form>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-slate-grey">No Preparedness Steward recorded yet.</p>
      ) : (
        <ul className="space-y-xs">
          {items.map((s) => (
            <li key={s.id} className={cardCls}>
              <div className="text-sm font-semibold text-kosha-navy">{s.full_name}</div>
              {s.source_of_authority_note && <div className="mt-xs text-xs text-slate-grey">Source of authority · {s.source_of_authority_note}</div>}
              {s.notes && <p className="mt-xs text-sm text-slate-grey">{s.notes}</p>}
              <LinkParticipant
                table="preparedness_stewards"
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
  const [name, setName] = useState("");
  const [domain, setDomain] = useState<AffectedDomain>("Cross-Domain / Other");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setMessage("A category name is required."); return; }
    setBusy(true);
    const { data, error } = await supabase.from("preparedness_records").insert({
      owner_participant_id: participantId,
      category_name: name.trim(),
      affected_domain: domain,
      category_description: description.trim() || null,
    }).select("id").single();
    setBusy(false);
    if (error || !data) { setMessage("Could not recognize this category. Please try again."); return; }
    await onCreated(data.id);
  }

  return (
    <form onSubmit={submit} className={cardCls + " space-y-md"}>
      <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
        <div>
          <label className={labelCls} htmlFor="prep-name">Category name</label>
          <input id="prep-name" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="e.g. Sudden incapacity of Founder" />
        </div>
        <div>
          <label className={labelCls} htmlFor="prep-domain">Affected domain</label>
          <select id="prep-domain" value={domain} onChange={(e) => setDomain(e.target.value as AffectedDomain)} className={inputCls}>
            {AFFECTED_DOMAINS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className={labelCls} htmlFor="prep-desc">Category description (optional)</label>
        <textarea id="prep-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} />
        <p className="mt-xs text-xs text-slate-grey">Why this is genuinely foreseeable, not merely imaginable.</p>
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

function OverviewTab({ record, onRefresh }: { record: PreparednessRecord; onRefresh: () => Promise<void> | void }) {
  const { items: gaps } = useGaps(record.id);
  const { items: reviews } = useCurrencyReviews(record.id);

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(record.category_name);
  useEffect(() => { setNameDraft(record.category_name); }, [record.id, record.category_name]);
  const [busy, setBusy] = useState(false);

  async function saveName() {
    if (!nameDraft.trim()) return;
    setBusy(true);
    await supabase.from("preparedness_records").update({ category_name: nameDraft.trim() }).eq("id", record.id);
    setBusy(false); setEditingName(false);
    await onRefresh();
  }

  const state = computeState(record, gaps, reviews);
  const lastReviewedAt = reviews[0]?.reviewed_at ?? null;
  const activeGaps = gaps.filter((g) => g.status === "Active").length;
  const isRecorded = !!(record.contingency_reference_note && record.confidence_classification);

  return (
    <div className="space-y-xl">
      <header>
        {!editingName ? (
          <div className="flex flex-wrap items-center gap-sm">
            <h2 className="font-display text-[28px] leading-[36px] text-kosha-navy">{record.category_name}</h2>
            <button type="button" onClick={() => setEditingName(true)} className="rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-sm py-1 text-xs font-semibold text-kosha-navy hover:bg-vault-ivory">
              Edit name
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-sm">
            <input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} className="rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-md py-2 text-lg text-kosha-navy" />
            <button type="button" disabled={busy} onClick={saveName} className={primaryBtn}>{busy ? "Saving…" : "Save"}</button>
            <button type="button" onClick={() => { setEditingName(false); setNameDraft(record.category_name); }} className={secondaryBtn}>Cancel</button>
          </div>
        )}
        <div className="mt-sm flex flex-wrap items-center gap-xs">
          <Badge>{record.affected_domain}</Badge>
          <span title={stateTitle(state)}>
            <Badge>{humanizeState(state).label}</Badge>
          </span>
        </div>
        {record.category_description && (
          <p className="mt-sm max-w-[52rem] whitespace-pre-wrap text-sm text-slate-grey">{record.category_description}</p>
        )}
      </header>

      {isRecorded ? (
        <RecordedProvision record={record} onRefresh={onRefresh} />
      ) : (
        <ConfirmProvisionForm record={record} onRefresh={onRefresh} />
      )}

      <div className="grid grid-cols-1 gap-md sm:grid-cols-3">
        <div className={cardCls}>
          <div className={labelCls}>Last Currency Review</div>
          <div className="mt-xs font-numeral text-sm text-kosha-navy">
            {lastReviewedAt ? formatDate(lastReviewedAt) : "Never reviewed"}
          </div>
        </div>
        <div className={cardCls}>
          <div className={labelCls}>Active Gaps</div>
          <div className="mt-xs font-numeral text-sm text-kosha-navy">{activeGaps}</div>
        </div>
        <div className={cardCls}>
          <div className={labelCls}>Currency Reviews</div>
          <div className="mt-xs font-numeral text-sm text-kosha-navy">{reviews.length}</div>
        </div>
      </div>
    </div>
  );
}

function ConfidenceGuidance() {
  return (
    <div className="mt-sm space-y-xs text-xs text-slate-grey">
      <p><span className="text-kosha-navy">Verified Preparedness</span> — directly confirmed against the relevant domain's own current, documented provision.</p>
      <p><span className="text-kosha-navy">Partially Verified Preparedness</span> — some element of the provision is confirmed; other elements remain unconfirmed or incomplete.</p>
      <p><span className="text-kosha-navy">Reported Preparedness</span> — asserted by an Originating Steward but not independently confirmed.</p>
      <p><span className="text-kosha-navy">Inferred Preparedness</span> — reconstructed from indirect evidence or pattern; never to be elevated to Verified, Partially Verified, or Reported no matter how plausible it seems.</p>
      <p><span className="text-kosha-navy">Unknown Preparedness</span> — a recognized gap in evidence itself: not known whether provision exists at all. Record this honestly rather than assuming absence or presence.</p>
    </div>
  );
}

function ConfirmProvisionForm({ record, onRefresh }: { record: PreparednessRecord; onRefresh: () => Promise<void> | void }) {
  const [note, setNote] = useState(record.contingency_reference_note ?? "");
  const [confidence, setConfidence] = useState<Confidence | "">(record.confidence_classification ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) { setMessage("A Contingency Reference note is required."); return; }
    if (!confidence) { setMessage("A Confidence Classification is required."); return; }
    setBusy(true);
    const { error } = await supabase.from("preparedness_records").update({
      contingency_reference_note: note.trim(),
      confidence_classification: confidence,
    }).eq("id", record.id);
    setBusy(false);
    if (error) { setMessage("Could not save. Please try again."); return; }
    await onRefresh();
  }

  return (
    <form onSubmit={submit} className={cardCls + " space-y-md"}>
      <h3 className="font-display text-[18px] leading-[26px] text-kosha-navy">Confirm Provision</h3>
      <div>
        <label className={labelCls} htmlFor="prep-ref">Contingency Reference note</label>
        <textarea id="prep-ref" rows={4} value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} />
        <p className="mt-xs text-xs text-slate-grey">
          A description of the actual provision confirmed in the affected domain — a pointer,
          described here, never duplicated or owned by this record.
        </p>
      </div>
      <div>
        <label className={labelCls} htmlFor="prep-conf">Confidence classification</label>
        <select id="prep-conf" value={confidence} onChange={(e) => setConfidence(e.target.value as Confidence)} className={inputCls}>
          <option value="">Select…</option>
          {CONFIDENCE_LEVELS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <ConfidenceGuidance />
      </div>
      {message && <p className="text-sm text-slate-grey">{message}</p>}
      <div className="flex items-center gap-sm">
        <button type="submit" disabled={busy} className={primaryBtn}>{busy ? "Saving…" : "Confirm"}</button>
      </div>
    </form>
  );
}

function RecordedProvision({ record, onRefresh }: { record: PreparednessRecord; onRefresh: () => Promise<void> | void }) {
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(record.contingency_reference_note ?? "");
  const [confidence, setConfidence] = useState<Confidence>(record.confidence_classification!);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setNote(record.contingency_reference_note ?? "");
    setConfidence(record.confidence_classification!);
  }, [record.id, record.contingency_reference_note, record.confidence_classification]);

  async function saveRenewal(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) { setMessage("A Contingency Reference note is required."); return; }
    setBusy(true);
    const { error } = await supabase.from("preparedness_records").update({
      contingency_reference_note: note.trim(),
      confidence_classification: confidence,
    }).eq("id", record.id);
    setBusy(false);
    if (error) { setMessage("Could not save. Please try again."); return; }
    setEditing(false); setMessage(null);
    await onRefresh();
  }

  if (editing) {
    return (
      <form onSubmit={saveRenewal} className={cardCls + " space-y-md"}>
        <h3 className="font-display text-[18px] leading-[26px] text-kosha-navy">Renew Provision</h3>
        <p className="text-xs text-slate-grey">
          Confirmed provision is re-verified, not frozen — Renewal is this domain's own healthy,
          expected behavior.
        </p>
        <div>
          <label className={labelCls} htmlFor="prep-ref-r">Contingency Reference note</label>
          <textarea id="prep-ref-r" rows={4} value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor="prep-conf-r">Confidence classification</label>
          <select id="prep-conf-r" value={confidence} onChange={(e) => setConfidence(e.target.value as Confidence)} className={inputCls}>
            {CONFIDENCE_LEVELS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <ConfidenceGuidance />
        </div>
        {message && <p className="text-sm text-slate-grey">{message}</p>}
        <div className="flex items-center gap-sm">
          <button type="submit" disabled={busy} className={primaryBtn}>{busy ? "Saving…" : "Save Renewal"}</button>
          <button type="button" onClick={() => { setEditing(false); setNote(record.contingency_reference_note ?? ""); setConfidence(record.confidence_classification!); }} className={secondaryBtn}>Cancel</button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-md">
      <div className={cardCls}>
        <div className={labelCls}>Contingency Reference</div>
        <p className="mt-xs whitespace-pre-wrap text-sm text-kosha-navy">{record.contingency_reference_note}</p>
      </div>
      <div className={cardCls}>
        <div className="flex flex-wrap items-center justify-between gap-md">
          <div>
            <div className={labelCls}>Confidence classification</div>
            <div className="mt-xs"><Badge>{record.confidence_classification}</Badge></div>
          </div>
          <button type="button" onClick={() => setEditing(true)} className={secondaryBtn}>Renew Provision</button>
        </div>
        <p className="mt-md text-xs text-slate-grey">
          Confirmed provision is re-verified, not frozen — Renewal is this domain's own healthy,
          expected behavior.
        </p>
      </div>
    </div>
  );
}

/* =============== Gaps =============== */

function GapsTab({ record }: { record: PreparednessRecord }) {
  const { items, refresh } = useGaps(record.id);
  const [filter, setFilter] = useState<"All" | GapStatus>("All");
  const [scope, setScope] = useState<GapScope>("Partial");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const filtered = useMemo(
    () => (filter === "All" ? items : items.filter((g) => g.status === filter)),
    [items, filter],
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) { setMessage("A description is required."); return; }
    setBusy(true);
    const { error } = await supabase.from("preparedness_gap_flags").insert({
      preparedness_record_id: record.id,
      scope,
      description: description.trim(),
    });
    setBusy(false);
    if (error) { setMessage("Could not save this Gap Flag. Please try again."); return; }
    setDescription(""); setMessage(null);
    await refresh();
  }

  async function resolve(g: GapFlag) {
    const note = window.prompt("Resolution note (optional)") ?? "";
    await supabase.from("preparedness_gap_flags").update({
      status: "Resolved",
      resolved_at: new Date().toISOString(),
      resolution_note: note.trim() || null,
    }).eq("id", g.id);
    await refresh();
  }

  return (
    <div className="space-y-lg">
      <form onSubmit={submit} className={cardCls + " space-y-md"}>
        <h3 className="font-display text-[18px] leading-[26px] text-kosha-navy">Raise a Gap Flag</h3>
        <p className="text-xs text-slate-grey">
          A Gap Flag records that adequate provision is not currently confirmed for all or part
          of this category — an ordinary, expected condition in an active Preparedness practice,
          not a failure.
        </p>
        <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
          <div>
            <label className={labelCls} htmlFor="gap-scope">Scope</label>
            <select id="gap-scope" value={scope} onChange={(e) => setScope(e.target.value as GapScope)} className={inputCls}>
              <option value="Full">Full</option>
              <option value="Partial">Partial</option>
            </select>
          </div>
        </div>
        <div>
          <label className={labelCls} htmlFor="gap-desc">Description</label>
          <textarea id="gap-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} />
        </div>
        {message && <p className="text-sm text-slate-grey">{message}</p>}
        <button type="submit" disabled={busy} className={primaryBtn}>{busy ? "Saving…" : "Raise Gap Flag"}</button>
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
        <p className="text-sm text-slate-grey">No Gap Flags to show.</p>
      ) : (
        <ul className="space-y-xs">
          {filtered.map((g) => (
            <li key={g.id} className={cardCls}>
              <div className="flex flex-wrap items-center justify-between gap-sm">
                <div className="flex items-center gap-xs">
                  <Badge>{g.scope}</Badge>
                  <Badge>{g.status}</Badge>
                </div>
                <div className="font-numeral text-xs text-slate-grey">{formatDate(g.raised_at)}</div>
              </div>
              <p className="mt-xs text-sm text-kosha-navy">{g.description}</p>
              {g.status === "Resolved" && g.resolution_note && (
                <p className="mt-xs text-xs text-slate-grey">Resolution · {g.resolution_note}</p>
              )}
              {g.status === "Active" && (
                <div className="mt-sm">
                  <button type="button" onClick={() => resolve(g)} className={secondaryBtn}>Mark Resolved</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* =============== Currency Reviews =============== */

function ReviewsTab({ record }: { record: PreparednessRecord }) {
  const { items, refresh } = useCurrencyReviews(record.id);
  const [finding, setFinding] = useState<Finding>("Still Adequate");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const retired = !!record.retired_at;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (retired) return;
    setBusy(true);
    const { error } = await supabase.from("currency_reviews").insert({
      preparedness_record_id: record.id,
      finding,
      note: note.trim() || null,
    });
    setBusy(false);
    if (error) { setMessage("Could not record this Currency Review. Please try again."); return; }
    setNote(""); setMessage(null);
    await refresh();
  }

  return (
    <div className="space-y-lg">
      {retired && (
        <div className={cardCls}>
          <div className={labelCls}>Category retired</div>
          <div className="mt-xs font-numeral text-sm text-kosha-navy">{formatDate(record.retired_at)}</div>
          <p className="mt-sm text-xs text-slate-grey">
            Retired through Maker-Checker. Recognition remains in the audit trail; the category
            is no longer maintained as an active provision to confirm.
          </p>
        </div>
      )}
      <form onSubmit={submit} className={cardCls + " space-y-md"}>
        <h3 className="font-display text-[18px] leading-[26px] text-kosha-navy">Record Currency Review</h3>
        <p className="text-xs text-slate-grey">
          A finding of "No Longer Adequate" marks this record Invalidated Preparedness until the
          provision is renewed on the Overview tab. It does not retire the category — Retirement
          is a separate Maker-Checker decision below.
        </p>
        <div>
          <label className={labelCls} htmlFor="cr-finding">Finding</label>
          <select id="cr-finding" value={finding} onChange={(e) => setFinding(e.target.value as Finding)} className={inputCls}>
            <option value="Still Adequate">Still Adequate</option>
            <option value="No Longer Adequate">No Longer Adequate</option>
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="cr-note">Note (optional)</label>
          <textarea id="cr-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} />
        </div>
        {message && <p className="text-sm text-slate-grey">{message}</p>}
        <button type="submit" disabled={busy || retired} className={primaryBtn}>{busy ? "Saving…" : "Record Currency Review"}</button>
      </form>

      {!retired && <RequestPreparednessRetirementCard record={record} />}

      {items.length === 0 ? (
        <p className="text-sm text-slate-grey">No Currency Reviews recorded yet.</p>
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

function RequestPreparednessRetirementCard({ record }: { record: PreparednessRecord }) {
  const { participant } = useParticipant();
  const { pending, refresh } = useHasPendingRequest(
    participant?.id ?? null, "preparedness_record", record.id, "Retire",
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit() {
    if (!participant) return;
    setBusy(true); setMessage(null);
    const { error } = await requestPreparednessRetirement(record.id, record.category_name, participant.id);
    setBusy(false);
    if (error) { setMessage(error.message || "Could not submit this request."); return; }
    await refresh();
  }

  if (pending) {
    return (
      <div className={cardCls}>
        <div className={labelCls}>Retirement request pending</div>
        <p className="mt-xs text-sm text-slate-grey">
          A Preparedness Steward linked to this workspace can approve or deny on the Review workspace.
        </p>
      </div>
    );
  }

  return (
    <div className={cardCls + " space-y-sm"}>
      <h3 className="font-display text-[18px] leading-[26px] text-kosha-navy">Request Retirement</h3>
      <p className="text-xs text-slate-grey">
        Retirement recognises the category is no longer maintained as active provision. It is a
        distinct decision from a Currency Review of "No Longer Adequate" (which is ordinary), and
        needs a Preparedness Steward other than you to approve.
      </p>
      {message && <p className="text-sm text-slate-grey">{message}</p>}
      <button type="button" onClick={submit} disabled={busy || !participant} className={primaryBtn}>
        {busy ? "Submitting…" : "Send for Steward approval"}
      </button>
    </div>
  );
}

/* =============== Concerns =============== */

function ConcernsTab({ record }: { record: PreparednessRecord }) {
  const { items, refresh } = useConcerns(record.id);
  const [filter, setFilter] = useState<"All" | ConcernStatus>("All");
  const [type, setType] = useState<ConcernType>("Preparedness Theater");
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
    const { error } = await supabase.from("preparedness_concerns").insert({
      preparedness_record_id: record.id,
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
    await supabase.from("preparedness_concerns").update({
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
            <label className={labelCls} htmlFor="prep-conc-type">Type</label>
            <select id="prep-conc-type" value={type} onChange={(e) => setType(e.target.value as ConcernType)} className={inputCls}>
              {CONCERN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className={labelCls} htmlFor="prep-conc-desc">Description</label>
          <textarea id="prep-conc-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} />
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