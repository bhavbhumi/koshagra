import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useParticipant } from "@/lib/participant";
import { WorkspaceIntro } from "@/components/shell/WorkspaceIntro";
import { formatDate } from "@/lib/format";
import {
  ENTERPRISE_DOCUMENT_TYPES,
  PRINCIPAL_ROLES,
  SUCCESSOR_TYPES,
  useBoardMembers,
  useEnterpriseDocuments,
  useEnterprises,
  useKeyPersons,
  useOwnershipInterests,
  usePrincipals,
  useSuccessors,
  type Enterprise,
  type EnterpriseDocument,
  type EnterpriseDocumentType,
  type EnterprisePrincipal,
  type EnterprisePrincipalRole,
  type SuccessorType,
} from "@/lib/enterprise";

export const Route = createFileRoute("/_authenticated/business-succession")({
  component: BusinessSuccessionPage,
});

type TabKey = "overview" | "ownership" | "succession" | "documents" | "board";
const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "ownership", label: "Ownership & Leadership" },
  { key: "succession", label: "Succession Planning" },
  { key: "documents", label: "Governance Documents" },
  { key: "board", label: "Board of Directors" },
];

/* Shared styling helpers — same tokens the rest of the app uses. */
const inputCls =
  "mt-xs w-full rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-md py-2 text-sm text-kosha-navy";
const labelCls = "text-xs uppercase tracking-widest text-slate-grey";
const primaryBtn =
  "rounded-md bg-kosha-navy px-md py-2 text-sm font-semibold text-vault-ivory hover:bg-kosha-navy/90 disabled:opacity-40";
const secondaryBtn =
  "rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-md py-2 text-sm font-semibold text-kosha-navy hover:bg-vault-ivory";
const cardCls =
  "rounded-md bg-pure-white p-md shadow-[var(--shadow-1)] ring-1 ring-[color:var(--color-border-default)]";

function BusinessSuccessionPage() {
  const { participant } = useParticipant();
  const { enterprises, loading, refresh } = useEnterprises(participant?.id ?? null);
  const [tab, setTab] = useState<TabKey>("overview");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (enterprises.length === 0) { setSelectedId(null); return; }
    if (enterprises.length === 1) setSelectedId(enterprises[0].id);
    else setSelectedId((prev) => (prev && enterprises.some((e) => e.id === prev) ? prev : null));
  }, [enterprises]);

  const enterprise = enterprises.find((e) => e.id === selectedId) ?? null;

  if (loading) {
    return (
      <section aria-busy="true" className="max-w-[64rem]">
        <div className="inline-flex items-center gap-sm text-sm text-slate-grey">
          <span className="h-2 w-2 rounded-full bg-slate-grey animate-pulse" aria-hidden />
          Loading your Enterprise…
        </div>
      </section>
    );
  }

  if (enterprises.length === 0) {
    return (
      <section className="max-w-[42rem]">
        <div className={cardCls}>
          <h2 className="font-display text-[20px] leading-[28px] text-kosha-navy">
            No business recorded yet
          </h2>
          <p className="mt-xs text-sm text-slate-grey">
            This is where you record who owns what share of the business, who steps
            in next, and who serves on the board. Add your business in the Registry
            to begin — leadership and ownership can be filled in separately as they
            settle.
          </p>
          <Link to="/institution-registry" className={"mt-md inline-flex items-center " + primaryBtn}>
            Open Institution Registry
          </Link>
        </div>
      </section>
    );
  }

  if (!enterprise) {
    return (
      <section className="max-w-[42rem]">
        <div className={cardCls}>
          <h2 className="font-display text-[20px] leading-[28px] text-kosha-navy">
            Choose an Enterprise
          </h2>
          <p className="mt-xs text-sm text-slate-grey">
            You steward more than one Enterprise. Pick one to open its succession workspace —
            you can switch at any time from the Workspace Switcher in the header.
          </p>
          <ul className="mt-md space-y-xs">
            {enterprises.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(e.id);
                    window.localStorage.setItem("koshagra.subject", e.id);
                  }}
                  className="w-full rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-md py-3 text-left text-sm text-kosha-navy hover:bg-vault-ivory"
                >
                  {e.name}
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
      <WorkspaceIntro slug="business" />
      <TabBar tab={tab} onChange={setTab} />
      <div className="mt-lg">
        {tab === "overview" && <OverviewTab enterprise={enterprise} onRefreshEnterprise={refresh} />}
        {tab === "ownership" && <OwnershipLeadershipTab enterprise={enterprise} />}
        {tab === "succession" && <SuccessionPlanningTab enterprise={enterprise} />}
        {tab === "documents" && <DocumentsTab enterprise={enterprise} />}
        {tab === "board" && <BoardTab enterprise={enterprise} />}
      </div>
    </section>
  );
}

