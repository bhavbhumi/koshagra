import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useParticipant } from "@/lib/participant";

export const Route = createFileRoute("/_authenticated/digital-legacy")({
  component: DigitalLegacyPage,
});

/* ============ Types ============ */

type RepresentationType = "Digital Identity" | "AI Agent" | "Cryptographic Key";
const REPRESENTATION_TYPES: RepresentationType[] = [
  "Digital Identity",
  "AI Agent",
  "Cryptographic Key",
];

type TriggerType = "Incapacity" | "Death" | "Dormancy" | "Unauthorized Continuation" | "Other";
const TRIGGER_TYPES: TriggerType[] = [
  "Incapacity",
  "Death",
  "Dormancy",
  "Unauthorized Continuation",
  "Other",
];

type ConcernType = "Compromise" | "Authority Ambiguity" | "Other";
type ConcernStatus = "Active" | "Resolved";

type DigitalExecutor = {
  id: string;
  owner_participant_id: string;
  full_name: string;
  source_of_authority_note: string | null;
  notes: string | null;
  created_at: string;
};

type Representation = {
  id: string;
  owner_participant_id: string;
  name: string;
  representation_type: RepresentationType;
  platform_or_custodian: string | null;
  authorized_scope: string;
  transition_triggered_at: string | null;
  transition_trigger_type: TriggerType | null;
  transition_note: string | null;
  created_at: string;
  updated_at: string;
};

type MonitoringCheck = {
  id: string;
  representation_id: string;
  checked_at: string;
  note: string | null;
};

type RepresentationConcern = {
  id: string;
  representation_id: string;
  concern_type: ConcernType;
  description: string;
  status: ConcernStatus;
  raised_at: string;
  resolved_at: string | null;
  resolution_note: string | null;
};

type TabKey = "overview" | "monitoring" | "transition" | "concerns";
const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "monitoring", label: "Monitoring" },
  { key: "transition", label: "Transition" },
  { key: "concerns", label: "Concerns" },
];

/* ============ Styles ============ */

const inputCls =
  "mt-xs w-full rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-md py-2 text-sm text-kosha-navy";
const labelCls = "text-xs uppercase tracking-widest text-slate-grey";
const primaryBtn =
  "rounded-md bg-kosha-navy px-md py-2 text-sm font-semibold text-vault-ivory hover:bg-kosha-navy/90 disabled:opacity-40";
const secondaryBtn =
  "rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-md py-2 text-sm font-semibold text-kosha-navy hover:bg-vault-ivory";
const cardCls =
  "rounded-md bg-pure-white p-md shadow-[var(--shadow-1)] ring-1 ring-[color:var(--color-border-default)]";

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" });
}

/* ============ Hooks ============ */

function useDigitalExecutors(participantId: string | null) {
  const [items, setItems] = useState<DigitalExecutor[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    if (!participantId) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("digital_executors").select("*")
      .eq("owner_participant_id", participantId)
      .order("created_at", { ascending: true });
    setItems((data ?? []) as DigitalExecutor[]);
    setLoading(false);
  }, [participantId]);
  useEffect(() => { refresh(); }, [refresh]);
  return { items, loading, refresh };
}

function useRepresentations(participantId: string | null) {
  const [items, setItems] = useState<Representation[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    if (!participantId) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("representations").select("*")
      .eq("owner_participant_id", participantId)
      .order("created_at", { ascending: true });
    setItems((data ?? []) as Representation[]);
    setLoading(false);
  }, [participantId]);
  useEffect(() => { refresh(); }, [refresh]);
  return { items, loading, refresh };
}

function useMonitoringChecks(representationId: string | null) {
  const [items, setItems] = useState<MonitoringCheck[]>([]);
  const refresh = useCallback(async () => {
    if (!representationId) { setItems([]); return; }
    const { data } = await supabase
      .from("monitoring_checks").select("*")
      .eq("representation_id", representationId)
      .order("checked_at", { ascending: false });
    setItems((data ?? []) as MonitoringCheck[]);
  }, [representationId]);
  useEffect(() => { refresh(); }, [refresh]);
  return { items, refresh };
}

