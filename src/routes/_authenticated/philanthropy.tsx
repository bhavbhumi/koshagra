import { createFileRoute, Link } from "@tanstack/react-router";
import { WorkspaceIntro } from "@/components/shell/WorkspaceIntro";
import { humanizeState, stateTitle } from "@/lib/state-labels";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useParticipant } from "@/lib/participant";
import { formatINR } from "@/lib/estate";
import { useContinuitySubjects } from "@/lib/continuity-subjects";
import { LinkParticipant } from "@/components/access/LinkParticipant";
import { requestDedicationConclusion, useHasPendingRequest } from "@/lib/access-grants";

export const Route = createFileRoute("/_authenticated/philanthropy")({
  component: PhilanthropyPage,
});

/* ================= Types ================= */

type Vehicle = "Foundation" | "Charitable Trust" | "Donor-Advised Fund" | "Informal";
const VEHICLES: Vehicle[] = ["Foundation", "Charitable Trust", "Donor-Advised Fund", "Informal"];

type Dedication = {
  id: string;
  owner_participant_id: string;
  name: string;
  philanthropic_purpose: string;
  vehicle: Vehicle | null;
  related_trust_id: string | null;
  concluded_at: string | null;
  created_at: string;
  updated_at: string;
};
type Donor = { id: string; dedication_id: string; full_name: string; notes: string | null; created_at: string };
type Steward = { id: string; dedication_id: string; full_name: string; source_of_authority_note: string | null; notes: string | null; created_at: string };
type Enforcer = { id: string; dedication_id: string; full_name: string; scope_note: string | null; notes: string | null; linked_participant_id: string | null; created_at: string };
type Grantee = { id: string; dedication_id: string; name: string; purpose_alignment_note: string | null; notes: string | null; created_at: string };
type Distribution = { id: string; dedication_id: string; grantee_id: string; amount: number | string | null; distributed_date: string | null; alignment_note: string | null; notes: string | null; created_at: string };
type ImpactRecord = { id: string; dedication_id: string; recorded_date: string | null; description: string; notes: string | null; created_at: string };
type ConcernType = "Drift" | "Capture" | "Other";
type ConcernStatus = "Active" | "Resolved";
type Concern = { id: string; dedication_id: string; concern_type: ConcernType; description: string; escalated_to_enforcer: boolean; status: ConcernStatus; raised_at: string; resolved_at: string | null; resolution_note: string | null };
type PfReview = { id: string; dedication_id: string; reviewed_at: string; note: string | null };

type TabKey = "overview" | "stewardship" | "grantees" | "impact" | "fidelity";
const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "stewardship", label: "Stewardship" },
  { key: "grantees", label: "Grantees & Distributions" },
  { key: "impact", label: "Impact Records" },
  { key: "fidelity", label: "Purpose Fidelity" },
];

/* ================= Styles ================= */

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

/* ================= Hooks ================= */

function useDedications(participantId: string | null) {
  const [items, setItems] = useState<Dedication[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    if (!participantId) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("dedications").select("*")
      .eq("owner_participant_id", participantId)
      .order("created_at", { ascending: true });
    setItems((data ?? []) as Dedication[]);
    setLoading(false);
  }, [participantId]);
  useEffect(() => { refresh(); }, [refresh]);
  return { items, loading, refresh };
}

function useChild<T>(table: string, dedicationId: string | null, order: { column: string; ascending: boolean } = { column: "created_at", ascending: true }) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    if (!dedicationId) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase.from(table as never).select("*").eq("dedication_id", dedicationId).order(order.column, { ascending: order.ascending });
    setItems(((data ?? []) as unknown) as T[]);
    setLoading(false);
  }, [table, dedicationId, order.column, order.ascending]);
  useEffect(() => { refresh(); }, [refresh]);
  return { items, loading, refresh };
}

/* ================= Root ================= */

