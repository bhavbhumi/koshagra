import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useParticipant } from "@/lib/participant";
import { WorkspaceIntro } from "@/components/shell/WorkspaceIntro";
import {
  ASSET_TYPES,
  LIFECYCLE_STAGES,
  NOMINATION_ROLES,
  REACHABLE_STAGES,
  computeCurrentStage,
  formatINR,
  useAssets,
  useEstate,
  useLiabilities,
  useNominations,
  useWill,
  type AssetTypeName,
  type Estate,
  type LifecycleStage,
  type NominationRole,
} from "@/lib/estate";

export const Route = createFileRoute("/_authenticated/estate-planning")({
  component: EstatePlanningPage,
});

type TabKey = "overview" | "will" | "register" | "nominations" | "timeline";
const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "will", label: "Will" },
  { key: "register", label: "Asset & Liability Register" },
  { key: "nominations", label: "Nominations" },
  { key: "timeline", label: "Timeline" },
];

function formatEnInDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    year: "numeric", month: "short", day: "2-digit",
  });
}

function EstatePlanningPage() {
  const { participant } = useParticipant();
  const { estate, loading } = useEstate(participant?.id ?? null);
  const [tab, setTab] = useState<TabKey>("overview");

  if (loading) {
    return (
      <section aria-busy="true" className="max-w-[64rem]">
        <div className="inline-flex items-center gap-sm text-sm text-slate-grey">
          <span className="h-2 w-2 rounded-full bg-slate-grey animate-pulse" aria-hidden />
          Loading your Estate…
        </div>
      </section>
    );
  }

  if (!estate) {
    return (
      <section className="max-w-[42rem]">
        <div className="rounded-md border border-[color:var(--color-border-default)] bg-pure-white p-lg">
          <h2 className="font-display text-[20px] leading-[28px] text-kosha-navy">
            No Estate yet
          </h2>
          <p className="mt-xs text-sm text-slate-grey">
            Estate Planning organizes the continuity of intent beyond your lifetime.
            Begin by creating your Estate as a Continuity Subject in Institution Registry.
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
      <WorkspaceIntro slug="estate" />
      <TabBar tab={tab} onChange={setTab} />
      <div className="mt-lg">
        {tab === "overview" && <OverviewTab estate={estate} onNavigate={setTab} />}
        {tab === "will" && <WillTab estate={estate} />}
        {tab === "register" && <RegisterTab estate={estate} />}
        {tab === "nominations" && <NominationsTab estate={estate} />}
        {tab === "timeline" && <TimelineTab estate={estate} />}
      </div>
    </section>
  );
}

function TabBar({ tab, onChange }: { tab: TabKey; onChange: (t: TabKey) => void }) {
  return (
    <div role="tablist" aria-label="Estate Planning sections" className="flex flex-wrap gap-lg border-b border-[color:var(--color-border-default)]">
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

/* ================= Overview ================= */

function OverviewTab({ estate, onNavigate }: { estate: Estate; onNavigate: (t: TabKey) => void }) {
  const { will } = useWill(estate.id);
  const { items: assets } = useAssets(estate.id);
  const { items: liabilities } = useLiabilities(estate.id);
  const { items: nominations } = useNominations(estate.id);

  const hasAny = assets.length + liabilities.length + nominations.length > 0;
  const willExecuted = will?.status === "Executed";
  const currentStage = computeCurrentStage({ hasAny, willExecuted });

  const roleCounts = NOMINATION_ROLES.reduce<Record<NominationRole, number>>(
    (acc, r) => { acc[r] = nominations.filter((n) => n.role === r).length; return acc; },
    { Executor: 0, Guardian: 0, Beneficiary: 0 },
  );

  const lastUpdatedIso = useMemo(() => {
    const candidates: (string | null | undefined)[] = [
      estate.updated_at, estate.created_at,
      will?.updated_at, will?.created_at, will?.executed_at,
      ...assets.flatMap((a) => [a.updated_at, a.created_at]),
      ...liabilities.flatMap((l) => [l.updated_at, l.created_at]),
      ...nominations.flatMap((n) => [n.updated_at, n.created_at]),
    ];
    const times = candidates
      .filter((v): v is string => !!v)
      .map((v) => new Date(v).getTime())
      .filter((n) => Number.isFinite(n));
    if (times.length === 0) return null;
    return new Date(Math.max(...times)).toISOString();
  }, [estate, will, assets, liabilities, nominations]);

  return (
    <div className="space-y-xl">
      <header>
        <h2 className="font-display text-[28px] leading-[36px] text-kosha-navy">{estate.name}</h2>
        {estate.purpose_description && (
          <p className="mt-xs max-w-[48rem] text-sm text-slate-grey">{estate.purpose_description}</p>
        )}
        {lastUpdatedIso && (
          <p className="mt-xs text-xs text-slate-grey">
            Last updated <span className="font-numeral">{formatEnInDate(lastUpdatedIso)}</span>
          </p>
        )}
      </header>

      <LifecycleStrip current={currentStage} />

      <div className="grid grid-cols-2 gap-md sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Will" value={will?.status ?? "—"} numeric={false} />
        <StatCard label="Assets" value={assets.length} />
        <StatCard label="Liabilities" value={liabilities.length} />
        <StatCard
          label="Executors"
          value={roleCounts.Executor}
          note={roleCounts.Executor === 0 ? { text: "No Executor nominated yet", onClick: () => onNavigate("nominations") } : null}
        />
        <StatCard label="Guardians" value={roleCounts.Guardian} />
        <StatCard label="Beneficiaries" value={roleCounts.Beneficiary} />
      </div>
    </div>
  );
}

function LifecycleStrip({ current }: { current: LifecycleStage }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-widest text-slate-grey">Domain Lifecycle</div>
      <ol className="mt-sm flex flex-wrap gap-xs">
        {LIFECYCLE_STAGES.map((stage) => {
          const reachable = REACHABLE_STAGES.includes(stage);
          const isCurrent = stage === current;
          return (
            <li key={stage} className="flex flex-col">
              <span
                className={
                  "rounded-md px-sm py-2 text-xs font-semibold " +
                  (isCurrent
                    ? "bg-kosha-navy text-vault-ivory"
                    : reachable
                      ? "bg-pure-white text-kosha-navy ring-1 ring-[color:var(--color-border-default)]"
                      : "bg-pure-white text-slate-grey ring-1 ring-[color:var(--color-border-default)] opacity-60")
                }
                aria-current={isCurrent ? "step" : undefined}
              >
                {stage}
              </span>
              {!reachable && (
                <span className="mt-xs text-[11px] text-slate-grey">
                  Requires Probate — a future sprint
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function StatCard({ label, value, numeric = true, note = null }: {
  label: string; value: number | string; numeric?: boolean;
  note?: { text: string; onClick: () => void } | null;
}) {
  return (
    <div className="rounded-md bg-pure-white p-md shadow-[var(--shadow-1)] ring-1 ring-[color:var(--color-border-default)]">
      <div className="text-xs uppercase tracking-widest text-slate-grey">{label}</div>
      <div className={"mt-xs text-kosha-navy " + (numeric ? "font-numeral text-[28px] leading-[36px]" : "font-display text-[20px] leading-[28px]")}>
        {value}
      </div>
      {note && (
        <button
          type="button"
          onClick={note.onClick}
          className="mt-xs block text-left text-xs text-slate-grey underline underline-offset-2 hover:text-kosha-navy"
        >
          {note.text}
        </button>
      )}
    </div>
  );
}

/* ================= Will ================= */

function WillTab({ estate }: { estate: Estate }) {
  const { will, loading, refresh } = useWill(estate.id);
  const { items: assets } = useAssets(estate.id);
  const { items: liabilities } = useLiabilities(estate.id);
  const { items: nominations } = useNominations(estate.id);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  if (loading) {
    return <p className="text-sm text-slate-grey">Loading Will…</p>;
  }

  async function start() {
    setBusy(true);
    setMessage(null);
    const { error } = await supabase.from("wills").insert({ estate_id: estate.id });
    setBusy(false);
    if (error) setMessage("Could not start your Will. Please try again.");
    else await refresh();
  }

  async function markExecuted() {
    if (!will) return;
    setBusy(true);
    setMessage(null);
    const { error } = await supabase
      .from("wills")
      .update({ status: "Executed", executed_at: new Date().toISOString() })
      .eq("id", will.id);
    setBusy(false);
    setConfirming(false);
    if (error) setMessage("Could not update your Will. Please try again.");
    else await refresh();
  }

  if (!will) {
    return (
      <div className="rounded-md bg-pure-white p-lg shadow-[var(--shadow-1)] ring-1 ring-[color:var(--color-border-default)]">
        <h3 className="font-display text-[20px] leading-[28px] text-kosha-navy">No Will yet</h3>
        <p className="mt-xs text-sm text-slate-grey">
          A Will is your recorded intent for how this Estate should be stewarded.
          Begin one now — you can refine it over time before executing.
        </p>
        {message && <p className="mt-md text-sm text-slate-grey">{message}</p>}
        <button
          type="button"
          disabled={busy}
          onClick={start}
          className="mt-md rounded-md bg-kosha-navy px-md py-2 text-sm font-semibold text-vault-ivory hover:bg-kosha-navy/90 disabled:opacity-40"
        >
          {busy ? "Starting…" : "Start your Will"}
        </button>
      </div>
    );
  }

  const executed = will.status === "Executed";

  return (
    <div className="rounded-md bg-pure-white p-lg shadow-[var(--shadow-1)] ring-1 ring-[color:var(--color-border-default)]">
      <div className="flex flex-wrap items-start justify-between gap-md">
        <div>
          <div className="text-xs uppercase tracking-widest text-slate-grey">Will status</div>
          <div className="mt-xs font-display text-[20px] leading-[28px] text-kosha-navy">
            {will.status}
          </div>
          {will.executed_at && (
            <div className="mt-xs font-numeral text-xs text-slate-grey">
              Executed on {new Date(will.executed_at).toLocaleDateString("en-IN", {
                year: "numeric", month: "short", day: "2-digit",
              })}
            </div>
          )}
        </div>
        {!executed && (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="rounded-md bg-kosha-navy px-md py-2 text-sm font-semibold text-vault-ivory hover:bg-kosha-navy/90"
          >
            Mark as Executed
          </button>
        )}
      </div>

      <dl className="mt-lg grid grid-cols-2 gap-md sm:grid-cols-3">
        <SummaryLine label="Assets recorded" value={assets.length} />
        <SummaryLine label="Liabilities recorded" value={liabilities.length} />
        <SummaryLine label="Nominations recorded" value={nominations.length} />
      </dl>

      {!executed && (
        <p className="mt-lg text-sm text-slate-grey">
          A Will is ready to execute once you've recorded the people and property it should cover.
        </p>
      )}
      {executed && (
        <p className="mt-lg text-sm text-slate-grey">
          This Will has been executed. Further changes belong in a new revision, coordinated
          through your legal counsel.
        </p>
      )}

      {message && <p className="mt-md text-sm text-slate-grey">{message}</p>}

      {confirming && (
        <ConfirmDialog
          title="Mark this Will as Executed?"
          body="This records that your Will has been formally executed today. You'll still see everything you've recorded — the Will simply becomes read-only from this point on."
          confirmLabel={busy ? "Recording…" : "Yes, mark Executed"}
          onConfirm={markExecuted}
          onCancel={() => setConfirming(false)}
          busy={busy}
        />
      )}
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-widest text-slate-grey">{label}</dt>
      <dd className="mt-xs font-numeral text-[20px] leading-[28px] text-kosha-navy">{value}</dd>
    </div>
  );
}

function ConfirmDialog({
  title, body, confirmLabel, onConfirm, onCancel, busy,
}: {
  title: string; body: string; confirmLabel: string;
  onConfirm: () => void; onCancel: () => void; busy?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-kosha-navy/40 px-md" role="dialog" aria-modal="true" aria-label={title}>
      <div className="w-full max-w-[28rem] rounded-md bg-pure-white p-lg shadow-[var(--shadow-3)]">
        <h3 className="font-display text-[20px] leading-[28px] text-kosha-navy">{title}</h3>
        <p className="mt-sm text-sm text-slate-grey">{body}</p>
        <div className="mt-lg flex items-center justify-end gap-sm">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-md py-2 text-sm font-semibold text-kosha-navy hover:bg-vault-ivory"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="rounded-md bg-kosha-navy px-md py-2 text-sm font-semibold text-vault-ivory hover:bg-kosha-navy/90 disabled:opacity-40"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================= Register: Assets + Liabilities ================= */

function RegisterTab({ estate }: { estate: Estate }) {
  const [section, setSection] = useState<"assets" | "liabilities">("assets");
  return (
    <div>
      <div role="tablist" aria-label="Register sections" className="flex gap-md">
        {(["assets", "liabilities"] as const).map((s) => {
          const active = section === s;
          return (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSection(s)}
              className={
                "rounded-full px-md py-1 text-xs font-semibold capitalize " +
                (active
                  ? "bg-kosha-navy text-vault-ivory"
                  : "bg-pure-white text-slate-grey ring-1 ring-[color:var(--color-border-default)] hover:text-kosha-navy")
              }
            >
              {s}
            </button>
          );
        })}
      </div>
      <div className="mt-md">
        {section === "assets" ? <AssetsSection estate={estate} /> : <LiabilitiesSection estate={estate} />}
      </div>
    </div>
  );
}

function AssetsSection({ estate }: { estate: Estate }) {
  const { items, refresh } = useAssets(estate.id);
  const [creating, setCreating] = useState(false);
  return (
    <div>
      <div className="flex items-center justify-between gap-md">
        <p className="text-sm text-slate-grey">
          {items.length === 0 ? "No Assets recorded yet." : `${items.length} Asset${items.length === 1 ? "" : "s"} recorded.`}
        </p>
        {!creating && (
          <button type="button" onClick={() => setCreating(true)}
            className="rounded-md bg-kosha-navy px-md py-2 text-sm font-semibold text-vault-ivory hover:bg-kosha-navy/90">
            Add Asset
          </button>
        )}
      </div>
      {creating && (
        <AssetForm
          estateId={estate.id}
          onCancel={() => setCreating(false)}
          onCreated={async () => { setCreating(false); await refresh(); }}
        />
      )}
      {items.length > 0 && (
        <div className="mt-md overflow-hidden rounded-md bg-pure-white shadow-[var(--shadow-1)] ring-1 ring-[color:var(--color-border-default)]">
          <table className="w-full text-left text-sm">
            <thead className="bg-vault-ivory text-xs uppercase tracking-widest text-slate-grey">
              <tr>
                <th className="px-md py-3 font-semibold">Name</th>
                <th className="px-md py-3 font-semibold">Type</th>
                <th className="px-md py-3 font-semibold text-right">Estimated value</th>
                <th className="px-md py-3 font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id} className="border-t border-[color:var(--color-border-default)]">
                  <td className="px-md py-3 text-kosha-navy">{a.name}</td>
                  <td className="px-md py-3">
                    <span className="inline-flex items-center rounded-full border border-[color:var(--color-border-default)] bg-vault-ivory px-sm py-1 text-xs text-kosha-navy">
                      {a.asset_type}
                    </span>
                  </td>
                  <td className="px-md py-3 text-right font-numeral text-kosha-navy">{formatINR(a.estimated_value)}</td>
                  <td className="px-md py-3 text-slate-grey">{a.notes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AssetForm({ estateId, onCancel, onCreated }: { estateId: string; onCancel: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<AssetTypeName>("Asset");
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setMessage("A name is required."); return; }
    const numeric = value.trim() === "" ? null : Number(value);
    if (numeric !== null && !Number.isFinite(numeric)) {
      setMessage("Estimated value needs attention — enter a number or leave it blank.");
      return;
    }
    setBusy(true); setMessage(null);
    const { error } = await supabase.from("assets").insert({
      estate_id: estateId, name: name.trim(), asset_type: type,
      estimated_value: numeric, notes: notes.trim() || null,
    });
    setBusy(false);
    if (error) setMessage("Something needs attention — please review and try again.");
    else onCreated();
  }

  return (
    <form onSubmit={submit} className="mt-md rounded-md bg-pure-white p-lg shadow-[var(--shadow-1)] ring-1 ring-[color:var(--color-border-default)]">
      <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
        <Field label="Name">
          <input required value={name} onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-sm py-2 text-sm text-kosha-navy" />
        </Field>
        <Field label="Type">
          <select value={type} onChange={(e) => setType(e.target.value as AssetTypeName)}
            className="rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-sm py-2 text-sm text-kosha-navy">
            {ASSET_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Estimated value (optional)">
          <input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. 12500000"
            className="rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-sm py-2 font-numeral text-sm text-kosha-navy" />
        </Field>
      </div>
      <Field label="Notes (optional)">
        <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
          className="rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-sm py-2 text-sm text-kosha-navy" />
      </Field>
      {message && <p className="mt-md text-sm text-slate-grey">{message}</p>}
      <FormActions onCancel={onCancel} busy={busy} />
    </form>
  );
}

function LiabilitiesSection({ estate }: { estate: Estate }) {
  const { items, refresh } = useLiabilities(estate.id);
  const [creating, setCreating] = useState(false);
  return (
    <div>
      <div className="flex items-center justify-between gap-md">
        <p className="text-sm text-slate-grey">
          {items.length === 0 ? "No Liabilities recorded yet." : `${items.length} Liabilit${items.length === 1 ? "y" : "ies"} recorded.`}
        </p>
        {!creating && (
          <button type="button" onClick={() => setCreating(true)}
            className="rounded-md bg-kosha-navy px-md py-2 text-sm font-semibold text-vault-ivory hover:bg-kosha-navy/90">
            Add Liability
          </button>
        )}
      </div>
      {creating && (
        <LiabilityForm
          estateId={estate.id}
          onCancel={() => setCreating(false)}
          onCreated={async () => { setCreating(false); await refresh(); }}
        />
      )}
      {items.length > 0 && (
        <div className="mt-md overflow-hidden rounded-md bg-pure-white shadow-[var(--shadow-1)] ring-1 ring-[color:var(--color-border-default)]">
          <table className="w-full text-left text-sm">
            <thead className="bg-vault-ivory text-xs uppercase tracking-widest text-slate-grey">
              <tr>
                <th className="px-md py-3 font-semibold">Name</th>
                <th className="px-md py-3 font-semibold text-right">Amount</th>
                <th className="px-md py-3 font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody>
              {items.map((l) => (
                <tr key={l.id} className="border-t border-[color:var(--color-border-default)]">
                  <td className="px-md py-3 text-kosha-navy">{l.name}</td>
                  <td className="px-md py-3 text-right font-numeral text-kosha-navy">{formatINR(l.amount)}</td>
                  <td className="px-md py-3 text-slate-grey">{l.notes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function LiabilityForm({ estateId, onCancel, onCreated }: { estateId: string; onCancel: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setMessage("A name is required."); return; }
    const numeric = amount.trim() === "" ? null : Number(amount);
    if (numeric !== null && !Number.isFinite(numeric)) {
      setMessage("Amount needs attention — enter a number or leave it blank.");
      return;
    }
    setBusy(true); setMessage(null);
    const { error } = await supabase.from("liabilities").insert({
      estate_id: estateId, name: name.trim(),
      amount: numeric, notes: notes.trim() || null,
    });
    setBusy(false);
    if (error) setMessage("Something needs attention — please review and try again.");
    else onCreated();
  }

  return (
    <form onSubmit={submit} className="mt-md rounded-md bg-pure-white p-lg shadow-[var(--shadow-1)] ring-1 ring-[color:var(--color-border-default)]">
      <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
        <Field label="Name">
          <input required value={name} onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-sm py-2 text-sm text-kosha-navy" />
        </Field>
        <Field label="Amount (optional)">
          <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 750000"
            className="rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-sm py-2 font-numeral text-sm text-kosha-navy" />
        </Field>
      </div>
      <Field label="Notes (optional)">
        <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
          className="rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-sm py-2 text-sm text-kosha-navy" />
      </Field>
      {message && <p className="mt-md text-sm text-slate-grey">{message}</p>}
      <FormActions onCancel={onCancel} busy={busy} />
    </form>
  );
}

/* ================= Nominations ================= */

function NominationsTab({ estate }: { estate: Estate }) {
  const { items, refresh } = useNominations(estate.id);
  const [filter, setFilter] = useState<"All" | NominationRole>("All");
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(
    () => (filter === "All" ? items : items.filter((n) => n.role === filter)),
    [items, filter],
  );

  const counts = useMemo(() => {
    const c: Record<"All" | NominationRole, number> = { All: items.length, Executor: 0, Guardian: 0, Beneficiary: 0 };
    for (const n of items) c[n.role] += 1;
    return c;
  }, [items]);

  return (
    <div className="grid grid-cols-1 gap-lg lg:grid-cols-[16rem_1fr]">
      <aside className="rounded-md bg-pure-white p-md shadow-[var(--shadow-1)] ring-1 ring-[color:var(--color-border-default)]">
        <div className="text-xs uppercase tracking-widest text-slate-grey">Filter by role</div>
        <ul className="mt-sm space-y-xs">
          {(["All", ...NOMINATION_ROLES] as const).map((r) => {
            const active = filter === r;
            return (
              <li key={r}>
                <button type="button" onClick={() => setFilter(r)}
                  className={
                    "flex w-full items-center justify-between rounded-sm px-sm py-2 text-left text-sm " +
                    (active ? "bg-vault-ivory text-kosha-navy" : "text-kosha-navy hover:bg-vault-ivory")
                  }>
                  <span>{r}</span>
                  <span className="font-numeral text-xs text-slate-grey">{counts[r]}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <div>
        <div className="flex items-center justify-between gap-md">
          <p className="text-sm text-slate-grey">
            {filtered.length === 0 ? "No Nominations in this view." : `${filtered.length} Nomination${filtered.length === 1 ? "" : "s"}.`}
          </p>
          {!creating && (
            <button type="button" onClick={() => setCreating(true)}
              className="rounded-md bg-kosha-navy px-md py-2 text-sm font-semibold text-vault-ivory hover:bg-kosha-navy/90">
              Add Nomination
            </button>
          )}
        </div>

        {creating && (
          <NominationForm estateId={estate.id}
            onCancel={() => setCreating(false)}
            onCreated={async () => { setCreating(false); await refresh(); }} />
        )}

        {filtered.length > 0 && (
          <div className="mt-md overflow-hidden rounded-md bg-pure-white shadow-[var(--shadow-1)] ring-1 ring-[color:var(--color-border-default)]">
            <table className="w-full text-left text-sm">
              <thead className="bg-vault-ivory text-xs uppercase tracking-widest text-slate-grey">
                <tr>
                  <th className="px-md py-3 font-semibold">Name</th>
                  <th className="px-md py-3 font-semibold">Role</th>
                  <th className="px-md py-3 font-semibold">Relationship</th>
                  <th className="px-md py-3 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((n) => (
                  <tr key={n.id} className="border-t border-[color:var(--color-border-default)]">
                    <td className="px-md py-3 text-kosha-navy">{n.nominee_name}</td>
                    <td className="px-md py-3">
                      <span className="inline-flex items-center rounded-full border border-[color:var(--color-border-default)] bg-vault-ivory px-sm py-1 text-xs text-kosha-navy">
                        {n.role}
                      </span>
                    </td>
                    <td className="px-md py-3 text-slate-grey">{n.relationship ?? "—"}</td>
                    <td className="px-md py-3 text-slate-grey">{n.notes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function NominationForm({ estateId, onCancel, onCreated }: { estateId: string; onCancel: () => void; onCreated: () => void }) {
  const [role, setRole] = useState<NominationRole>("Executor");
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setMessage("A nominee name is required."); return; }
    setBusy(true); setMessage(null);
    const { error } = await supabase.from("nominations").insert({
      estate_id: estateId, role, nominee_name: name.trim(),
      relationship: relationship.trim() || null, notes: notes.trim() || null,
    });
    setBusy(false);
    if (error) setMessage("Something needs attention — please review and try again.");
    else onCreated();
  }

  return (
    <form onSubmit={submit} className="mt-md rounded-md bg-pure-white p-lg shadow-[var(--shadow-1)] ring-1 ring-[color:var(--color-border-default)]">
      <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
        <Field label="Role">
          <select value={role} onChange={(e) => setRole(e.target.value as NominationRole)}
            className="rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-sm py-2 text-sm text-kosha-navy">
            {NOMINATION_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </Field>
        <Field label="Nominee name">
          <input required value={name} onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-sm py-2 text-sm text-kosha-navy" />
        </Field>
        <Field label="Relationship (optional)">
          <input value={relationship} onChange={(e) => setRelationship(e.target.value)}
            placeholder="e.g. Spouse, Elder daughter"
            className="rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-sm py-2 text-sm text-kosha-navy" />
        </Field>
      </div>
      <Field label="Notes (optional)">
        <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
          className="rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-sm py-2 text-sm text-kosha-navy" />
      </Field>
      {message && <p className="mt-md text-sm text-slate-grey">{message}</p>}
      <FormActions onCancel={onCancel} busy={busy} />
    </form>
  );
}

/* ================= Shared form primitives ================= */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mt-md flex flex-col gap-xs first:mt-0">
      <span className="text-xs uppercase tracking-widest text-slate-grey">{label}</span>
      {children}
    </label>
  );
}

function FormActions({ onCancel, busy }: { onCancel: () => void; busy: boolean }) {
  return (
    <div className="mt-lg flex items-center justify-end gap-sm">
      <button type="button" onClick={onCancel}
        className="rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-md py-2 text-sm font-semibold text-kosha-navy hover:bg-vault-ivory">
        Cancel
      </button>
      <button type="submit" disabled={busy}
        className="rounded-md bg-kosha-navy px-md py-2 text-sm font-semibold text-vault-ivory hover:bg-kosha-navy/90 disabled:opacity-40">
        {busy ? "Saving…" : "Save"}
      </button>
    </div>
  );
}

/* ================= Timeline ================= */

type TimelineEntry = { at: string; label: string };

function TimelineTab({ estate }: { estate: Estate }) {
  const { will } = useWill(estate.id);
  const { items: assets } = useAssets(estate.id);
  const { items: liabilities } = useLiabilities(estate.id);
  const { items: nominations } = useNominations(estate.id);

  const entries = useMemo<TimelineEntry[]>(() => {
    const out: TimelineEntry[] = [];
    out.push({ at: estate.created_at, label: "Estate created" });
    if (will?.created_at) out.push({ at: will.created_at, label: "Will started" });
    if (will?.executed_at) out.push({ at: will.executed_at, label: "Will marked Executed" });
    for (const a of assets) out.push({ at: a.created_at, label: `Asset added: ${a.name}` });
    for (const l of liabilities) out.push({ at: l.created_at, label: `Liability added: ${l.name}` });
    for (const n of nominations) {
      out.push({ at: n.created_at, label: `Nomination recorded: ${n.nominee_name} as ${n.role}` });
    }
    return out.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [estate, will, assets, liabilities, nominations]);

  return (
    <div className="max-w-[48rem]">
      <p className="text-sm text-slate-grey">
        Every recorded event for this Estate, most recent first.
      </p>
      <ol className="mt-md space-y-xs">
        {entries.map((e, i) => (
          <li
            key={i}
            className="flex flex-wrap items-baseline justify-between gap-md rounded-md bg-pure-white px-md py-3 shadow-[var(--shadow-1)] ring-1 ring-[color:var(--color-border-default)]"
          >
            <span className="text-sm text-kosha-navy">{e.label}</span>
            <span className="font-numeral text-xs text-slate-grey">{formatEnInDate(e.at)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
