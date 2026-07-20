import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useParticipant } from "@/lib/participant";
import { formatINR } from "@/lib/estate";
import {
  BENEFICIARY_TYPES,
  TRUSTEE_ROLES,
  useBeneficiaries,
  useProtectors,
  useSettlors,
  useTrustees,
  useTrustInstruments,
  useTrustProperty,
  useTrusts,
  type BeneficiaryType,
  type Trust,
  type TrustInstrument,
  type TrusteeRole,
} from "@/lib/trust";

export const Route = createFileRoute("/_authenticated/trust-administration")({
  component: TrustAdministrationPage,
});

type TabKey = "overview" | "stewardship" | "beneficiaries" | "property" | "instrument";
const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "stewardship", label: "Stewardship" },
  { key: "beneficiaries", label: "Beneficiaries" },
  { key: "property", label: "Trust Property" },
  { key: "instrument", label: "Trust Instrument" },
];

const inputCls =
  "mt-xs w-full rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-md py-2 text-sm text-kosha-navy";
const labelCls = "text-xs uppercase tracking-widest text-slate-grey";
const primaryBtn =
  "rounded-md bg-kosha-navy px-md py-2 text-sm font-semibold text-vault-ivory hover:bg-kosha-navy/90 disabled:opacity-40";
const secondaryBtn =
  "rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-md py-2 text-sm font-semibold text-kosha-navy hover:bg-vault-ivory";
const cardCls =
  "rounded-md bg-pure-white p-md shadow-[var(--shadow-1)] ring-1 ring-[color:var(--color-border-default)]";

function TrustAdministrationPage() {
  const { participant } = useParticipant();
  const { trusts, loading, refresh } = useTrusts(participant?.id ?? null);
  const [tab, setTab] = useState<TabKey>("overview");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (trusts.length === 0) { setSelectedId(null); return; }
    const stored = typeof window !== "undefined" ? window.localStorage.getItem("koshagra.subject") : null;
    const match = stored && trusts.find((t) => t.id === stored);
    if (match) setSelectedId(match.id);
    else if (trusts.length === 1) setSelectedId(trusts[0].id);
    else setSelectedId((prev) => (prev && trusts.some((t) => t.id === prev) ? prev : null));
  }, [trusts]);

  const trust = trusts.find((t) => t.id === selectedId) ?? null;

  if (loading) {
    return (
      <section aria-busy="true" className="max-w-[64rem]">
        <div className="inline-flex items-center gap-sm text-sm text-slate-grey">
          <span className="h-2 w-2 rounded-full bg-slate-grey animate-pulse" aria-hidden />
          Loading your Trust…
        </div>
      </section>
    );
  }

  if (trusts.length === 0) {
    return (
      <section className="max-w-[42rem]">
        <div className={cardCls}>
          <h2 className="font-display text-[20px] leading-[28px] text-kosha-navy">
            No Trust yet
          </h2>
          <p className="mt-xs text-sm text-slate-grey">
            Trust Administration governs an already-created Trust — its Trustees, Protectors,
            Beneficiaries, Trust Property, and recorded Trust Instrument. Create your Trust as a
            Continuity Subject in Institution Registry to begin.
          </p>
          <Link to="/institution-registry" className={"mt-md inline-flex items-center " + primaryBtn}>
            Open Institution Registry
          </Link>
        </div>
      </section>
    );
  }

  if (!trust) {
    return (
      <section className="max-w-[42rem]">
        <div className={cardCls}>
          <h2 className="font-display text-[20px] leading-[28px] text-kosha-navy">
            Choose a Trust
          </h2>
          <p className="mt-xs text-sm text-slate-grey">
            You steward more than one Trust. Pick one to open its administration workspace —
            you can switch at any time from the Workspace Switcher in the header.
          </p>
          <ul className="mt-md space-y-xs">
            {trusts.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(t.id);
                    window.localStorage.setItem("koshagra.subject", t.id);
                  }}
                  className="w-full rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-md py-3 text-left text-sm text-kosha-navy hover:bg-vault-ivory"
                >
                  {t.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-[72rem]">
      <TabBar tab={tab} onChange={setTab} />
      <div className="mt-lg">
        {tab === "overview" && <OverviewTab trust={trust} onRefreshTrust={refresh} />}
        {tab === "stewardship" && <StewardshipTab trust={trust} />}
        {tab === "beneficiaries" && <BeneficiariesTab trust={trust} />}
        {tab === "property" && <TrustPropertyTab trust={trust} />}
        {tab === "instrument" && <InstrumentTab trust={trust} />}
      </div>
    </section>
  );
}