function useConcerns(representationId: string | null) {
  const [items, setItems] = useState<RepresentationConcern[]>([]);
  const refresh = useCallback(async () => {
    if (!representationId) { setItems([]); return; }
    const { data } = await supabase
      .from("representation_concerns").select("*")
      .eq("representation_id", representationId)
      .order("raised_at", { ascending: false });
    setItems((data ?? []) as RepresentationConcern[]);
  }, [representationId]);
  useEffect(() => { refresh(); }, [refresh]);
  return { items, refresh };
}

/* ============ Root ============ */

function DigitalLegacyPage() {
  const { participant } = useParticipant();
  const executors = useDigitalExecutors(participant?.id ?? null);
  const reps = useRepresentations(participant?.id ?? null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [tab, setTab] = useState<TabKey>("overview");

  useEffect(() => {
    if (reps.items.length === 0) { setSelectedId(null); return; }
    if (reps.items.length === 1) setSelectedId(reps.items[0].id);
    else setSelectedId((prev) => (prev && reps.items.some((r) => r.id === prev) ? prev : null));
  }, [reps.items]);

  const rep = reps.items.find((r) => r.id === selectedId) ?? null;

  if (!participant || reps.loading || executors.loading) {
    return (
      <section aria-busy="true" className="max-w-[64rem]">
        <div className="inline-flex items-center gap-sm text-sm text-slate-grey">
          <span className="h-2 w-2 rounded-full bg-slate-grey animate-pulse" aria-hidden />
          Loading Digital Legacy…
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-[72rem] space-y-xl">
      <DigitalExecutorsSection
        participantId={participant.id}
        items={executors.items}
        onChanged={executors.refresh}
      />

      <div className="space-y-lg">
        <div className="flex flex-wrap items-center justify-between gap-md">
          <h2 className="font-display text-[20px] leading-[28px] text-kosha-navy">Your Representations</h2>
          {!creating && reps.items.length > 0 && (
            <button type="button" onClick={() => setCreating(true)} className={secondaryBtn}>
              Record Representation
            </button>
          )}
        </div>

        {reps.items.length === 0 && !creating && (
          <div className={cardCls}>
            <p className="text-sm text-slate-grey">
              Digital Legacy preserves what continues to stand for you — an account, a voice, a key —
              once you no longer can. Record your first Representation to begin.
            </p>
            <button type="button" onClick={() => setCreating(true)} className={"mt-md " + primaryBtn}>
              Record Representation
            </button>
          </div>
        )}

        {creating && (
          <RepresentationForm
            participantId={participant.id}
            onCancel={() => setCreating(false)}
            onCreated={async (id) => { setCreating(false); await reps.refresh(); setSelectedId(id); }}
          />
        )}

        {reps.items.length > 0 && !rep && (
          <div className={cardCls}>
            <h3 className="font-display text-[20px] leading-[28px] text-kosha-navy">Choose a Representation</h3>
            <p className="mt-xs text-sm text-slate-grey">
              You hold more than one Representation. Pick one to open its workspace.
            </p>
            <ul className="mt-md space-y-xs">
              {reps.items.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(r.id)}
                    className="flex w-full flex-wrap items-center justify-between gap-sm rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-md py-3 text-left text-sm text-kosha-navy hover:bg-vault-ivory"
                  >
                    <span className="font-semibold">{r.name}</span>
                    <TypeBadge type={r.representation_type} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {rep && (
          <div className="space-y-lg">
            {reps.items.length > 1 && (
              <div className="flex flex-wrap items-center gap-sm">
                <span className={labelCls}>Representation</span>
                <select
                  value={rep.id}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className="rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-md py-1 text-sm text-kosha-navy"
                >
                  {reps.items.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
            )}

            <TabBar tab={tab} onChange={setTab} />
            <div>
              {tab === "overview" && <OverviewTab rep={rep} onRefresh={reps.refresh} />}
              {tab === "monitoring" && <MonitoringTab rep={rep} />}
              {tab === "transition" && <TransitionTab rep={rep} onRefresh={reps.refresh} />}
              {tab === "concerns" && <ConcernsTab rep={rep} />}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function TypeBadge({ type }: { type: RepresentationType }) {
  return (
    <span className="rounded px-2 py-0.5 text-[10px] uppercase tracking-widest bg-vault-ivory text-slate-grey ring-1 ring-[color:var(--color-border-default)]">
      {type}
    </span>
  );
}

function TabBar({ tab, onChange }: { tab: TabKey; onChange: (t: TabKey) => void }) {
  return (
    <div role="tablist" aria-label="Digital Legacy sections" className="flex flex-wrap gap-lg border-b border-[color:var(--color-border-default)]">
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

/* ============ Digital Executors ============ */

function DigitalExecutorsSection({
  participantId, items, onChanged,
}: { participantId: string; items: DigitalExecutor[]; onChanged: () => Promise<void> | void }) {
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
    const { error } = await supabase.from("digital_executors").insert({
      owner_participant_id: participantId,
      full_name: fullName.trim(),
      source_of_authority_note: source.trim() || null,
      notes: notes.trim() || null,
    });
    setBusy(false);
    if (error) { setMessage("Could not save this Digital Executor. Please try again."); return; }
    setFullName(""); setSource(""); setNotes(""); setCreating(false); setMessage(null);
    await onChanged();
  }

  return (
    <div className="space-y-md">
      <div className="flex flex-wrap items-center justify-between gap-md">
        <div>
          <h2 className="font-display text-[20px] leading-[28px] text-kosha-navy">Digital Executors</h2>
          <p className="mt-xs max-w-[52rem] text-sm text-slate-grey">
            A Digital Executor oversees your Representations once you no longer can. This roster is
            separate from your Estate Executor and any Trustee — even when the same person serves in
            more than one standing.
          </p>
        </div>
        {!creating && <button type="button" onClick={() => setCreating(true)} className={secondaryBtn}>Add Digital Executor</button>}
      </div>

      {creating && (
        <form onSubmit={submit} className={cardCls + " space-y-md"}>
          <div><label className={labelCls}>Full name</label><input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Source of authority</label><input value={source} onChange={(e) => setSource(e.target.value)} className={inputCls} placeholder="e.g. Named in the digital-legacy instructions" /></div>
          <div><label className={labelCls}>Notes</label><textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} /></div>
          {message && <p className="text-sm text-slate-grey">{message}</p>}
          <div className="flex items-center gap-sm">
            <button type="submit" disabled={busy} className={primaryBtn}>{busy ? "Saving…" : "Save Digital Executor"}</button>
            <button type="button" onClick={() => setCreating(false)} className={secondaryBtn}>Cancel</button>
          </div>
        </form>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-slate-grey">No Digital Executor recorded yet.</p>
      ) : (
        <ul className="space-y-xs">
          {items.map((e) => (
            <li key={e.id} className={cardCls}>
              <div className="text-sm font-semibold text-kosha-navy">{e.full_name}</div>
              {e.source_of_authority_note && <div className="mt-xs text-xs text-slate-grey">Source of authority · {e.source_of_authority_note}</div>}
              {e.notes && <p className="mt-xs text-sm text-slate-grey">{e.notes}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ============ Representation create form ============ */

function RepresentationForm({
  participantId, onCancel, onCreated,
}: { participantId: string; onCancel: () => void; onCreated: (id: string) => void | Promise<void> }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<RepresentationType>("Digital Identity");
  const [platform, setPlatform] = useState("");
  const [scope, setScope] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setMessage("A name is required."); return; }
    if (!scope.trim()) { setMessage("Authorized Scope is required."); return; }
    setBusy(true);
    const { data, error } = await supabase.from("representations").insert({
      owner_participant_id: participantId,
      name: name.trim(),
      representation_type: type,
      platform_or_custodian: platform.trim() || null,
      authorized_scope: scope.trim(),
    }).select("id").single();
    setBusy(false);
    if (error || !data) { setMessage("Could not record this Representation. Please try again."); return; }
    await onCreated(data.id);
  }

  return (
    <form onSubmit={submit} className={cardCls + " space-y-md"}>
      <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
        <div>
          <label className={labelCls} htmlFor="rep-name">Name</label>
          <input id="rep-name" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="e.g. Instagram Account" />
        </div>
        <div>
          <label className={labelCls} htmlFor="rep-type">Type</label>
          <select id="rep-type" value={type} onChange={(e) => setType(e.target.value as RepresentationType)} className={inputCls}>
            {REPRESENTATION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className={labelCls} htmlFor="rep-platform">Platform or custodian (optional)</label>
        <input id="rep-platform" value={platform} onChange={(e) => setPlatform(e.target.value)} className={inputCls} placeholder="e.g. Instagram, 1Password" />
        <p className="mt-xs text-xs text-slate-grey">Referenced only — Koshagra does not govern the platform itself.</p>
      </div>
      <div>
        <label className={labelCls} htmlFor="rep-scope">Authorized Scope</label>
        <textarea id="rep-scope" rows={4} value={scope} onChange={(e) => setScope(e.target.value)} className={inputCls} />
        <p className="mt-xs text-xs text-slate-grey">
          Precisely what a Digital Executor or AI Agent may and may not do. Editable until a Transition
          Trigger is recorded, then fixed.
        </p>
      </div>
      {message && <p className="text-sm text-slate-grey">{message}</p>}
      <div className="flex items-center gap-sm">
        <button type="submit" disabled={busy} className={primaryBtn}>{busy ? "Saving…" : "Record Representation"}</button>
        <button type="button" onClick={onCancel} className={secondaryBtn}>Cancel</button>
      </div>
    </form>
  );
}

/* ============ Overview ============ */

function OverviewTab({ rep, onRefresh }: { rep: Representation; onRefresh: () => Promise<void> | void }) {
  const { items: checks } = useMonitoringChecks(rep.id);
  const { items: concerns } = useConcerns(rep.id);

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(rep.name);
  useEffect(() => { setNameDraft(rep.name); }, [rep.id, rep.name]);
  const [busy, setBusy] = useState(false);

  async function saveName() {
    if (!nameDraft.trim()) return;
    setBusy(true);
    await supabase.from("representations").update({ name: nameDraft.trim() }).eq("id", rep.id);
    setBusy(false); setEditingName(false);
    await onRefresh();
  }

  const transitioned = !!rep.transition_triggered_at;
  const activeConcerns = concerns.filter((c) => c.status === "Active");
  const state: { label: string; tone: "navy" | "slate" } = useMemo(() => {
    if (transitioned) return { label: "Transitioning", tone: "slate" };
    if (activeConcerns.length > 0) return { label: "Compromised", tone: "slate" };
    return { label: "Active", tone: "navy" };
  }, [transitioned, activeConcerns.length]);

  const [editingScope, setEditingScope] = useState(false);
  const [scopeDraft, setScopeDraft] = useState(rep.authorized_scope);
  useEffect(() => { setScopeDraft(rep.authorized_scope); }, [rep.id, rep.authorized_scope]);
  async function saveScope() {
    if (!scopeDraft.trim()) return;
    setBusy(true);
    await supabase.from("representations").update({ authorized_scope: scopeDraft.trim() }).eq("id", rep.id);
    setBusy(false); setEditingScope(false);
    await onRefresh();
  }

  return (
    <div className="space-y-xl">
      <header>
        {!editingName ? (
          <div className="flex flex-wrap items-center gap-sm">
            <h2 className="font-display text-[28px] leading-[36px] text-kosha-navy">{rep.name}</h2>
            <button type="button" onClick={() => setEditingName(true)} className="rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-sm py-1 text-xs font-semibold text-kosha-navy hover:bg-vault-ivory">
              Edit name
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-sm">
            <input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} className="rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-md py-2 text-lg text-kosha-navy" />
            <button type="button" disabled={busy} onClick={saveName} className={primaryBtn}>{busy ? "Saving…" : "Save"}</button>
            <button type="button" onClick={() => { setEditingName(false); setNameDraft(rep.name); }} className={secondaryBtn}>Cancel</button>
          </div>
        )}

        <div className="mt-md flex flex-wrap items-center gap-md">
          <TypeBadge type={rep.representation_type} />
          {rep.platform_or_custodian && (
            <span className="text-xs text-slate-grey">Platform · {rep.platform_or_custodian}</span>
          )}
        </div>

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
            {checks.length > 0
              ? <>Last monitored <span className="font-numeral">{formatDate(checks[0].checked_at)}</span></>
              : "Never monitored"}
          </span>
        </div>
      </header>

      {rep.representation_type === "AI Agent" && (
        <div className={cardCls}>
          <div className="font-display text-[20px] leading-[28px] text-kosha-navy">Scoped Representation</div>
          <p className="mt-xs text-sm text-slate-grey">
            This is a scoped Representation only. An AI Agent can never hold independent Authority,
            approve a Disposition, or be recorded as accountable for any decision — the Digital
            Executor remains solely accountable.
          </p>
        </div>
      )}

      <div>
        <div className="flex flex-wrap items-center justify-between gap-md">
          <div className={labelCls}>Authorized Scope</div>
          {!transitioned && !editingScope && (
            <button type="button" onClick={() => setEditingScope(true)} className={secondaryBtn}>Edit Scope</button>
          )}
        </div>
        {!editingScope ? (
          <p className="mt-xs whitespace-pre-wrap text-sm text-kosha-navy max-w-[52rem]">{rep.authorized_scope}</p>
        ) : (
          <div className="mt-xs space-y-sm max-w-[52rem]">
            <textarea rows={4} value={scopeDraft} onChange={(e) => setScopeDraft(e.target.value)} className={inputCls} />
            <div className="flex items-center gap-sm">
              <button type="button" disabled={busy} onClick={saveScope} className={primaryBtn}>{busy ? "Saving…" : "Save Scope"}</button>
              <button type="button" onClick={() => { setEditingScope(false); setScopeDraft(rep.authorized_scope); }} className={secondaryBtn}>Cancel</button>
            </div>
          </div>
        )}
        {transitioned && (
          <p className="mt-xs text-xs text-slate-grey max-w-[52rem]">
            Fixed once a Transition Trigger was recorded — Authorized Scope reflects what was actually
            granted while capacity was retained.
          </p>
        )}
      </div>

      <div>
        <div className={labelCls}>Status snapshot</div>
        <div className="mt-sm grid grid-cols-2 gap-md sm:grid-cols-3">
          <StatCard label="Monitoring Checks" value={checks.length} />
          <StatCard label="Active Concerns" value={activeConcerns.length} />
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className={cardCls}>
      <div className={labelCls}>{label}</div>
      <div className="mt-xs text-kosha-navy font-numeral text-[28px] leading-[36px]">{value}</div>
    </div>
  );
}

/* ============ Monitoring ============ */

function MonitoringTab({ rep }: { rep: Representation }) {
  const { items, refresh } = useMonitoringChecks(rep.id);
  const [creating, setCreating] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    await supabase.from("monitoring_checks").insert({ representation_id: rep.id, note: note.trim() || null });
    setBusy(false); setNote(""); setCreating(false);
    await refresh();
  }

  return (
    <div className="space-y-md">
      <div className="flex flex-wrap items-center justify-between gap-md">
        <p className="max-w-[48rem] text-sm text-slate-grey">
          A Monitoring Check records that this Representation was reviewed and observed to be as
          expected. No cadence is enforced.
        </p>
        {!creating && <button type="button" onClick={() => setCreating(true)} className={primaryBtn}>Log Monitoring Check</button>}
      </div>
      {creating && (
        <form onSubmit={submit} className={cardCls + " space-y-md"}>
          <div><label className={labelCls}>Note (optional)</label><textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} /></div>
          <div className="flex items-center gap-sm">
            <button type="submit" disabled={busy} className={primaryBtn}>{busy ? "Saving…" : "Save Check"}</button>
            <button type="button" onClick={() => setCreating(false)} className={secondaryBtn}>Cancel</button>
          </div>
        </form>
      )}
      {items.length === 0 ? (
        <p className="text-sm text-slate-grey">No Monitoring Checks recorded yet.</p>
      ) : (
        <ul className="space-y-sm">
          {items.map((c) => (
            <li key={c.id} className={cardCls}>
              <div className="font-numeral text-xs text-slate-grey">{formatDate(c.checked_at)}</div>
              {c.note && <p className="mt-xs text-sm text-slate-grey whitespace-pre-wrap">{c.note}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ============ Transition ============ */

function TransitionTab({ rep, onRefresh }: { rep: Representation; onRefresh: () => Promise<void> | void }) {
  const [starting, setStarting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [triggerType, setTriggerType] = useState<TriggerType>("Incapacity");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function record(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from("representations").update({
      transition_triggered_at: new Date().toISOString(),
      transition_trigger_type: triggerType,
      transition_note: note.trim() || null,
    }).eq("id", rep.id);
    setBusy(false);
    if (error) { setMessage("Could not record this Transition Trigger. Please try again."); return; }
    setStarting(false); setConfirmed(false); setNote("");
    await onRefresh();
  }

  if (rep.transition_triggered_at) {
    return (
      <div className="space-y-md">
        <div className={cardCls}>
          <div className={labelCls}>Transition Trigger recorded</div>
          <div className="mt-xs text-sm text-kosha-navy">
            {rep.transition_trigger_type ?? "—"} · <span className="font-numeral">{formatDate(rep.transition_triggered_at)}</span>
          </div>
          {rep.transition_note && (
            <p className="mt-sm text-sm text-slate-grey whitespace-pre-wrap">{rep.transition_note}</p>
          )}
        </div>
        <div className={cardCls}>
          <p className="text-sm text-slate-grey">
            A Transition Trigger has been recorded. Deciding whether to Memorialize or Retire this
            Representation requires real Digital Executor Maker-Checker this build doesn't yet
            support — record any interim outcome informally using the note above until that
            capability exists.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-md">
      <p className="max-w-[48rem] text-sm text-slate-grey">
        A Transition Trigger records a real change in the Person's own condition — Incapacity, Death,
        prolonged Dormancy, or Unauthorized Continuation. Once recorded, Authorized Scope becomes
        fixed.
      </p>
      {!starting ? (
        <button type="button" onClick={() => setStarting(true)} className={primaryBtn}>Record Transition Trigger</button>
      ) : !confirmed ? (
        <div className={cardCls + " space-y-md"}>
          <p className="text-sm text-slate-grey">
            This records that a Transition Trigger has occurred and Authorized Scope will become
            fixed. It does not decide what happens to this Representation next — that decision needs
            a Digital Executor's own Approve-tier confirmation, which this build doesn't yet
            support.
          </p>
          <div className="flex items-center gap-sm">
            <button type="button" onClick={() => setConfirmed(true)} className={primaryBtn}>Continue</button>
            <button type="button" onClick={() => setStarting(false)} className={secondaryBtn}>Cancel</button>
          </div>
        </div>
      ) : (
        <form onSubmit={record} className={cardCls + " space-y-md"}>
          <div>
            <label className={labelCls}>Trigger type</label>
            <select value={triggerType} onChange={(e) => setTriggerType(e.target.value as TriggerType)} className={inputCls}>
              {TRIGGER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Note (optional)</label>
            <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} />
          </div>
          {message && <p className="text-sm text-slate-grey">{message}</p>}
          <div className="flex items-center gap-sm">
            <button type="submit" disabled={busy} className={primaryBtn}>{busy ? "Saving…" : "Record Transition Trigger"}</button>
            <button type="button" onClick={() => { setStarting(false); setConfirmed(false); }} className={secondaryBtn}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}

/* ============ Concerns ============ */

function ConcernsTab({ rep }: { rep: Representation }) {
  const { items, refresh } = useConcerns(rep.id);
  const [filter, setFilter] = useState<"all" | ConcernStatus>("all");
  const [creating, setCreating] = useState(false);
  const [type, setType] = useState<ConcernType>("Compromise");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolveNote, setResolveNote] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) { setMessage("A description is required."); return; }
    setBusy(true);
    const { error } = await supabase.from("representation_concerns").insert({
      representation_id: rep.id, concern_type: type, description: description.trim(),
    });
    setBusy(false);
    if (error) { setMessage("Could not raise this Concern. Please try again."); return; }
    setDescription(""); setType("Compromise"); setCreating(false); setMessage(null);
    await refresh();
  }

  async function markResolved(id: string) {
    await supabase.from("representation_concerns").update({
      status: "Resolved", resolved_at: new Date().toISOString(),
      resolution_note: resolveNote.trim() || null,
    }).eq("id", id);
    setResolvingId(null); setResolveNote("");
    await refresh();
  }

  const shown = items.filter((c) => filter === "all" || c.status === filter);

  return (
    <div className="space-y-md">
      <div className="flex flex-wrap items-center justify-between gap-md">
        <div role="tablist" aria-label="Filter concerns" className="inline-flex overflow-hidden rounded-md text-xs ring-1 ring-[color:var(--color-border-default)]">
          {(["all", "Active", "Resolved"] as const).map((k) => (
            <button key={k} type="button" role="tab" aria-selected={filter === k} onClick={() => setFilter(k)}
              className={"px-md py-2 uppercase tracking-widest " + (filter === k ? "bg-kosha-navy text-vault-ivory" : "bg-pure-white text-slate-grey hover:text-kosha-navy")}>
              {k === "all" ? "All" : k}
            </button>
          ))}
        </div>
        {!creating && <button type="button" onClick={() => setCreating(true)} className={primaryBtn}>Raise Concern</button>}
      </div>

      {creating && (
        <form onSubmit={submit} className={cardCls + " space-y-md"}>
          <div>
            <label className={labelCls}>Concern type</label>
            <select value={type} onChange={(e) => setType(e.target.value as ConcernType)} className={inputCls}>
              <option value="Compromise">Compromise</option>
              <option value="Authority Ambiguity">Authority Ambiguity</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div><label className={labelCls}>Description</label><textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} /></div>
          {message && <p className="text-sm text-slate-grey">{message}</p>}
          <div className="flex items-center gap-sm">
            <button type="submit" disabled={busy} className={primaryBtn}>{busy ? "Saving…" : "Raise Concern"}</button>
            <button type="button" onClick={() => setCreating(false)} className={secondaryBtn}>Cancel</button>
          </div>
        </form>
      )}

      {shown.length === 0 ? (
        <p className="text-sm text-slate-grey">No Concerns to show.</p>
      ) : (
        <ul className="space-y-sm">
          {shown.map((c) => (
            <li key={c.id} className={cardCls}>
              <div className="flex flex-wrap items-start justify-between gap-md">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-sm">
                    <span className="text-sm font-semibold text-kosha-navy">{c.concern_type}</span>
                    <span className={
                      "inline-flex items-center rounded px-2 py-0.5 text-[10px] uppercase tracking-widest " +
                      (c.status === "Active"
                        ? "bg-vault-ivory text-slate-grey ring-1 ring-[color:var(--color-border-default)]"
                        : "bg-kosha-navy text-vault-ivory")
                    }>{c.status}</span>
                  </div>
                  <p className="mt-xs text-sm text-slate-grey whitespace-pre-wrap">{c.description}</p>
                  <div className="mt-xs text-xs text-slate-grey">
                    Raised <span className="font-numeral">{formatDate(c.raised_at)}</span>
                    {c.resolved_at && <> · Resolved <span className="font-numeral">{formatDate(c.resolved_at)}</span></>}
                  </div>
                  {c.resolution_note && <p className="mt-xs text-xs text-slate-grey">Resolution · {c.resolution_note}</p>}
                </div>
                {c.status === "Active" && resolvingId !== c.id && (
                  <button type="button" onClick={() => { setResolvingId(c.id); setResolveNote(""); }} className={secondaryBtn}>
                    Mark Resolved
                  </button>
                )}
              </div>
              {resolvingId === c.id && (
                <div className="mt-md space-y-sm rounded-md bg-vault-ivory p-md">
                  <p className="text-xs text-slate-grey">
                    Resolving a Concern is a routine governance outcome — the Digital Executor remains
                    accountable for whatever action was taken.
                  </p>
                  <label className={labelCls}>Resolution note (optional)</label>
                  <textarea rows={2} value={resolveNote} onChange={(e) => setResolveNote(e.target.value)} className={inputCls} />
                  <div className="flex items-center gap-sm">
                    <button type="button" onClick={() => markResolved(c.id)} className={primaryBtn}>Confirm Resolved</button>
                    <button type="button" onClick={() => { setResolvingId(null); setResolveNote(""); }} className={secondaryBtn}>Cancel</button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}