function TabBar({ tab, onChange }: { tab: TabKey; onChange: (t: TabKey) => void }) {
  return (
    <div role="tablist" aria-label="Business Succession sections" className="flex flex-wrap gap-lg border-b border-[color:var(--color-border-default)]">
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

function OverviewTab({ enterprise, onRefreshEnterprise }: { enterprise: Enterprise; onRefreshEnterprise: () => Promise<void> | void }) {
  const { items: principals } = usePrincipals(enterprise.id);
  const { items: interests } = useOwnershipInterests(enterprise.id);
  const { items: successors } = useSuccessors(enterprise.id);
  const { items: keyPersons } = useKeyPersons(enterprise.id);
  const { items: docs } = useEnterpriseDocuments(enterprise.id);
  const { items: board } = useBoardMembers(enterprise.id);
  const [editing, setEditing] = useState(false);

  const founderCount = principals.filter((p) => p.role === "Founder").length;
  const principalCount = principals.filter((p) => p.role === "Principal").length;
  const leadershipSuccessors = successors.filter((s) => s.successor_type === "Leadership").length;
  const ownershipSuccessors = successors.filter((s) => s.successor_type === "Ownership").length;
  const docCounts = ENTERPRISE_DOCUMENT_TYPES.map((t) => ({
    type: t,
    drafts: docs.filter((d) => d.document_type === t && d.status === "Draft").length,
    total: docs.filter((d) => d.document_type === t).length,
  }));

  const lastUpdatedIso = useMemo(() => {
    const candidates: (string | null | undefined)[] = [
      enterprise.updated_at, enterprise.created_at,
      ...principals.flatMap((p) => [p.updated_at, p.created_at]),
      ...interests.flatMap((o) => [o.updated_at, o.created_at]),
      ...successors.flatMap((s) => [s.updated_at, s.created_at]),
      ...keyPersons.flatMap((k) => [k.updated_at, k.created_at]),
      ...docs.flatMap((d) => [d.updated_at, d.created_at]),
      ...board.flatMap((b) => [b.updated_at, b.created_at]),
    ];
    const times = candidates
      .filter((v): v is string => !!v)
      .map((v) => new Date(v).getTime())
      .filter((n) => Number.isFinite(n));
    if (times.length === 0) return null;
    return new Date(Math.max(...times)).toISOString();
  }, [enterprise, principals, interests, successors, keyPersons, docs, board]);

  const lastUpdatedLabel = lastUpdatedIso ? formatDate(lastUpdatedIso) : null;

  return (
    <div className="space-y-xl">
      <header>
        <h2 className="font-display text-[28px] leading-[36px] text-kosha-navy">{enterprise.name}</h2>
        <PurposeBlock
          enterprise={enterprise}
          editing={editing}
          onEdit={() => setEditing(true)}
          onDone={async () => { setEditing(false); await onRefreshEnterprise(); }}
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
          <StatCard label="Founders" value={founderCount} />
          <StatCard label="Principals" value={principalCount} />
          <StatCard label="Ownership Interests" value={interests.length} />
          <StatCard label="Board seats" value={board.length} />
          <StatCard label="Leadership Successors" value={leadershipSuccessors} />
          <StatCard label="Ownership Successors" value={ownershipSuccessors} />
          <StatCard label="Key Persons" value={keyPersons.length} />
          {docCounts.map((c) => (
            <StatCard
              key={c.type}
              label={c.type}
              value={c.total === 0 ? "None yet" : `${c.drafts} Draft${c.drafts === 1 ? "" : "s"}`}
              numeric={false}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function PurposeBlock({
  enterprise, editing, onEdit, onDone, onCancel,
}: {
  enterprise: Enterprise; editing: boolean; onEdit: () => void; onDone: () => void; onCancel: () => void;
}) {
  const [draft, setDraft] = useState(enterprise.purpose_description ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => { setDraft(enterprise.purpose_description ?? ""); }, [enterprise.id, enterprise.purpose_description]);

  async function save() {
    setBusy(true); setMessage(null);
    const { error } = await supabase
      .from("continuity_subjects")
      .update({ purpose_description: draft.trim() === "" ? null : draft.trim() })
      .eq("id", enterprise.id);
    setBusy(false);
    if (error) { setMessage("Could not save the Enterprise Purpose. Please try again."); return; }
    onDone();
  }

  if (!editing) {
    return (
      <div className="mt-xs flex flex-wrap items-start gap-md">
        <p className="max-w-[48rem] text-sm text-slate-grey">
          {enterprise.purpose_description ?? "No Enterprise Purpose recorded yet."}
        </p>
        <button type="button" onClick={onEdit} className="rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-sm py-1 text-xs font-semibold text-kosha-navy hover:bg-vault-ivory">
          Edit Purpose
        </button>
      </div>
    );
  }

  return (
    <div className="mt-sm max-w-[48rem]">
      <label htmlFor="enterprise-purpose" className={labelCls}>Enterprise Purpose</label>
      <textarea
        id="enterprise-purpose"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={4}
        className={inputCls}
      />
      <p className="mt-xs text-xs text-slate-grey">
        Purpose may be refined in expression across a succession — the owning Participant records the change.
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

/* ================= Ownership & Leadership ================= */

type OwnershipSection = "interests" | "principals";

function OwnershipLeadershipTab({ enterprise }: { enterprise: Enterprise }) {
  const [section, setSection] = useState<OwnershipSection>("interests");
  return (
    <div>
      <SubToggle
        value={section}
        onChange={setSection}
        options={[
          { key: "interests", label: "Ownership Interests" },
          { key: "principals", label: "Principals" },
        ]}
      />
      <div className="mt-md">
        {section === "interests" ? (
          <OwnershipInterestsSection enterpriseId={enterprise.id} />
        ) : (
          <PrincipalsSection enterpriseId={enterprise.id} />
        )}
      </div>
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

function OwnershipInterestsSection({ enterpriseId }: { enterpriseId: string }) {
  const { items, refresh } = useOwnershipInterests(enterpriseId);
  const [creating, setCreating] = useState(false);
  const [holder, setHolder] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!holder.trim()) { setMessage("A holder name is required."); return; }
    setBusy(true);
    const { error } = await supabase.from("ownership_interests").insert({
      enterprise_id: enterpriseId,
      holder_name: holder.trim(),
      interest_description: description.trim() || null,
      notes: notes.trim() || null,
    });
    setBusy(false);
    if (error) { setMessage("Could not save this Ownership Interest. Please try again."); return; }
    setHolder(""); setDescription(""); setNotes(""); setCreating(false);
    await refresh();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-md">
        <p className="text-sm text-slate-grey">
          {items.length === 0
            ? "No Ownership Interests recorded yet."
            : `${items.length} Ownership Interest${items.length === 1 ? "" : "s"} recorded.`}
        </p>
        {!creating && (
          <button type="button" onClick={() => setCreating(true)} className={primaryBtn}>
            Add Ownership Interest
          </button>
        )}
      </div>

      {creating && (
        <form onSubmit={submit} className={"mt-md " + cardCls}>
          <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
            <label className="block">
              <span className={labelCls}>Holder name</span>
              <input value={holder} onChange={(e) => setHolder(e.target.value)} className={inputCls} />
            </label>
            <label className="block">
              <span className={labelCls}>Interest description (optional)</span>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. 35% common shares"
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
            <button type="submit" disabled={busy} className={primaryBtn}>
              {busy ? "Saving…" : "Save Ownership Interest"}
            </button>
            <button type="button" onClick={() => setCreating(false)} className={secondaryBtn}>Cancel</button>
          </div>
        </form>
      )}

      {items.length > 0 && (
        <ul className="mt-md space-y-xs">
          {items.map((o) => (
            <li key={o.id} className={"flex flex-wrap items-start justify-between gap-md " + cardCls}>
              <div className="min-w-0">
                <div className="text-sm text-kosha-navy">{o.holder_name}</div>
                {o.interest_description && (
                  <div className="text-xs text-slate-grey">{o.interest_description}</div>
                )}
                {o.notes && <div className="mt-xs text-xs text-slate-grey">{o.notes}</div>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PrincipalsSection({ enterpriseId }: { enterpriseId: string }) {
  const { items, refresh } = usePrincipals(enterpriseId);
  const [creating, setCreating] = useState(false);
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<EnterprisePrincipalRole>("Principal");
  const [roleDetail, setRoleDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) { setMessage("A full name is required."); return; }
    setBusy(true);
    const { error } = await supabase.from("enterprise_principals").insert({
      enterprise_id: enterpriseId,
      full_name: fullName.trim(),
      role,
      role_detail: roleDetail.trim() || null,
    });
    setBusy(false);
    if (error) { setMessage("Could not save this Principal. Please try again."); return; }
    setFullName(""); setRole("Principal"); setRoleDetail(""); setCreating(false);
    await refresh();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-md">
        <p className="text-sm text-slate-grey">
          {items.length === 0
            ? "No Principals recorded yet."
            : `${items.length} Principal${items.length === 1 ? "" : "s"} recorded.`}
        </p>
        {!creating && (
          <button type="button" onClick={() => setCreating(true)} className={primaryBtn}>
            Add Principal
          </button>
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
              <span className={labelCls}>Role</span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as EnterprisePrincipalRole)}
                className={inputCls}
              >
                {PRINCIPAL_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
            <label className="block">
              <span className={labelCls}>Role detail (optional)</span>
              <input
                value={roleDetail}
                onChange={(e) => setRoleDetail(e.target.value)}
                placeholder="e.g. Independent Director"
                className={inputCls}
              />
            </label>
          </div>
          {message && <p className="mt-sm text-sm text-slate-grey">{message}</p>}
          <div className="mt-md flex items-center gap-sm">
            <button type="submit" disabled={busy} className={primaryBtn}>
              {busy ? "Saving…" : "Save Principal"}
            </button>
            <button type="button" onClick={() => setCreating(false)} className={secondaryBtn}>Cancel</button>
          </div>
        </form>
      )}

      {items.length > 0 && (
        <ul className="mt-md space-y-xs">
          {items.map((p) => <PrincipalRow key={p.id} principal={p} />)}
        </ul>
      )}
    </div>
  );
}

function PrincipalRow({ principal }: { principal: EnterprisePrincipal }) {
  return (
    <li className={"flex flex-wrap items-center justify-between gap-md " + cardCls}>
      <div className="min-w-0">
        <div className="text-sm text-kosha-navy">{principal.full_name}</div>
        {principal.role_detail && (
          <div className="text-xs text-slate-grey">{principal.role_detail}</div>
        )}
      </div>
      <span className="inline-flex items-center rounded-full bg-kosha-navy px-sm py-1 text-xs font-semibold text-vault-ivory">
        {principal.role}
      </span>
    </li>
  );
}

/* ================= Succession Planning ================= */

type SuccessionSection = "successors" | "key-persons";

function SuccessionPlanningTab({ enterprise }: { enterprise: Enterprise }) {
  const [section, setSection] = useState<SuccessionSection>("successors");
  return (
    <div>
      <SubToggle
        value={section}
        onChange={setSection}
        options={[
          { key: "successors", label: "Successors" },
          { key: "key-persons", label: "Key Persons" },
        ]}
      />
      <div className="mt-md">
        {section === "successors"
          ? <SuccessorsSection enterpriseId={enterprise.id} />
          : <KeyPersonsSection enterpriseId={enterprise.id} />}
      </div>
    </div>
  );
}

function SuccessorsSection({ enterpriseId }: { enterpriseId: string }) {
  const { items, refresh } = useSuccessors(enterpriseId);
  const [creating, setCreating] = useState(false);
  const [type, setType] = useState<SuccessorType>("Leadership");
  const [fullName, setFullName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) { setMessage("A full name is required."); return; }
    setBusy(true);
    const { error } = await supabase.from("successors").insert({
      enterprise_id: enterpriseId,
      successor_type: type,
      full_name: fullName.trim(),
      relationship_to_enterprise: relationship.trim() || null,
      notes: notes.trim() || null,
    });
    setBusy(false);
    if (error) { setMessage("Could not save this Successor. Please try again."); return; }
    setType("Leadership"); setFullName(""); setRelationship(""); setNotes(""); setCreating(false);
    await refresh();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-md">
        <p className="text-sm text-slate-grey">
          {items.length === 0
            ? "No Successors recorded yet. Leadership and Ownership are two independent lines — record each separately."
            : `${items.length} Successor${items.length === 1 ? "" : "s"} recorded. Confirmation requires Board of Directors approval, which this build doesn't yet support.`}
        </p>
        {!creating && (
          <button type="button" onClick={() => setCreating(true)} className={primaryBtn}>
            Add Successor
          </button>
        )}
      </div>

      {creating && (
        <form onSubmit={submit} className={"mt-md " + cardCls}>
          <div className="grid grid-cols-1 gap-md sm:grid-cols-3">
            <label className="block">
              <span className={labelCls}>Successor type</span>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as SuccessorType)}
                className={inputCls}
              >
                {SUCCESSOR_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label className="block">
              <span className={labelCls}>Full name</span>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} />
            </label>
            <label className="block">
              <span className={labelCls}>Relationship to the Enterprise (optional)</span>
              <input
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                placeholder="e.g. Elder daughter; Current COO"
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
            <button type="submit" disabled={busy} className={primaryBtn}>
              {busy ? "Saving…" : "Save Successor"}
            </button>
            <button type="button" onClick={() => setCreating(false)} className={secondaryBtn}>Cancel</button>
          </div>
        </form>
      )}

      {items.length > 0 && (
        <ul className="mt-md space-y-xs">
          {items.map((s) => (
            <li key={s.id} className={"flex flex-wrap items-start justify-between gap-md " + cardCls}>
              <div className="min-w-0">
                <div className="text-sm text-kosha-navy">{s.full_name}</div>
                {s.relationship_to_enterprise && (
                  <div className="text-xs text-slate-grey">{s.relationship_to_enterprise}</div>
                )}
                {s.notes && <div className="mt-xs text-xs text-slate-grey">{s.notes}</div>}
              </div>
              <span className="inline-flex items-center rounded-full bg-kosha-navy px-sm py-1 text-xs font-semibold text-vault-ivory">
                {s.successor_type} Successor
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function KeyPersonsSection({ enterpriseId }: { enterpriseId: string }) {
  const { items, refresh } = useKeyPersons(enterpriseId);
  const [creating, setCreating] = useState(false);
  const [fullName, setFullName] = useState("");
  const [significance, setSignificance] = useState("");
  const [mitigation, setMitigation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) { setMessage("A full name is required."); return; }
    if (!significance.trim()) { setMessage("Describe why this person is significant to Enterprise viability."); return; }
    setBusy(true);
    const { error } = await supabase.from("key_persons").insert({
      enterprise_id: enterpriseId,
      full_name: fullName.trim(),
      significance: significance.trim(),
      mitigation_notes: mitigation.trim() || null,
    });
    setBusy(false);
    if (error) { setMessage("Could not save this Key Person record. Please try again."); return; }
    setFullName(""); setSignificance(""); setMitigation(""); setCreating(false);
    await refresh();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-md">
        <p className="text-sm text-slate-grey">
          {items.length === 0
            ? "No Key Persons recorded yet. A Key Person is a risk record — being named here confers no Authority."
            : `${items.length} Key Person${items.length === 1 ? "" : "s"} recorded.`}
        </p>
        {!creating && (
          <button type="button" onClick={() => setCreating(true)} className={primaryBtn}>
            Add Key Person
          </button>
        )}
      </div>

      {creating && (
        <form onSubmit={submit} className={"mt-md " + cardCls}>
          <label className="block">
            <span className={labelCls}>Full name</span>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} />
          </label>
          <label className="mt-md block">
            <span className={labelCls}>Significance</span>
            <textarea
              value={significance}
              onChange={(e) => setSignificance(e.target.value)}
              rows={3}
              placeholder="Why the Enterprise depends on this person"
              className={inputCls}
            />
          </label>
          <label className="mt-md block">
            <span className={labelCls}>Mitigation notes (optional)</span>
            <textarea value={mitigation} onChange={(e) => setMitigation(e.target.value)} rows={3} className={inputCls} />
          </label>
          {message && <p className="mt-sm text-sm text-slate-grey">{message}</p>}
          <div className="mt-md flex items-center gap-sm">
            <button type="submit" disabled={busy} className={primaryBtn}>
              {busy ? "Saving…" : "Save Key Person"}
            </button>
            <button type="button" onClick={() => setCreating(false)} className={secondaryBtn}>Cancel</button>
          </div>
        </form>
      )}

      {items.length > 0 && (
        <ul className="mt-md space-y-xs">
          {items.map((k) => (
            <li key={k.id} className={cardCls}>
              <div className="text-sm text-kosha-navy">{k.full_name}</div>
              {k.significance && (
                <div className="mt-xs text-xs text-slate-grey"><span className="font-semibold">Significance · </span>{k.significance}</div>
              )}
              {k.mitigation_notes && (
                <div className="mt-xs text-xs text-slate-grey"><span className="font-semibold">Mitigation · </span>{k.mitigation_notes}</div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ================= Governance Documents ================= */

function DocumentsTab({ enterprise }: { enterprise: Enterprise }) {
  const { items, refresh } = useEnterpriseDocuments(enterprise.id);
  const [filter, setFilter] = useState<EnterpriseDocumentType | "All">("All");
  const [creatingType, setCreatingType] = useState<EnterpriseDocumentType | null>(null);

  const visible = filter === "All" ? items : items.filter((d) => d.document_type === filter);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-md">
        <div role="tablist" aria-label="Document type" className="flex flex-wrap gap-sm">
          {(["All", ...ENTERPRISE_DOCUMENT_TYPES] as const).map((f) => {
            const active = filter === f;
            return (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(f)}
                className={
                  "rounded-full px-md py-1 text-xs font-semibold " +
                  (active
                    ? "bg-kosha-navy text-vault-ivory"
                    : "bg-pure-white text-slate-grey ring-1 ring-[color:var(--color-border-default)] hover:text-kosha-navy")
                }
              >
                {f}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-sm">
          {ENTERPRISE_DOCUMENT_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setCreatingType(t)}
              className="rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-sm py-1 text-xs font-semibold text-kosha-navy hover:bg-vault-ivory"
            >
              New {t}
            </button>
          ))}
        </div>
      </div>

      {creatingType && (
        <DocumentForm
          enterpriseId={enterprise.id}
          documentType={creatingType}
          onCancel={() => setCreatingType(null)}
          onCreated={async () => { setCreatingType(null); await refresh(); }}
        />
      )}

      <div className="mt-md space-y-md">
        {visible.length === 0 && (
          <p className="text-sm text-slate-grey">No Enterprise documents recorded yet.</p>
        )}
        {visible.map((d) => (
          <DocumentCard key={d.id} doc={d} onChanged={refresh} />
        ))}
      </div>
    </div>
  );
}

function DocumentCard({ doc, onChanged }: { doc: EnterpriseDocument; onChanged: () => Promise<void> | void }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(doc.title);
  const [body, setBody] = useState(doc.body);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => { setTitle(doc.title); setBody(doc.body); }, [doc.id, doc.title, doc.body]);

  async function save() {
    if (!title.trim()) { setMessage("A title is required."); return; }
    setBusy(true);
    const { error } = await supabase
      .from("enterprise_documents")
      .update({ title: title.trim(), body })
      .eq("id", doc.id);
    setBusy(false);
    if (error) { setMessage("Could not save this document. Please try again."); return; }
    setEditing(false);
    await onChanged();
  }

  const adoptionLine =
    doc.document_type === "Enterprise Constitution"
      ? "Adopting this Enterprise Constitution requires Board of Directors approval — this build doesn't yet support that Maker-Checker step. Drafts are saved and fully editable."
      : "Adopting this Buy-Sell Agreement requires Board of Directors approval — this build doesn't yet support that Maker-Checker step. Drafts are saved and fully editable.";

  return (
    <article className={cardCls}>
      <div className="flex flex-wrap items-start justify-between gap-md">
        <div className="min-w-0">
          <div className={labelCls}>{doc.document_type}</div>
          {!editing ? (
            <h3 className="mt-xs font-display text-[20px] leading-[28px] text-kosha-navy">{doc.title}</h3>
          ) : (
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={"max-w-[36rem] " + inputCls}
            />
          )}
        </div>
        <div className="text-right">
          <span className="inline-flex items-center rounded-full bg-vault-ivory px-sm py-1 text-xs font-semibold text-slate-grey ring-1 ring-[color:var(--color-border-default)]">
            {doc.status}
          </span>
          <div className="mt-xs font-numeral text-xs text-slate-grey">v{doc.version}</div>
        </div>
      </div>

      {!editing ? (
        <p className="mt-sm whitespace-pre-wrap text-sm text-kosha-navy">
          {doc.body.trim() === "" ? <span className="text-slate-grey">No body recorded yet.</span> : doc.body}
        </p>
      ) : (
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} className={inputCls} />
      )}

      <p className="mt-md text-xs text-slate-grey">{adoptionLine}</p>

      {message && <p className="mt-sm text-sm text-slate-grey">{message}</p>}

      <div className="mt-md flex flex-wrap items-center gap-sm">
        {!editing ? (
          <button type="button" onClick={() => setEditing(true)} className={secondaryBtn}>Edit Draft</button>
        ) : (
          <>
            <button type="button" disabled={busy} onClick={save} className={primaryBtn}>
              {busy ? "Saving…" : "Save Draft"}
            </button>
            <button
              type="button"
              onClick={() => { setEditing(false); setTitle(doc.title); setBody(doc.body); }}
              className={secondaryBtn}
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </article>
  );
}

function DocumentForm({
  enterpriseId, documentType, onCancel, onCreated,
}: {
  enterpriseId: string;
  documentType: EnterpriseDocumentType;
  onCancel: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState<string>(documentType);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setMessage("A title is required."); return; }
    setBusy(true);
    const { error } = await supabase.from("enterprise_documents").insert({
      enterprise_id: enterpriseId,
      document_type: documentType,
      title: title.trim(),
      body,
    });
    setBusy(false);
    if (error) { setMessage("Could not create this document. Please try again."); return; }
    onCreated();
  }

  return (
    <form onSubmit={submit} className={"mt-md " + cardCls}>
      <div className={labelCls}>New {documentType}</div>
      <label className="mt-sm block">
        <span className={labelCls}>Title</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
      </label>
      <label className="mt-md block">
        <span className={labelCls}>Body</span>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} className={inputCls} />
      </label>
      <p className="mt-sm text-xs text-slate-grey">
        Saved as Draft. Adoption requires Board of Directors approval — not supported in this build.
      </p>
      {message && <p className="mt-sm text-sm text-slate-grey">{message}</p>}
      <div className="mt-md flex items-center gap-sm">
        <button type="submit" disabled={busy} className={primaryBtn}>
          {busy ? "Saving…" : "Save Draft"}
        </button>
        <button type="button" onClick={onCancel} className={secondaryBtn}>Cancel</button>
      </div>
    </form>
  );
}

/* ================= Board of Directors ================= */

function BoardTab({ enterprise }: { enterprise: Enterprise }) {
  const { items: principals } = usePrincipals(enterprise.id);
  const { items: seats, refresh } = useBoardMembers(enterprise.id);
  const [adding, setAdding] = useState(false);
  const [principalId, setPrincipalId] = useState<string>("");
  const [seatNote, setSeatNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const principalsById = useMemo(
    () => new Map(principals.map((p) => [p.id, p] as const)),
    [principals],
  );
  const seatedIds = new Set(seats.map((s) => s.principal_id));
  const availablePrincipals = principals.filter((p) => !seatedIds.has(p.id));

  useEffect(() => {
    if (adding && !principalId && availablePrincipals.length > 0) {
      setPrincipalId(availablePrincipals[0].id);
    }
  }, [adding, availablePrincipals, principalId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!principalId) { setMessage("Choose a Principal to seat on the Board."); return; }
    setBusy(true);
    const { error } = await supabase.from("board_members").insert({
      enterprise_id: enterprise.id,
      principal_id: principalId,
      seat_note: seatNote.trim() || null,
    });
    setBusy(false);
    if (error) { setMessage("Could not add this Board seat. Please try again."); return; }
    setPrincipalId(""); setSeatNote(""); setAdding(false);
    await refresh();
  }

  async function remove(id: string) {
    await supabase.from("board_members").delete().eq("id", id);
    await refresh();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-md">
        <p className="text-sm text-slate-grey">
          {seats.length === 0
            ? "No Board seats recorded yet. The Board of Directors is a roster only in this build — no convening, quorum, or voting."
            : `${seats.length} Board seat${seats.length === 1 ? "" : "s"} recorded.`}
        </p>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className={primaryBtn}
            disabled={principals.length === 0}
            title={principals.length === 0
              ? "Add a Principal first — Board seats are filled by Principals."
              : undefined}
          >
            Add seat
          </button>
        )}
      </div>

      {principals.length === 0 && (
        <p className="mt-sm text-xs text-slate-grey">
          No Principals recorded yet. Add a Principal on the Ownership & Leadership tab first.
        </p>
      )}

      {adding && availablePrincipals.length === 0 && (
        <p className="mt-md text-sm text-slate-grey">
          Every Principal is already seated on the Board.
        </p>
      )}

      {adding && availablePrincipals.length > 0 && (
        <form onSubmit={submit} className={"mt-md " + cardCls}>
          <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
            <label className="block">
              <span className={labelCls}>Principal</span>
              <select
                value={principalId}
                onChange={(e) => setPrincipalId(e.target.value)}
                className={inputCls}
              >
                {availablePrincipals.map((p) => (
                  <option key={p.id} value={p.id}>{p.full_name} · {p.role}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={labelCls}>Seat note (optional)</span>
              <input
                value={seatNote}
                onChange={(e) => setSeatNote(e.target.value)}
                placeholder="e.g. Chair; Independent Director"
                className={inputCls}
              />
            </label>
          </div>
          {message && <p className="mt-sm text-sm text-slate-grey">{message}</p>}
          <div className="mt-md flex items-center gap-sm">
            <button type="submit" disabled={busy} className={primaryBtn}>
              {busy ? "Adding…" : "Add seat"}
            </button>
            <button type="button" onClick={() => setAdding(false)} className={secondaryBtn}>Cancel</button>
          </div>
        </form>
      )}

      {seats.length > 0 && (
        <ul className="mt-md space-y-xs">
          {seats.map((s) => {
            const p = principalsById.get(s.principal_id);
            return (
              <li key={s.id} className={"flex flex-wrap items-center justify-between gap-md " + cardCls}>
                <div className="min-w-0">
                  <div className="text-sm text-kosha-navy">{p?.full_name ?? "—"}</div>
                  <div className="text-xs text-slate-grey">
                    {p?.role ?? "Principal"}{s.seat_note ? ` · ${s.seat_note}` : ""}
                  </div>
                </div>
                <button type="button" onClick={() => remove(s.id)} className={secondaryBtn}>
                  Remove seat
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}