function PhilanthropyPage() {
  const { participant } = useParticipant();
  const { items: dedications, loading, refresh } = useDedications(participant?.id ?? null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [tab, setTab] = useState<TabKey>("overview");

  useEffect(() => {
    if (dedications.length === 0) { setSelectedId(null); return; }
    if (dedications.length === 1) setSelectedId(dedications[0].id);
    else setSelectedId((prev) => (prev && dedications.some((d) => d.id === prev) ? prev : null));
  }, [dedications]);

  const dedication = dedications.find((d) => d.id === selectedId) ?? null;

  if (loading || !participant) {
    return (
      <section aria-busy="true" className="max-w-[64rem]">
        <div className="inline-flex items-center gap-sm text-sm text-slate-grey">
          <span className="h-2 w-2 rounded-full bg-slate-grey animate-pulse" aria-hidden />
          Loading Philanthropy…
        </div>
      </section>
    );
  }

  if (dedications.length === 0) {
    return (
      <section className="max-w-[44rem]">
        <div className={cardCls}>
          <h2 className="font-display text-[20px] leading-[28px] text-kosha-navy">No Dedication yet</h2>
          <p className="mt-xs text-sm text-slate-grey">
            Philanthropy preserves fidelity to a Purpose your family has irrevocably dedicated
            resources to. Record your first Dedication to begin.
          </p>
          {!creating ? (
            <button type="button" onClick={() => setCreating(true)} className={"mt-md " + primaryBtn}>
              Record Dedication
            </button>
          ) : (
            <DedicationForm
              participantId={participant.id}
              onCancel={() => setCreating(false)}
              onCreated={async (id) => { setCreating(false); await refresh(); setSelectedId(id); }}
            />
          )}
        </div>
      </section>
    );
  }

  if (!dedication) {
    return (
      <section className="max-w-[44rem] space-y-lg">
        <div className={cardCls}>
          <h2 className="font-display text-[20px] leading-[28px] text-kosha-navy">Choose a Dedication</h2>
          <p className="mt-xs text-sm text-slate-grey">
            You steward more than one Dedication. Pick one to open its workspace — or record another.
          </p>
          <ul className="mt-md space-y-xs">
            {dedications.map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(d.id)}
                  className="flex w-full flex-wrap items-center justify-between gap-sm rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-md py-3 text-left text-sm text-kosha-navy hover:bg-vault-ivory"
                >
                  <span className="font-semibold">{d.name}</span>
                  {d.vehicle && (
                    <span className="rounded px-2 py-0.5 text-[10px] uppercase tracking-widest bg-vault-ivory text-slate-grey ring-1 ring-[color:var(--color-border-default)]">
                      {d.vehicle}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-md">
            {!creating ? (
              <button type="button" onClick={() => setCreating(true)} className={secondaryBtn}>
                Record Dedication
              </button>
            ) : (
              <DedicationForm
                participantId={participant.id}
                onCancel={() => setCreating(false)}
                onCreated={async (id) => { setCreating(false); await refresh(); setSelectedId(id); }}
              />
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-[72rem] space-y-lg">
      <WorkspaceIntro slug="philanthropy" />
      <div className="flex flex-wrap items-center justify-between gap-md">
        {dedications.length > 1 && (
          <div className="flex flex-wrap items-center gap-sm">
            <span className={labelCls}>Dedication</span>
            <select
              value={dedication.id}
              onChange={(e) => setSelectedId(e.target.value)}
              className="rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-md py-1 text-sm text-kosha-navy"
            >
              {dedications.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        )}
        <div className="ml-auto">
          {!creating ? (
            <button type="button" onClick={() => setCreating(true)} className={secondaryBtn}>
              Record Dedication
            </button>
          ) : null}
        </div>
      </div>

      {creating && (
        <DedicationForm
          participantId={participant.id}
          onCancel={() => setCreating(false)}
          onCreated={async (id) => { setCreating(false); await refresh(); setSelectedId(id); }}
        />
      )}

      <TabBar tab={tab} onChange={setTab} />
      <div>
        {tab === "overview" && <OverviewTab dedication={dedication} onRefresh={refresh} />}
        {tab === "stewardship" && <StewardshipTab dedication={dedication} />}
        {tab === "grantees" && <GranteesTab dedication={dedication} />}
        {tab === "impact" && <ImpactTab dedication={dedication} />}
        {tab === "fidelity" && <FidelityTab dedication={dedication} />}
      </div>
    </section>
  );
}

function TabBar({ tab, onChange }: { tab: TabKey; onChange: (t: TabKey) => void }) {
  return (
    <div role="tablist" aria-label="Philanthropy sections" className="flex flex-wrap gap-lg border-b border-[color:var(--color-border-default)]">
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

function SubToggle<T extends string>({
  value, onChange, options,
}: { value: T; onChange: (v: T) => void; options: { key: T; label: string }[] }) {
  return (
    <div role="tablist" aria-label="Section" className="flex flex-wrap gap-sm">
      {options.map((o) => {
        const active = o.key === value;
        return (
          <button
            key={o.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.key)}
            className={
              "rounded-full px-md py-1 text-xs font-semibold " +
              (active
                ? "bg-kosha-navy text-vault-ivory"
                : "bg-pure-white text-slate-grey ring-1 ring-[color:var(--color-border-default)] hover:text-kosha-navy")
            }
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function StatCard({ label, value, numeric = true }: { label: string; value: number | string; numeric?: boolean }) {
  return (
    <div className={cardCls}>
      <div className={labelCls}>{label}</div>
      <div className={"mt-xs text-kosha-navy " + (numeric ? "font-numeral text-[28px] leading-[36px]" : "font-display text-[20px] leading-[28px]")}>
        {value}
      </div>
    </div>
  );
}

/* ================= Dedication create form ================= */

function DedicationForm({
  participantId, onCancel, onCreated,
}: { participantId: string; onCancel: () => void; onCreated: (id: string) => void | Promise<void> }) {
  const { subjects } = useContinuitySubjects();
  const trusts = (subjects ?? []).filter((s) => s.subject_type === "Trust");
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [vehicle, setVehicle] = useState<Vehicle | "">("");
  const [relatedTrust, setRelatedTrust] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setMessage("A name is required."); return; }
    if (!purpose.trim()) { setMessage("A Philanthropic Purpose is required. This cannot be edited after saving."); return; }
    setBusy(true);
    const { data, error } = await supabase.from("dedications").insert({
      owner_participant_id: participantId,
      name: name.trim(),
      philanthropic_purpose: purpose.trim(),
      vehicle: vehicle || null,
      related_trust_id: vehicle === "Charitable Trust" && relatedTrust ? relatedTrust : null,
    }).select("id").single();
    setBusy(false);
    if (error || !data) { setMessage("Could not record this Dedication. Please try again."); return; }
    await onCreated(data.id);
  }

  return (
    <form onSubmit={submit} className={cardCls + " space-y-md"}>
      <div>
        <label className={labelCls} htmlFor="ded-name">Name</label>
        <input id="ded-name" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="e.g. Mehta Family Education Endowment" />
      </div>
      <div>
        <label className={labelCls} htmlFor="ded-purpose">Philanthropic Purpose</label>
        <textarea id="ded-purpose" rows={4} value={purpose} onChange={(e) => setPurpose(e.target.value)} className={inputCls} />
        <p className="mt-xs text-xs text-slate-grey">
          This cannot be edited after saving — Purpose is fixed at Dedication by design (DM-0006, Chapter 3, Section 3.2).
        </p>
      </div>
      <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
        <div>
          <label className={labelCls} htmlFor="ded-vehicle">Vehicle (optional)</label>
          <select id="ded-vehicle" value={vehicle} onChange={(e) => setVehicle(e.target.value as Vehicle | "")} className={inputCls}>
            <option value="">Not specified</option>
            {VEHICLES.map((v) => (<option key={v} value={v}>{v}</option>))}
          </select>
        </div>
        {vehicle === "Charitable Trust" && (
          <div>
            <label className={labelCls} htmlFor="ded-trust">Related Trust (optional)</label>
            <select id="ded-trust" value={relatedTrust} onChange={(e) => setRelatedTrust(e.target.value)} className={inputCls}>
              <option value="">Not linked</option>
              {trusts.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
            </select>
            <p className="mt-xs text-xs text-slate-grey">
              A read-only reference. The Trust remains governed in Trust Administration.
            </p>
          </div>
        )}
      </div>
      {message && <p className="text-sm text-slate-grey">{message}</p>}
      <div className="flex items-center gap-sm">
        <button type="submit" disabled={busy} className={primaryBtn}>{busy ? "Saving…" : "Record Dedication"}</button>
        <button type="button" onClick={onCancel} className={secondaryBtn}>Cancel</button>
      </div>
    </form>
  );
}

/* ================= Overview ================= */

function OverviewTab({ dedication, onRefresh }: { dedication: Dedication; onRefresh: () => Promise<void> | void }) {
  const { subjects } = useContinuitySubjects();
  const { items: donors } = useChild<Donor>("donors", dedication.id);
  const { items: stewards } = useChild<Steward>("philanthropic_stewards", dedication.id);
  const { items: enforcers } = useChild<Enforcer>("enforcers", dedication.id);
  const { items: grantees } = useChild<Grantee>("grantees", dedication.id);
  const { items: distributions } = useChild<Distribution>("distributions", dedication.id);
  const { items: impact } = useChild<ImpactRecord>("impact_records", dedication.id);
  const { items: concerns } = useChild<Concern>("purpose_fidelity_concerns", dedication.id, { column: "raised_at", ascending: false });
  const { items: reviews } = useChild<PfReview>("purpose_fidelity_reviews", dedication.id, { column: "reviewed_at", ascending: false });

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(dedication.name);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setNameDraft(dedication.name); }, [dedication.id, dedication.name]);

  async function saveName() {
    if (!nameDraft.trim()) return;
    setBusy(true);
    await supabase.from("dedications").update({ name: nameDraft.trim() }).eq("id", dedication.id);
    setBusy(false); setEditingName(false);
    await onRefresh();
  }

  const activeConcerns = concerns.filter((c) => c.status === "Active");
  const escalated = activeConcerns.some((c) => c.escalated_to_enforcer);
  const state: { label: string; tone: "navy" | "slate" } = useMemo(() => {
    if (activeConcerns.length > 0 && escalated) return { label: "Contested", tone: "slate" };
    if (activeConcerns.length > 0) return { label: "Drifting", tone: "slate" };
    if (reviews.length > 0) return { label: "Faithful", tone: "navy" };
    return { label: "Administering", tone: "slate" };
  }, [activeConcerns.length, escalated, reviews.length]);

  const totalDistributed = distributions.reduce((sum, d) => sum + (d.amount ? Number(d.amount) : 0), 0);
  const anyAmount = distributions.some((d) => d.amount !== null && d.amount !== undefined);

  const relatedTrust = dedication.related_trust_id
    ? (subjects ?? []).find((s) => s.id === dedication.related_trust_id) ?? null
    : null;

  return (
    <div className="space-y-xl">
      <header>
        {!editingName ? (
          <div className="flex flex-wrap items-center gap-sm">
            <h2 className="font-display text-[28px] leading-[36px] text-kosha-navy">{dedication.name}</h2>
            <button type="button" onClick={() => setEditingName(true)} className="rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-sm py-1 text-xs font-semibold text-kosha-navy hover:bg-vault-ivory">
              Edit name
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-sm">
            <input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} className="rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-md py-2 text-lg text-kosha-navy" />
            <button type="button" disabled={busy} onClick={saveName} className={primaryBtn}>{busy ? "Saving…" : "Save"}</button>
            <button type="button" onClick={() => { setEditingName(false); setNameDraft(dedication.name); }} className={secondaryBtn}>Cancel</button>
          </div>
        )}

        <div className="mt-md max-w-[52rem]">
          <div className={labelCls}>Philanthropic Purpose</div>
          <p className="mt-xs whitespace-pre-wrap text-sm text-kosha-navy">{dedication.philanthropic_purpose}</p>
          <p className="mt-xs text-xs text-slate-grey">
            Fixed at Dedication. Reinterpreting a Purpose requires Enforcer or Legal Authority
            involvement, which this build doesn't yet support.
          </p>
        </div>

        <div className="mt-md flex flex-wrap items-center gap-md">
          <span
            title={stateTitle(state.label)}
            className={
              "inline-flex items-center rounded-md px-md py-1 text-xs uppercase tracking-widest " +
              (state.tone === "navy"
                ? "bg-kosha-navy text-vault-ivory"
                : "bg-vault-ivory text-slate-grey ring-1 ring-[color:var(--color-border-default)]")
            }
          >
            {humanizeState(state.label).label}
          </span>
          <span className="text-xs text-slate-grey">
            {reviews.length > 0
              ? <>Last Purpose Fidelity Review <span className="font-numeral">{formatDate(reviews[0].reviewed_at)}</span></>
              : "Never reviewed"}
          </span>
          {dedication.vehicle && (
            <span className="rounded px-2 py-0.5 text-[10px] uppercase tracking-widest bg-pure-white text-slate-grey ring-1 ring-[color:var(--color-border-default)]">
              {dedication.vehicle}
            </span>
          )}
        </div>
      </header>

      {dedication.vehicle === "Charitable Trust" && relatedTrust && (
        <div className={cardCls}>
          <div className="font-display text-[20px] leading-[28px] text-kosha-navy">
            Structured through {relatedTrust.name}
          </div>
          <p className="mt-xs text-sm text-slate-grey">
            Its Trustee, Beneficiaries, and Trust Property are governed in Trust Administration;
            this workspace adds the Purpose Fidelity layer on top.
          </p>
          <Link to="/trust-administration" className={"mt-sm inline-flex items-center " + secondaryBtn}>
            Open Trust Administration
          </Link>
        </div>
      )}

      <div>
        <div className={labelCls}>Status snapshot</div>
        <div className="mt-sm grid grid-cols-2 gap-md sm:grid-cols-3 lg:grid-cols-4">
          <StatCard label="Donors" value={donors.length} />
          <StatCard label="Philanthropic Stewards" value={stewards.length} />
          <StatCard label="Enforcers" value={enforcers.length} />
          <StatCard label="Grantees" value={grantees.length} />
          <StatCard label="Distributions" value={distributions.length} />
          <StatCard label="Total distributed" value={anyAmount ? formatINR(totalDistributed) : "—"} numeric={false} />
          <StatCard label="Impact Records" value={impact.length} />
          <StatCard label="Active concerns" value={activeConcerns.length} />
        </div>
      </div>
    </div>
  );
}

/* ================= Stewardship ================= */

type StewardSection = "donors" | "stewards" | "enforcers";

function StewardshipTab({ dedication }: { dedication: Dedication }) {
  const [section, setSection] = useState<StewardSection>("donors");
  return (
    <div className="space-y-md">
      <SubToggle
        value={section}
        onChange={setSection}
        options={[
          { key: "donors", label: "Donors" },
          { key: "stewards", label: "Philanthropic Stewards" },
          { key: "enforcers", label: "Enforcers" },
        ]}
      />
      {section === "donors" && <DonorsSection dedicationId={dedication.id} />}
      {section === "stewards" && <StewardsSection dedicationId={dedication.id} />}
      {section === "enforcers" && <EnforcersSection dedicationId={dedication.id} />}
    </div>
  );
}

function DonorsSection({ dedicationId }: { dedicationId: string }) {
  const { items, refresh } = useChild<Donor>("donors", dedicationId);
  const [creating, setCreating] = useState(false);
  const [fullName, setFullName] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) { setMessage("A full name is required."); return; }
    setBusy(true);
    const { error } = await supabase.from("donors").insert({ dedication_id: dedicationId, full_name: fullName.trim(), notes: notes.trim() || null });
    setBusy(false);
    if (error) { setMessage("Could not save this Donor. Please try again."); return; }
    setFullName(""); setNotes(""); setCreating(false); setMessage(null);
    await refresh();
  }

  return (
    <div className="space-y-md">
      <div className="flex flex-wrap items-center justify-between gap-md">
        <p className="text-sm text-slate-grey">
          {items.length === 0
            ? "No Donor recorded yet. A Dedication may have one or more co-Donors."
            : `${items.length} Donor${items.length === 1 ? "" : "s"} recorded.`}
        </p>
        {!creating && <button type="button" onClick={() => setCreating(true)} className={primaryBtn}>Add Donor</button>}
      </div>
      {creating && (
        <form onSubmit={submit} className={cardCls + " space-y-md"}>
          <div><label className={labelCls}>Full name</label><input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Notes</label><textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} /></div>
          {message && <p className="text-sm text-slate-grey">{message}</p>}
          <div className="flex items-center gap-sm">
            <button type="submit" disabled={busy} className={primaryBtn}>{busy ? "Saving…" : "Save Donor"}</button>
            <button type="button" onClick={() => setCreating(false)} className={secondaryBtn}>Cancel</button>
          </div>
        </form>
      )}
      <ul className="space-y-xs">
        {items.map((d) => (
          <li key={d.id} className={cardCls}>
            <div className="text-sm font-semibold text-kosha-navy">{d.full_name}</div>
            {d.notes && <p className="mt-xs text-sm text-slate-grey">{d.notes}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function StewardsSection({ dedicationId }: { dedicationId: string }) {
  const { items, refresh } = useChild<Steward>("philanthropic_stewards", dedicationId);
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
    const { error } = await supabase.from("philanthropic_stewards").insert({
      dedication_id: dedicationId, full_name: fullName.trim(),
      source_of_authority_note: source.trim() || null, notes: notes.trim() || null,
    });
    setBusy(false);
    if (error) { setMessage("Could not save this Steward. Please try again."); return; }
    setFullName(""); setSource(""); setNotes(""); setCreating(false); setMessage(null);
    await refresh();
  }

  return (
    <div className="space-y-md">
      <div className="flex flex-wrap items-center justify-between gap-md">
        <p className="text-sm text-slate-grey">
          {items.length === 0
            ? "No Philanthropic Steward recorded yet. A Steward administers the Endowment on behalf of the Purpose."
            : `${items.length} Philanthropic Steward${items.length === 1 ? "" : "s"} recorded.`}
        </p>
        {!creating && <button type="button" onClick={() => setCreating(true)} className={primaryBtn}>Add Philanthropic Steward</button>}
      </div>
      {creating && (
        <form onSubmit={submit} className={cardCls + " space-y-md"}>
          <div><label className={labelCls}>Full name</label><input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Source of authority</label><input value={source} onChange={(e) => setSource(e.target.value)} className={inputCls} placeholder="e.g. Named in the founding instrument" /></div>
          <div><label className={labelCls}>Notes</label><textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} /></div>
          {message && <p className="text-sm text-slate-grey">{message}</p>}
          <div className="flex items-center gap-sm">
            <button type="submit" disabled={busy} className={primaryBtn}>{busy ? "Saving…" : "Save Steward"}</button>
            <button type="button" onClick={() => setCreating(false)} className={secondaryBtn}>Cancel</button>
          </div>
        </form>
      )}
      <ul className="space-y-xs">
        {items.map((s) => (
          <li key={s.id} className={cardCls}>
            <div className="text-sm font-semibold text-kosha-navy">{s.full_name}</div>
            {s.source_of_authority_note && <div className="mt-xs text-xs text-slate-grey">Source of authority · {s.source_of_authority_note}</div>}
            {s.notes && <p className="mt-xs text-sm text-slate-grey">{s.notes}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function EnforcersSection({ dedicationId }: { dedicationId: string }) {
  const { items, refresh } = useChild<Enforcer>("enforcers", dedicationId);
  const [creating, setCreating] = useState(false);
  const [fullName, setFullName] = useState("");
  const [scope, setScope] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) { setMessage("A full name is required."); return; }
    setBusy(true);
    const { error } = await supabase.from("enforcers").insert({
      dedication_id: dedicationId, full_name: fullName.trim(),
      scope_note: scope.trim() || null, notes: notes.trim() || null,
    });
    setBusy(false);
    if (error) { setMessage("Could not save this Enforcer. Please try again."); return; }
    setFullName(""); setScope(""); setNotes(""); setCreating(false); setMessage(null);
    await refresh();
  }

  return (
    <div className="space-y-md">
      <div className="flex flex-wrap items-center justify-between gap-md">
        <p className="text-sm text-slate-grey">
          {items.length === 0
            ? "No Enforcer recorded yet. An Enforcer holds the standing to challenge Purpose drift or capture."
            : `${items.length} Enforcer${items.length === 1 ? "" : "s"} recorded.`}
        </p>
        {!creating && <button type="button" onClick={() => setCreating(true)} className={primaryBtn}>Add Enforcer</button>}
      </div>
      {creating && (
        <form onSubmit={submit} className={cardCls + " space-y-md"}>
          <div><label className={labelCls}>Full name</label><input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Scope of oversight</label><textarea rows={2} value={scope} onChange={(e) => setScope(e.target.value)} className={inputCls} placeholder="Specific oversight powers granted" /></div>
          <div><label className={labelCls}>Notes</label><textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} /></div>
          {message && <p className="text-sm text-slate-grey">{message}</p>}
          <div className="flex items-center gap-sm">
            <button type="submit" disabled={busy} className={primaryBtn}>{busy ? "Saving…" : "Save Enforcer"}</button>
            <button type="button" onClick={() => setCreating(false)} className={secondaryBtn}>Cancel</button>
          </div>
        </form>
      )}
      <ul className="space-y-xs">
        {items.map((e) => (
          <li key={e.id} className={cardCls}>
            <div className="text-sm font-semibold text-kosha-navy">{e.full_name}</div>
            {e.scope_note && <p className="mt-xs text-sm text-slate-grey">{e.scope_note}</p>}
            {e.notes && <p className="mt-xs text-xs text-slate-grey">{e.notes}</p>}
            <LinkParticipant
              table="enforcers"
              rowId={e.id}
              linkedParticipantId={e.linked_participant_id}
              onChanged={refresh}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ================= Grantees & Distributions ================= */

type GranteesSection = "grantees" | "distributions";

function GranteesTab({ dedication }: { dedication: Dedication }) {
  const [section, setSection] = useState<GranteesSection>("grantees");
  return (
    <div className="space-y-md">
      <SubToggle
        value={section}
        onChange={setSection}
        options={[
          { key: "grantees", label: "Grantees" },
          { key: "distributions", label: "Distributions" },
        ]}
      />
      {section === "grantees" && <GranteesSection dedicationId={dedication.id} />}
      {section === "distributions" && <DistributionsSection dedicationId={dedication.id} />}
    </div>
  );
}

function GranteesSection({ dedicationId }: { dedicationId: string }) {
  const { items, refresh } = useChild<Grantee>("grantees", dedicationId);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [alignment, setAlignment] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setMessage("A name is required."); return; }
    setBusy(true);
    const { error } = await supabase.from("grantees").insert({
      dedication_id: dedicationId, name: name.trim(),
      purpose_alignment_note: alignment.trim() || null, notes: notes.trim() || null,
    });
    setBusy(false);
    if (error) { setMessage("Could not save this Grantee. Please try again."); return; }
    setName(""); setAlignment(""); setNotes(""); setCreating(false); setMessage(null);
    await refresh();
  }

  return (
    <div className="space-y-md">
      <div className="flex flex-wrap items-center justify-between gap-md">
        <p className="max-w-[48rem] text-sm text-slate-grey">
          {items.length === 0
            ? "A Grantee holds no personal entitlement to Endowment resources — it may be replaced without breaching the Dedication, so long as the Purpose continues to be served."
            : `${items.length} Grantee${items.length === 1 ? "" : "s"} recorded. A Grantee holds no personal entitlement to Endowment resources.`}
        </p>
        {!creating && <button type="button" onClick={() => setCreating(true)} className={primaryBtn}>Add Grantee</button>}
      </div>
      {creating && (
        <form onSubmit={submit} className={cardCls + " space-y-md"}>
          <div><label className={labelCls}>Name (person or organization)</label><input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Purpose alignment</label><textarea rows={2} value={alignment} onChange={(e) => setAlignment(e.target.value)} className={inputCls} placeholder="How this Grantee serves the stated Purpose" /></div>
          <div><label className={labelCls}>Notes</label><textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} /></div>
          {message && <p className="text-sm text-slate-grey">{message}</p>}
          <div className="flex items-center gap-sm">
            <button type="submit" disabled={busy} className={primaryBtn}>{busy ? "Saving…" : "Save Grantee"}</button>
            <button type="button" onClick={() => setCreating(false)} className={secondaryBtn}>Cancel</button>
          </div>
        </form>
      )}
      <ul className="space-y-xs">
        {items.map((g) => (
          <li key={g.id} className={cardCls}>
            <div className="text-sm font-semibold text-kosha-navy">{g.name}</div>
            {g.purpose_alignment_note && <p className="mt-xs text-sm text-slate-grey">{g.purpose_alignment_note}</p>}
            {g.notes && <p className="mt-xs text-xs text-slate-grey">{g.notes}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function DistributionsSection({ dedicationId }: { dedicationId: string }) {
  const { items, refresh } = useChild<Distribution>("distributions", dedicationId, { column: "distributed_date", ascending: false });
  const { items: grantees } = useChild<Grantee>("grantees", dedicationId);
  const [creating, setCreating] = useState(false);
  const [granteeId, setGranteeId] = useState("");
  const [amount, setAmount] = useState("");
  const [distDate, setDistDate] = useState("");
  const [alignment, setAlignment] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => { if (!granteeId && grantees[0]) setGranteeId(grantees[0].id); }, [grantees, granteeId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!granteeId) { setMessage("Select a Grantee. Record a Grantee first if none exist."); return; }
    setBusy(true);
    const { error } = await supabase.from("distributions").insert({
      dedication_id: dedicationId, grantee_id: granteeId,
      amount: amount.trim() === "" ? null : Number(amount),
      distributed_date: distDate || null,
      alignment_note: alignment.trim() || null,
      notes: notes.trim() || null,
    });
    setBusy(false);
    if (error) { setMessage("Could not save this Distribution. Please try again."); return; }
    setAmount(""); setDistDate(""); setAlignment(""); setNotes(""); setCreating(false); setMessage(null);
    await refresh();
  }

  const granteeName = (id: string) => grantees.find((g) => g.id === id)?.name ?? "—";

  return (
    <div className="space-y-md">
      <div className="flex flex-wrap items-center justify-between gap-md">
        <p className="text-sm text-slate-grey">
          {items.length === 0
            ? "No Distributions recorded yet."
            : `${items.length} Distribution${items.length === 1 ? "" : "s"} recorded.`}
        </p>
        {!creating && grantees.length > 0 && <button type="button" onClick={() => setCreating(true)} className={primaryBtn}>Record Distribution</button>}
        {grantees.length === 0 && (
          <p className="text-xs text-slate-grey">Record a Grantee before adding Distributions.</p>
        )}
      </div>
      {creating && (
        <form onSubmit={submit} className={cardCls + " space-y-md"}>
          <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
            <div>
              <label className={labelCls}>Grantee</label>
              <select value={granteeId} onChange={(e) => setGranteeId(e.target.value)} className={inputCls}>
                {grantees.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Amount (₹, optional)</label>
              <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls + " font-numeral"} />
            </div>
            <div>
              <label className={labelCls}>Distributed date</label>
              <input type="date" value={distDate} onChange={(e) => setDistDate(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div><label className={labelCls}>Alignment note</label><textarea rows={2} value={alignment} onChange={(e) => setAlignment(e.target.value)} className={inputCls} placeholder="Why this distribution serves the Purpose" /></div>
          <div><label className={labelCls}>Notes</label><textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} /></div>
          {message && <p className="text-sm text-slate-grey">{message}</p>}
          <div className="flex items-center gap-sm">
            <button type="submit" disabled={busy} className={primaryBtn}>{busy ? "Saving…" : "Save Distribution"}</button>
            <button type="button" onClick={() => setCreating(false)} className={secondaryBtn}>Cancel</button>
          </div>
        </form>
      )}
      {items.length > 0 && (
        <div className="overflow-x-auto rounded-md ring-1 ring-[color:var(--color-border-default)]">
          <table className="min-w-full bg-pure-white text-sm">
            <thead className="bg-vault-ivory text-left text-xs uppercase tracking-widest text-slate-grey">
              <tr>
                <th className="px-md py-2">Date</th>
                <th className="px-md py-2">Grantee</th>
                <th className="px-md py-2">Amount</th>
                <th className="px-md py-2">Alignment</th>
              </tr>
            </thead>
            <tbody>
              {items.map((d) => (
                <tr key={d.id} className="border-t border-[color:var(--color-border-default)]">
                  <td className="px-md py-2 font-numeral text-slate-grey">{formatDate(d.distributed_date)}</td>
                  <td className="px-md py-2 text-kosha-navy">{granteeName(d.grantee_id)}</td>
                  <td className="px-md py-2 font-numeral text-kosha-navy">{d.amount ? formatINR(d.amount) : "—"}</td>
                  <td className="px-md py-2 text-slate-grey">{d.alignment_note ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ================= Impact Records ================= */

function ImpactTab({ dedication }: { dedication: Dedication }) {
  const { items, refresh } = useChild<ImpactRecord>("impact_records", dedication.id, { column: "recorded_date", ascending: false });
  const [creating, setCreating] = useState(false);
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) { setMessage("A description is required."); return; }
    setBusy(true);
    const { error } = await supabase.from("impact_records").insert({
      dedication_id: dedication.id, recorded_date: date || null,
      description: description.trim(), notes: notes.trim() || null,
    });
    setBusy(false);
    if (error) { setMessage("Could not save this Impact Record. Please try again."); return; }
    setDate(""); setDescription(""); setNotes(""); setCreating(false); setMessage(null);
    await refresh();
  }

  return (
    <div className="space-y-md">
      <div className="flex flex-wrap items-center justify-between gap-md">
        <p className="max-w-[48rem] text-sm text-slate-grey">
          Impact Records document observed effect — they inform Purpose Fidelity Review but are not
          themselves the measure of it.
        </p>
        {!creating && <button type="button" onClick={() => setCreating(true)} className={primaryBtn}>Record Impact</button>}
      </div>
      {creating && (
        <form onSubmit={submit} className={cardCls + " space-y-md"}>
          <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
            <div><label className={labelCls}>Recorded date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} /></div>
          </div>
          <div><label className={labelCls}>Description</label><textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Notes</label><textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} /></div>
          {message && <p className="text-sm text-slate-grey">{message}</p>}
          <div className="flex items-center gap-sm">
            <button type="submit" disabled={busy} className={primaryBtn}>{busy ? "Saving…" : "Save Impact Record"}</button>
            <button type="button" onClick={() => setCreating(false)} className={secondaryBtn}>Cancel</button>
          </div>
        </form>
      )}
      {items.length === 0 ? (
        <p className="text-sm text-slate-grey">No Impact Records yet.</p>
      ) : (
        <ul className="space-y-sm">
          {items.map((r) => (
            <li key={r.id} className={cardCls}>
              <div className="flex flex-wrap items-baseline justify-between gap-sm">
                <div className="text-sm text-kosha-navy whitespace-pre-wrap">{r.description}</div>
                <div className="font-numeral text-xs text-slate-grey">{formatDate(r.recorded_date)}</div>
              </div>
              {r.notes && <p className="mt-xs text-xs text-slate-grey">{r.notes}</p>}
              <p className="mt-sm text-[11px] text-slate-grey">
                Impact Records document observed effect — they inform Purpose Fidelity Review but are not themselves the measure of it.
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ================= Purpose Fidelity ================= */

type FidelitySection = "concerns" | "reviews";

function FidelityTab({ dedication }: { dedication: Dedication }) {
  const [section, setSection] = useState<FidelitySection>("concerns");
  return (
    <div className="space-y-md">
      <SubToggle
        value={section}
        onChange={setSection}
        options={[
          { key: "concerns", label: "Concerns" },
          { key: "reviews", label: "Reviews" },
        ]}
      />
      {section === "concerns" && <ConcernsSection dedicationId={dedication.id} />}
      {section === "reviews" && <ReviewsSection dedicationId={dedication.id} />}
      <RequestConclusionCard dedication={dedication} />
    </div>
  );
}

function RequestConclusionCard({ dedication }: { dedication: Dedication }) {
  const { participant } = useParticipant();
  const { pending, refresh } = useHasPendingRequest(
    participant?.id ?? null, "dedication", dedication.id, "Conclude",
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (dedication.concluded_at) {
    return (
      <div className={cardCls}>
        <div className={labelCls}>Dedication concluded</div>
        <div className="mt-xs font-numeral text-sm text-kosha-navy">{formatDate(dedication.concluded_at)}</div>
        <p className="mt-sm text-xs text-slate-grey">
          Concluded through Maker-Checker. The Philanthropic Purpose remains fixed and on file
          (DM-0006 §5.4); Conclusion recognises that the vehicle itself is being wound up.
        </p>
      </div>
    );
  }

  async function submit() {
    if (!participant) return;
    setBusy(true); setMessage(null);
    const { error } = await requestDedicationConclusion(dedication.id, dedication.name, participant.id);
    setBusy(false);
    if (error) { setMessage(error.message || "Could not submit this request."); return; }
    await refresh();
  }

  if (pending) {
    return (
      <div className={cardCls}>
        <div className={labelCls}>Conclusion request pending</div>
        <p className="mt-xs text-sm text-slate-grey">
          An Enforcer linked to this Dedication can approve or deny on the Review workspace.
          Purpose remains fixed regardless of the decision.
        </p>
      </div>
    );
  }

  return (
    <div className={cardCls + " space-y-sm"}>
      <h3 className="font-display text-[18px] leading-[26px] text-kosha-navy">Request Conclusion</h3>
      <p className="text-xs text-slate-grey">
        Conclusion recognises this vehicle is being wound up — never a redirection of Purpose,
        which is fixed. An Enforcer of this Dedication (not a domain-wide Steward) must approve.
      </p>
      {message && <p className="text-sm text-slate-grey">{message}</p>}
      <button type="button" onClick={submit} disabled={busy || !participant} className={primaryBtn}>
        {busy ? "Submitting…" : "Send for Enforcer approval"}
      </button>
    </div>
  );
}

function ConcernsSection({ dedicationId }: { dedicationId: string }) {
  const { items, refresh } = useChild<Concern>("purpose_fidelity_concerns", dedicationId, { column: "raised_at", ascending: false });
  const [filter, setFilter] = useState<"all" | ConcernStatus>("all");
  const [creating, setCreating] = useState(false);
  const [type, setType] = useState<ConcernType>("Drift");
  const [description, setDescription] = useState("");
  const [escalated, setEscalated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolveNote, setResolveNote] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) { setMessage("A description is required."); return; }
    setBusy(true);
    const { error } = await supabase.from("purpose_fidelity_concerns").insert({
      dedication_id: dedicationId, concern_type: type, description: description.trim(),
      escalated_to_enforcer: escalated,
    });
    setBusy(false);
    if (error) { setMessage("Could not raise this Concern. Please try again."); return; }
    setDescription(""); setEscalated(false); setType("Drift"); setCreating(false); setMessage(null);
    await refresh();
  }

  async function markResolved(id: string) {
    await supabase.from("purpose_fidelity_concerns").update({
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
          <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
            <div>
              <label className={labelCls}>Concern type</label>
              <select value={type} onChange={(e) => setType(e.target.value as ConcernType)} className={inputCls}>
                <option value="Drift">Drift</option>
                <option value="Capture">Capture</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          <div><label className={labelCls}>Description</label><textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} /></div>
          <label className="flex items-center gap-sm text-sm text-kosha-navy">
            <input type="checkbox" checked={escalated} onChange={(e) => setEscalated(e.target.checked)} />
            Already raised with the Enforcer
          </label>
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
                    {c.escalated_to_enforcer && (
                      <span className="rounded px-2 py-0.5 text-[10px] uppercase tracking-widest bg-pure-white text-slate-grey ring-1 ring-[color:var(--color-border-default)]">
                        Escalated to Enforcer
                      </span>
                    )}
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
                    Resolving a Concern is a routine governance outcome — the Purpose itself is unchanged.
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

function ReviewsSection({ dedicationId }: { dedicationId: string }) {
  const { items, refresh } = useChild<PfReview>("purpose_fidelity_reviews", dedicationId, { column: "reviewed_at", ascending: false });
  const [creating, setCreating] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    await supabase.from("purpose_fidelity_reviews").insert({ dedication_id: dedicationId, note: note.trim() || null });
    setBusy(false); setNote(""); setCreating(false);
    await refresh();
  }

  return (
    <div className="space-y-md">
      <div className="flex flex-wrap items-center justify-between gap-md">
        <p className="max-w-[48rem] text-sm text-slate-grey">
          A Purpose Fidelity Review records that the Steward has confirmed Purpose is still being served.
          No cadence is enforced.
        </p>
        {!creating && <button type="button" onClick={() => setCreating(true)} className={primaryBtn}>Record Purpose Fidelity Review</button>}
      </div>
      {creating && (
        <form onSubmit={submit} className={cardCls + " space-y-md"}>
          <div><label className={labelCls}>Note (optional)</label><textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} /></div>
          <div className="flex items-center gap-sm">
            <button type="submit" disabled={busy} className={primaryBtn}>{busy ? "Saving…" : "Save Review"}</button>
            <button type="button" onClick={() => setCreating(false)} className={secondaryBtn}>Cancel</button>
          </div>
        </form>
      )}
      {items.length === 0 ? (
        <p className="text-sm text-slate-grey">No Reviews recorded yet.</p>
      ) : (
        <ul className="space-y-sm">
          {items.map((r) => (
            <li key={r.id} className={cardCls}>
              <div className="font-numeral text-xs text-slate-grey">{formatDate(r.reviewed_at)}</div>
              {r.note && <p className="mt-xs text-sm text-slate-grey whitespace-pre-wrap">{r.note}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}