function TabBar({ tab, onChange }: { tab: TabKey; onChange: (t: TabKey) => void }) {
  return (
    <div role="tablist" aria-label="Trust Administration sections" className="flex flex-wrap gap-lg border-b border-[color:var(--color-border-default)]">
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

/* ================= Overview ================= */

function OverviewTab({ trust, onRefreshTrust }: { trust: Trust; onRefreshTrust: () => Promise<void> | void }) {
  const { items: settlors } = useSettlors(trust.id);
  const { items: trustees } = useTrustees(trust.id);
  const { items: protectors } = useProtectors(trust.id);
  const { items: beneficiaries } = useBeneficiaries(trust.id);
  const { items: property } = useTrustProperty(trust.id);
  const { items: instruments } = useTrustInstruments(trust.id);
  const [editing, setEditing] = useState(false);

  const trusteeCount = trustees.filter((t) => t.trustee_role === "Trustee").length;
  const successorTrusteeCount = trustees.filter((t) => t.trustee_role === "Successor Trustee").length;
  const namedBens = beneficiaries.filter((b) => b.beneficiary_type === "Named").length;
  const classBens = beneficiaries.filter((b) => b.beneficiary_type === "Class").length;
  const latestInstrument = instruments[0] ?? null;

  const lastUpdatedIso = useMemo(() => {
    const candidates: (string | null | undefined)[] = [
      trust.updated_at, trust.created_at,
      ...settlors.flatMap((s) => [s.updated_at, s.created_at]),
      ...trustees.flatMap((t) => [t.updated_at, t.created_at]),
      ...protectors.flatMap((p) => [p.updated_at, p.created_at]),
      ...beneficiaries.flatMap((b) => [b.updated_at, b.created_at]),
      ...property.flatMap((p) => [p.updated_at, p.created_at]),
      ...instruments.flatMap((i) => [i.updated_at, i.created_at]),
    ];
    const times = candidates
      .filter((v): v is string => !!v)
      .map((v) => new Date(v).getTime())
      .filter((n) => Number.isFinite(n));
    if (times.length === 0) return null;
    return new Date(Math.max(...times)).toISOString();
  }, [trust, settlors, trustees, protectors, beneficiaries, property, instruments]);

  const lastUpdatedLabel = lastUpdatedIso
    ? new Date(lastUpdatedIso).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" })
    : null;

  const instrumentIndicator = latestInstrument
    ? `Recorded${latestInstrument.executed_date ? ` · executed ${new Date(latestInstrument.executed_date).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" })}` : ""}`
    : "Not yet recorded";

  return (
    <div className="space-y-xl">
      <header>
        <h2 className="font-display text-[28px] leading-[36px] text-kosha-navy">{trust.name}</h2>
        <PurposeBlock
          trust={trust}
          editing={editing}
          onEdit={() => setEditing(true)}
          onDone={async () => { setEditing(false); await onRefreshTrust(); }}
          onCancel={() => setEditing(false)}
        />
        {lastUpdatedLabel && (
          <p className="mt-xs text-xs text-slate-grey">
            Last updated <span className="font-numeral">{lastUpdatedLabel}</span>
          </p>
        )}
      </header>

      <div>
        <div className={labelCls}>Status snapshot</div>
        <div className="mt-sm grid grid-cols-2 gap-md sm:grid-cols-3 lg:grid-cols-4">
          <StatCard label="Settlors" value={settlors.length} />
          <StatCard label="Trustees" value={trusteeCount} />
          <StatCard label="Successor Trustees" value={successorTrusteeCount} />
          <StatCard label="Protectors" value={protectors.length} />
          <StatCard label="Named Beneficiaries" value={namedBens} />
          <StatCard label="Classes of Beneficiaries" value={classBens} />
          <StatCard label="Trust Property" value={property.length} />
          <StatCard label="Trust Instrument" value={instrumentIndicator} numeric={false} />
        </div>
      </div>
    </div>
  );
}

function PurposeBlock({
  trust, editing, onEdit, onDone, onCancel,
}: {
  trust: Trust; editing: boolean; onEdit: () => void; onDone: () => void; onCancel: () => void;
}) {
  const [draft, setDraft] = useState(trust.purpose_description ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => { setDraft(trust.purpose_description ?? ""); }, [trust.id, trust.purpose_description]);

  async function save() {
    setBusy(true); setMessage(null);
    const { error } = await supabase
      .from("continuity_subjects")
      .update({ purpose_description: draft.trim() === "" ? null : draft.trim() })
      .eq("id", trust.id);
    setBusy(false);
    if (error) { setMessage("Could not save the Trust Purpose. Please try again."); return; }
    onDone();
  }

  if (!editing) {
    return (
      <div className="mt-xs flex flex-wrap items-start gap-md">
        <p className="max-w-[48rem] text-sm text-slate-grey">
          {trust.purpose_description ?? "No Trust Purpose recorded yet."}
        </p>
        <button type="button" onClick={onEdit} className="rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-sm py-1 text-xs font-semibold text-kosha-navy hover:bg-vault-ivory">
          Edit Purpose
        </button>
      </div>
    );
  }

  return (
    <div className="mt-sm max-w-[48rem]">
      <label htmlFor="trust-purpose" className={labelCls}>Trust Purpose</label>
      <textarea
        id="trust-purpose"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={4}
        className={inputCls}
      />
      <p className="mt-xs text-xs text-slate-grey">
        Purpose may be refined in expression across the Trust's life — the owning Participant records the change.
      </p>
      {message && <p className="mt-sm text-sm text-slate-grey">{message}</p>}
      <div className="mt-sm flex items-center gap-sm">
        <button type="button" disabled={busy} onClick={save} className={primaryBtn}>
          {busy ? "Saving…" : "Save Purpose"}
        </button>
        <button type="button" onClick={onCancel} className={secondaryBtn}>Cancel</button>
      </div>
    </div>
  );
}

/* ================= Stewardship ================= */

type StewardshipSection = "settlors" | "trustees" | "protectors";

function StewardshipTab({ trust }: { trust: Trust }) {
  const [section, setSection] = useState<StewardshipSection>("trustees");
  return (
    <div>
      <SubToggle
        value={section}
        onChange={setSection}
        options={[
          { key: "settlors", label: "Settlor" },
          { key: "trustees", label: "Trustees" },
          { key: "protectors", label: "Protectors" },
        ]}
      />
      <div className="mt-md">
        {section === "settlors" && <SettlorsSection trustId={trust.id} />}
        {section === "trustees" && <TrusteesSection trustId={trust.id} />}
        {section === "protectors" && <ProtectorsSection trustId={trust.id} />}
      </div>
    </div>
  );
}

function SettlorsSection({ trustId }: { trustId: string }) {
  const { items, refresh } = useSettlors(trustId);
  const [creating, setCreating] = useState(false);
  const [fullName, setFullName] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) { setMessage("A full name is required."); return; }
    setBusy(true);
    const { error } = await supabase.from("settlors").insert({
      trust_id: trustId, full_name: fullName.trim(), notes: notes.trim() || null,
    });
    setBusy(false);
    if (error) { setMessage("Could not save this Settlor. Please try again."); return; }
    setFullName(""); setNotes(""); setCreating(false);
    await refresh();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-md">
        <p className="text-sm text-slate-grey">
          {items.length === 0
            ? "No Settlor recorded yet. A Trust may have one or more co-Settlors."
            : `${items.length} Settlor${items.length === 1 ? "" : "s"} recorded.`}
        </p>
        {!creating && (
          <button type="button" onClick={() => setCreating(true)} className={primaryBtn}>Add Settlor</button>
        )}
      </div>
      {creating && (
        <form onSubmit={submit} className={"mt-md " + cardCls}>
          <label className="block">
            <span className={labelCls}>Full name</span>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} />
          </label>
          <label className="mt-md block">
            <span className={labelCls}>Notes (optional)</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputCls} />
          </label>
          {message && <p className="mt-sm text-sm text-slate-grey">{message}</p>}
          <div className="mt-md flex items-center gap-sm">
            <button type="submit" disabled={busy} className={primaryBtn}>{busy ? "Saving…" : "Save Settlor"}</button>
            <button type="button" onClick={() => setCreating(false)} className={secondaryBtn}>Cancel</button>
          </div>
        </form>
      )}
      {items.length > 0 && (
        <ul className="mt-md space-y-xs">
          {items.map((s) => (
            <li key={s.id} className={cardCls}>
              <div className="text-sm text-kosha-navy">{s.full_name}</div>
              {s.notes && <div className="mt-xs text-xs text-slate-grey">{s.notes}</div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TrusteesSection({ trustId }: { trustId: string }) {
  const { items, refresh } = useTrustees(trustId);
  const [creating, setCreating] = useState(false);
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<TrusteeRole>("Trustee");
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) { setMessage("A full name is required."); return; }
    setBusy(true);
    const { error } = await supabase.from("trustees").insert({
      trust_id: trustId,
      full_name: fullName.trim(),
      trustee_role: role,
      source_of_authority_note: source.trim() || null,
      notes: notes.trim() || null,
    });
    setBusy(false);
    if (error) { setMessage("Could not save this Trustee. Please try again."); return; }
    setFullName(""); setRole("Trustee"); setSource(""); setNotes(""); setCreating(false);
    await refresh();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-md">
        <p className="text-sm text-slate-grey">
          {items.length === 0
            ? "No Trustees recorded yet. Trusteeship is a single line — Successor Trustees are recorded as a Type here, not as a parallel Trustee."
            : `${items.length} Trustee${items.length === 1 ? "" : "s"} recorded. Replacing a Trustee requires Maker-Checker Authority this build doesn't yet support.`}
        </p>
        {!creating && (
          <button type="button" onClick={() => setCreating(true)} className={primaryBtn}>Add Trustee</button>
        )}
      </div>
      {creating && (
        <form onSubmit={submit} className={"mt-md " + cardCls}>
          <div className="grid grid-cols-1 gap-md sm:grid-cols-3">
            <label className="block">
              <span className={labelCls}>Full name</span>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} />
            </label>
            <label className="block">
              <span className={labelCls}>Trustee role</span>
              <select value={role} onChange={(e) => setRole(e.target.value as TrusteeRole)} className={inputCls}>
                {TRUSTEE_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
            <label className="block">
              <span className={labelCls}>Source of Authority note (optional)</span>
              <input
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="e.g. Testamentary, per Trust Instrument"
                className={inputCls}
              />
            </label>
          </div>
          <label className="mt-md block">
            <span className={labelCls}>Notes (optional)</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputCls} />
          </label>
          {message && <p className="mt-sm text-sm text-slate-grey">{message}</p>}
          <div className="mt-md flex items-center gap-sm">
            <button type="submit" disabled={busy} className={primaryBtn}>{busy ? "Saving…" : "Save Trustee"}</button>
            <button type="button" onClick={() => setCreating(false)} className={secondaryBtn}>Cancel</button>
          </div>
        </form>
      )}
      {items.length > 0 && (
        <ul className="mt-md space-y-xs">
          {items.map((t) => (
            <li key={t.id} className={"flex flex-wrap items-start justify-between gap-md " + cardCls}>
              <div className="min-w-0">
                <div className="text-sm text-kosha-navy">{t.full_name}</div>
                {t.source_of_authority_note && (
                  <div className="text-xs text-slate-grey"><span className="font-semibold">Source of Authority · </span>{t.source_of_authority_note}</div>
                )}
                {t.notes && <div className="mt-xs text-xs text-slate-grey">{t.notes}</div>}
              </div>
              <span className="inline-flex items-center rounded-full bg-kosha-navy px-sm py-1 text-xs font-semibold text-vault-ivory">
                {t.trustee_role}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ProtectorsSection({ trustId }: { trustId: string }) {
  const { items, refresh } = useProtectors(trustId);
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
    const { error } = await supabase.from("protectors").insert({
      trust_id: trustId,
      full_name: fullName.trim(),
      scope_note: scope.trim() || null,
      notes: notes.trim() || null,
    });
    setBusy(false);
    if (error) { setMessage("Could not save this Protector. Please try again."); return; }
    setFullName(""); setScope(""); setNotes(""); setCreating(false);
    await refresh();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-md">
        <p className="text-sm text-slate-grey">
          {items.length === 0
            ? "No Protectors recorded yet. A Protector's role is narrower than a Trustee's — they check Trustee acts within a recorded scope, they do not administer Trust Property."
            : `${items.length} Protector${items.length === 1 ? "" : "s"} recorded. Exercising a Protector's checking power requires Maker-Checker Authority this build doesn't yet support.`}
        </p>
        {!creating && (
          <button type="button" onClick={() => setCreating(true)} className={primaryBtn}>Add Protector</button>
        )}
      </div>
      {creating && (
        <form onSubmit={submit} className={"mt-md " + cardCls}>
          <label className="block">
            <span className={labelCls}>Full name</span>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} />
          </label>
          <label className="mt-md block">
            <span className={labelCls}>Scope of checking powers (optional)</span>
            <textarea
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              rows={3}
              placeholder="e.g. May remove and replace Trustee; consents to distributions over a stated threshold"
              className={inputCls}
            />
          </label>
          <label className="mt-md block">
            <span className={labelCls}>Notes (optional)</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputCls} />
          </label>
          {message && <p className="mt-sm text-sm text-slate-grey">{message}</p>}
          <div className="mt-md flex items-center gap-sm">
            <button type="submit" disabled={busy} className={primaryBtn}>{busy ? "Saving…" : "Save Protector"}</button>
            <button type="button" onClick={() => setCreating(false)} className={secondaryBtn}>Cancel</button>
          </div>
        </form>
      )}
      {items.length > 0 && (
        <ul className="mt-md space-y-xs">
          {items.map((p) => (
            <li key={p.id} className={cardCls}>
              <div className="text-sm text-kosha-navy">{p.full_name}</div>
              {p.scope_note && (
                <div className="mt-xs text-xs text-slate-grey"><span className="font-semibold">Scope · </span>{p.scope_note}</div>
              )}
              {p.notes && <div className="mt-xs text-xs text-slate-grey">{p.notes}</div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ================= Beneficiaries ================= */

function BeneficiariesTab({ trust }: { trust: Trust }) {
  const [section, setSection] = useState<BeneficiaryType>("Named");
  return (
    <div>
      <SubToggle
        value={section}
        onChange={setSection}
        options={[
          { key: "Named", label: "Named Beneficiaries" },
          { key: "Class", label: "Classes of Beneficiaries" },
        ]}
      />
      <div className="mt-md">
        <BeneficiariesSection trustId={trust.id} kind={section} />
      </div>
    </div>
  );
}

function BeneficiariesSection({ trustId, kind }: { trustId: string; kind: BeneficiaryType }) {
  const { items, refresh } = useBeneficiaries(trustId);
  const visible = items.filter((b) => b.beneficiary_type === kind);
  const [creating, setCreating] = useState(false);
  const [nameOrDesc, setNameOrDesc] = useState("");
  const [entitlement, setEntitlement] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const isNamed = kind === "Named";
  const emptyLabel = isNamed
    ? "No Named Beneficiaries recorded yet."
    : "No Classes of Beneficiaries recorded yet — a Class is a described population, e.g. \"Settlor's grandchildren, per stirpes\".";
  const inputPlaceholder = isNamed ? "Full name" : "Described population";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!nameOrDesc.trim()) { setMessage(isNamed ? "A name is required." : "A described population is required."); return; }
    setBusy(true);
    const { error } = await supabase.from("beneficiaries").insert({
      trust_id: trustId,
      beneficiary_type: kind,
      name_or_description: nameOrDesc.trim(),
      entitlement_note: entitlement.trim() || null,
      notes: notes.trim() || null,
    });
    setBusy(false);
    if (error) { setMessage("Could not save this Beneficiary record. Please try again."); return; }
    setNameOrDesc(""); setEntitlement(""); setNotes(""); setCreating(false);
    await refresh();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-md">
        <p className="text-sm text-slate-grey">
          {visible.length === 0
            ? emptyLabel
            : `${visible.length} ${isNamed ? "Named Beneficiary" : "Class"}${visible.length === 1 ? "" : isNamed ? "ies" : "es"} recorded. Standing here is a protected interest — not an administering Role.`}
        </p>
        {!creating && (
          <button type="button" onClick={() => setCreating(true)} className={primaryBtn}>
            {isNamed ? "Add Named Beneficiary" : "Add Class"}
          </button>
        )}
      </div>
      {creating && (
        <form onSubmit={submit} className={"mt-md " + cardCls}>
          <label className="block">
            <span className={labelCls}>{isNamed ? "Full name" : "Described population"}</span>
            <input
              value={nameOrDesc}
              onChange={(e) => setNameOrDesc(e.target.value)}
              placeholder={inputPlaceholder}
              className={inputCls}
            />
          </label>
          <label className="mt-md block">
            <span className={labelCls}>Entitlement (optional)</span>
            <textarea
              value={entitlement}
              onChange={(e) => setEntitlement(e.target.value)}
              rows={3}
              placeholder="Present, future, or contingent, in plain language"
              className={inputCls}
            />
          </label>
          <label className="mt-md block">
            <span className={labelCls}>Notes (optional)</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputCls} />
          </label>
          {message && <p className="mt-sm text-sm text-slate-grey">{message}</p>}
          <div className="mt-md flex items-center gap-sm">
            <button type="submit" disabled={busy} className={primaryBtn}>{busy ? "Saving…" : "Save"}</button>
            <button type="button" onClick={() => setCreating(false)} className={secondaryBtn}>Cancel</button>
          </div>
        </form>
      )}
      {visible.length > 0 && (
        <ul className="mt-md space-y-xs">
          {visible.map((b) => (
            <li key={b.id} className={cardCls}>
              <div className="flex flex-wrap items-start justify-between gap-md">
                <div className="min-w-0">
                  <div className="text-sm text-kosha-navy">{b.name_or_description}</div>
                  {b.entitlement_note && (
                    <div className="mt-xs text-xs text-slate-grey"><span className="font-semibold">Entitlement · </span>{b.entitlement_note}</div>
                  )}
                  {b.notes && <div className="mt-xs text-xs text-slate-grey">{b.notes}</div>}
                </div>
                <span className="inline-flex items-center rounded-full bg-vault-ivory ring-1 ring-[color:var(--color-border-default)] px-sm py-1 text-xs font-semibold text-kosha-navy">
                  {b.beneficiary_type}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ================= Trust Property ================= */

function TrustPropertyTab({ trust }: { trust: Trust }) {
  const { items, refresh } = useTrustProperty(trust.id);
  const [creating, setCreating] = useState(false);
  const [description, setDescription] = useState("");
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) { setMessage("A property description is required."); return; }
    const numericValue = value.trim() === "" ? null : Number(value);
    if (numericValue !== null && !Number.isFinite(numericValue)) {
      setMessage("Estimated value must be a number."); return;
    }
    setBusy(true);
    const { error } = await supabase.from("trust_property").insert({
      trust_id: trust.id,
      property_description: description.trim(),
      estimated_value: numericValue,
      notes: notes.trim() || null,
    });
    setBusy(false);
    if (error) { setMessage("Could not save this Trust Property record. Please try again."); return; }
    setDescription(""); setValue(""); setNotes(""); setCreating(false);
    await refresh();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-md">
        <p className="text-sm text-slate-grey">
          {items.length === 0
            ? "No Trust Property recorded yet. Trust Property is what the Trustee holds and administers under the Trust Instrument."
            : `${items.length} item${items.length === 1 ? "" : "s"} of Trust Property recorded.`}
        </p>
        {!creating && (
          <button type="button" onClick={() => setCreating(true)} className={primaryBtn}>Add Trust Property</button>
        )}
      </div>

      {creating && (
        <form onSubmit={submit} className={"mt-md " + cardCls}>
          <label className="block">
            <span className={labelCls}>Property description</span>
            <input value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} />
          </label>
          <label className="mt-md block sm:max-w-xs">
            <span className={labelCls}>Estimated value (optional)</span>
            <input
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="e.g. 12500000"
              className={inputCls}
            />
          </label>
          <label className="mt-md block">
            <span className={labelCls}>Notes (optional)</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputCls} />
          </label>
          {message && <p className="mt-sm text-sm text-slate-grey">{message}</p>}
          <div className="mt-md flex items-center gap-sm">
            <button type="submit" disabled={busy} className={primaryBtn}>{busy ? "Saving…" : "Save Trust Property"}</button>
            <button type="button" onClick={() => setCreating(false)} className={secondaryBtn}>Cancel</button>
          </div>
        </form>
      )}

      {items.length > 0 && (
        <div className="mt-md overflow-hidden rounded-md bg-pure-white shadow-[var(--shadow-1)] ring-1 ring-[color:var(--color-border-default)]">
          <table className="w-full text-left text-sm">
            <thead className="bg-vault-ivory text-xs uppercase tracking-widest text-slate-grey">
              <tr>
                <th className="px-md py-3 font-semibold">Description</th>
                <th className="px-md py-3 font-semibold">Estimated value</th>
                <th className="px-md py-3 font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-t border-[color:var(--color-border-default)]">
                  <td className="px-md py-3 text-kosha-navy">{p.property_description}</td>
                  <td className="px-md py-3 font-numeral text-kosha-navy">
                    {p.estimated_value !== null ? formatINR(p.estimated_value) : <span className="text-slate-grey">—</span>}
                  </td>
                  <td className="px-md py-3 text-slate-grey">{p.notes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ================= Trust Instrument ================= */

function InstrumentTab({ trust }: { trust: Trust }) {
  const { items, refresh } = useTrustInstruments(trust.id);
  const [creating, setCreating] = useState(false);

  const nextVersion = items.length > 0 ? Math.max(...items.map((i) => i.version)) + 1 : 1;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-md">
        <p className="max-w-[48rem] text-sm text-slate-grey">
          Record the already-executed Trust Instrument here for reference. Amendments are recorded
          as a new entry with an incremented version.
        </p>
        {!creating && (
          <button type="button" onClick={() => setCreating(true)} className={primaryBtn}>
            {items.length === 0 ? "Record Trust Instrument" : "Record Amendment"}
          </button>
        )}
      </div>

      {creating && (
        <InstrumentForm
          trustId={trust.id}
          defaultVersion={nextVersion}
          onCancel={() => setCreating(false)}
          onCreated={async () => { setCreating(false); await refresh(); }}
        />
      )}

      <div className="mt-md space-y-md">
        {items.length === 0 && !creating && (
          <p className="text-sm text-slate-grey">No Trust Instrument recorded yet.</p>
        )}
        {items.map((i) => <InstrumentCard key={i.id} instrument={i} onChanged={refresh} />)}
      </div>
    </div>
  );
}

function InstrumentForm({
  trustId, defaultVersion, onCancel, onCreated,
}: { trustId: string; defaultVersion: number; onCancel: () => void; onCreated: () => Promise<void> | void }) {
  const [title, setTitle] = useState("Trust Instrument");
  const [executedDate, setExecutedDate] = useState("");
  const [body, setBody] = useState("");
  const [version, setVersion] = useState(String(defaultVersion));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setMessage("A title is required."); return; }
    const v = Number(version);
    if (!Number.isInteger(v) || v < 1) { setMessage("Version must be a whole number (1 or greater)."); return; }
    setBusy(true);
    const { error } = await supabase.from("trust_instruments").insert({
      trust_id: trustId,
      title: title.trim(),
      executed_date: executedDate.trim() === "" ? null : executedDate,
      body,
      version: v,
    });
    setBusy(false);
    if (error) { setMessage("Could not save this Trust Instrument record. Please try again."); return; }
    await onCreated();
  }

  return (
    <form onSubmit={submit} className={"mt-md " + cardCls}>
      <div className="grid grid-cols-1 gap-md sm:grid-cols-3">
        <label className="block sm:col-span-2">
          <span className={labelCls}>Title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
        </label>
        <label className="block">
          <span className={labelCls}>Version</span>
          <input
            inputMode="numeric"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            className={inputCls}
          />
        </label>
      </div>
      <label className="mt-md block sm:max-w-xs">
        <span className={labelCls}>Executed date (optional)</span>
        <input type="date" value={executedDate} onChange={(e) => setExecutedDate(e.target.value)} className={inputCls} />
      </label>
      <label className="mt-md block">
        <span className={labelCls}>Recorded terms</span>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} className={inputCls} />
      </label>
      {message && <p className="mt-sm text-sm text-slate-grey">{message}</p>}
      <div className="mt-md flex items-center gap-sm">
        <button type="submit" disabled={busy} className={primaryBtn}>{busy ? "Saving…" : "Save record"}</button>
        <button type="button" onClick={onCancel} className={secondaryBtn}>Cancel</button>
      </div>
    </form>
  );
}

function InstrumentCard({ instrument, onChanged }: { instrument: TrustInstrument; onChanged: () => Promise<void> | void }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(instrument.title);
  const [executedDate, setExecutedDate] = useState(instrument.executed_date ?? "");
  const [body, setBody] = useState(instrument.body);
  const [version, setVersion] = useState(String(instrument.version));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setTitle(instrument.title);
    setExecutedDate(instrument.executed_date ?? "");
    setBody(instrument.body);
    setVersion(String(instrument.version));
  }, [instrument.id, instrument.title, instrument.executed_date, instrument.body, instrument.version]);

  async function save() {
    if (!title.trim()) { setMessage("A title is required."); return; }
    const v = Number(version);
    if (!Number.isInteger(v) || v < 1) { setMessage("Version must be a whole number (1 or greater)."); return; }
    setBusy(true);
    const { error } = await supabase
      .from("trust_instruments")
      .update({
        title: title.trim(),
        executed_date: executedDate.trim() === "" ? null : executedDate,
        body,
        version: v,
      })
      .eq("id", instrument.id);
    setBusy(false);
    if (error) { setMessage("Could not save this Trust Instrument record. Please try again."); return; }
    setEditing(false);
    await onChanged();
  }

  const executedLabel = instrument.executed_date
    ? new Date(instrument.executed_date).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" })
    : "Execution date not recorded";

  return (
    <article className={cardCls}>
      <div className="flex flex-wrap items-start justify-between gap-md">
        <div className="min-w-0">
          <h3 className="font-display text-[20px] leading-[28px] text-kosha-navy">{instrument.title}</h3>
          <p className="mt-xs text-xs text-slate-grey">
            <span className="font-numeral">v{instrument.version}</span> · <span className="font-numeral">{executedLabel}</span>
          </p>
        </div>
        {!editing && (
          <button type="button" onClick={() => setEditing(true)} className={secondaryBtn}>Edit record</button>
        )}
      </div>

      {!editing ? (
        <>
          <p className="mt-md whitespace-pre-wrap text-sm text-kosha-navy">
            {instrument.body.trim() === "" ? <span className="text-slate-grey">No terms recorded.</span> : instrument.body}
          </p>
          <p className="mt-md text-xs text-slate-grey">
            Recorded here for reference. Koshagra does not draft, execute, or activate a Trust
            Instrument — this reflects an already-executed legal document.
          </p>
        </>
      ) : (
        <div className="mt-md">
          <div className="grid grid-cols-1 gap-md sm:grid-cols-3">
            <label className="block sm:col-span-2">
              <span className={labelCls}>Title</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
            </label>
            <label className="block">
              <span className={labelCls}>Version</span>
              <input inputMode="numeric" value={version} onChange={(e) => setVersion(e.target.value)} className={inputCls} />
            </label>
          </div>
          <label className="mt-md block sm:max-w-xs">
            <span className={labelCls}>Executed date (optional)</span>
            <input type="date" value={executedDate} onChange={(e) => setExecutedDate(e.target.value)} className={inputCls} />
          </label>
          <label className="mt-md block">
            <span className={labelCls}>Recorded terms</span>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={10} className={inputCls} />
          </label>
          {message && <p className="mt-sm text-sm text-slate-grey">{message}</p>}
          <div className="mt-md flex items-center gap-sm">
            <button type="button" disabled={busy} onClick={save} className={primaryBtn}>{busy ? "Saving…" : "Save changes"}</button>
            <button type="button" onClick={() => setEditing(false)} className={secondaryBtn}>Cancel</button>
          </div>
          <p className="mt-md text-xs text-slate-grey">
            Recorded here for reference. Koshagra does not draft, execute, or activate a Trust
            Instrument — this reflects an already-executed legal document.
          </p>
        </div>
      )}
    </article>
  );
}