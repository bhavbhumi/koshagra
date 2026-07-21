import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useParticipant } from "@/lib/participant";
import { WorkspaceIntro } from "@/components/shell/WorkspaceIntro";
import {
  GOVERNANCE_BODIES,
  GOVERNANCE_DOCUMENT_TYPES,
  useFamilies,
  useFamilyMembers,
  useGovernanceBodyMembers,
  useGovernanceDocuments,
  type Family,
  type FamilyMember,
  type GovernanceBody,
  type GovernanceDocument,
  type GovernanceDocumentType,
} from "@/lib/family";
import { findParticipantByEmail, requestActivation, type AccessGrant } from "@/lib/access-grants";

export const Route = createFileRoute("/_authenticated/family-governance")({
  component: FamilyGovernancePage,
});

type TabKey = "overview" | "members" | "documents" | "bodies" | "timeline";
const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "members", label: "Members" },
  { key: "documents", label: "Governance Documents" },
  { key: "bodies", label: "Council & Assembly" },
  { key: "timeline", label: "Timeline" },
];

import { formatEnInDate } from "@/lib/format";

function FamilyGovernancePage() {
  const { participant } = useParticipant();
  const { families, loading, refresh } = useFamilies(participant?.id ?? null);
  const [tab, setTab] = useState<TabKey>("overview");

  // Honour the existing Workspace Switcher: if the selected subject is one of
  // this Participant's Families, use it. Otherwise, if exactly one Family
  // exists, resolve to it directly (mirrors Estate Planning).
  const [selectedId, setSelectedId] = useState<string | null>(null);
  useEffect(() => {
    if (families.length === 0) { setSelectedId(null); return; }
    if (families.length === 1) setSelectedId(families[0].id);
    else setSelectedId((prev) => (prev && families.some((f) => f.id === prev) ? prev : null));
  }, [families]);

  const family = families.find((f) => f.id === selectedId) ?? null;

  if (loading) {
    return (
      <section aria-busy="true" className="max-w-[64rem]">
        <div className="inline-flex items-center gap-sm text-sm text-slate-grey">
          <span className="h-2 w-2 rounded-full bg-slate-grey animate-pulse" aria-hidden />
          Loading your Family…
        </div>
      </section>
    );
  }

  if (families.length === 0) {
    return (
      <section className="max-w-[42rem]">
        <div className="rounded-md border border-[color:var(--color-border-default)] bg-pure-white p-lg">
          <h2 className="font-display text-[20px] leading-[28px] text-kosha-navy">
            No family recorded yet
          </h2>
          <p className="mt-xs text-sm text-slate-grey">
            This is where a family writes down how it makes decisions together —
            members, the rulebook you follow, and who sits on which council. Start
            by adding your family in the Registry; you can add members and rules
            after that.
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

  if (!family) {
    return (
      <section className="max-w-[42rem]">
        <div className="rounded-md bg-pure-white p-lg shadow-[var(--shadow-1)] ring-1 ring-[color:var(--color-border-default)]">
          <h2 className="font-display text-[20px] leading-[28px] text-kosha-navy">
            Choose a Family
          </h2>
          <p className="mt-xs text-sm text-slate-grey">
            You steward more than one Family. Pick one to open its governance workspace —
            you can switch at any time from the Workspace Switcher in the header.
          </p>
          <ul className="mt-md space-y-xs">
            {families.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(f.id);
                    window.localStorage.setItem("koshagra.subject", f.id);
                  }}
                  className="w-full rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-md py-3 text-left text-sm text-kosha-navy hover:bg-vault-ivory"
                >
                  {f.name}
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
      <WorkspaceIntro slug="family" />
      <TabBar tab={tab} onChange={setTab} />
      <div className="mt-lg">
        {tab === "overview" && <OverviewTab family={family} onRefreshFamily={refresh} onNavigate={setTab} />}
        {tab === "members" && <MembersTab family={family} />}
        {tab === "documents" && <DocumentsTab family={family} participantId={participant?.id ?? null} />}
        {tab === "bodies" && <BodiesTab family={family} />}
        {tab === "timeline" && <TimelineTab family={family} />}
      </div>
    </section>
  );
}

function TabBar({ tab, onChange }: { tab: TabKey; onChange: (t: TabKey) => void }) {
  return (
    <div role="tablist" aria-label="Family Governance sections" className="flex flex-wrap gap-lg border-b border-[color:var(--color-border-default)]">
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

function OverviewTab({ family, onRefreshFamily, onNavigate }: {
  family: Family; onRefreshFamily: () => Promise<void> | void; onNavigate: (t: TabKey) => void;
}) {
  const { items: members } = useFamilyMembers(family.id);
  const { items: docs } = useGovernanceDocuments(family.id);
  const { items: seats } = useGovernanceBodyMembers(family.id);
  const [editing, setEditing] = useState(false);

  const active = members.filter((m) => m.status === "Active").length;
  const suspended = members.filter((m) => m.status === "Suspended").length;
  const countsByType = GOVERNANCE_DOCUMENT_TYPES.map((t) => ({
    type: t,
    drafts: docs.filter((d) => d.document_type === t && d.status === "Draft").length,
    total: docs.filter((d) => d.document_type === t).length,
  }));
  const councilSeats = seats.filter((s) => s.body === "Council").length;
  const assemblySeats = seats.filter((s) => s.body === "Assembly").length;

  const lastUpdatedIso = useMemo(() => {
    const candidates: (string | null | undefined)[] = [
      family.updated_at, family.created_at,
      ...members.flatMap((m) => [m.created_at]),
      ...docs.flatMap((d) => [d.updated_at, d.created_at]),
      ...seats.flatMap((s) => [s.created_at]),
    ];
    const times = candidates
      .filter((v): v is string => !!v)
      .map((v) => new Date(v).getTime())
      .filter((n) => Number.isFinite(n));
    if (times.length === 0) return null;
    return new Date(Math.max(...times)).toISOString();
  }, [family, members, docs, seats]);

  return (
    <div className="space-y-xl">
      <header>
        <h2 className="font-display text-[28px] leading-[36px] text-kosha-navy">{family.name}</h2>
        <PurposeBlock
          family={family}
          editing={editing}
          onEdit={() => setEditing(true)}
          onDone={async () => { setEditing(false); await onRefreshFamily(); }}
          onCancel={() => setEditing(false)}
        />
        {lastUpdatedIso && (
          <p className="mt-xs text-xs text-slate-grey">
            Last updated <span className="font-numeral">{formatEnInDate(lastUpdatedIso)}</span>
          </p>
        )}
      </header>

      <div>
        <div className="text-xs uppercase tracking-widest text-slate-grey">Status snapshot</div>
        <div className="mt-sm grid grid-cols-2 gap-md sm:grid-cols-3 lg:grid-cols-4">
          <StatCard label="Members · Active" value={active} />
          <StatCard label="Members · Suspended" value={suspended} />
          <StatCard
            label="Council seats"
            value={councilSeats}
            note={councilSeats === 0 ? { text: "No seats recorded yet", onClick: () => onNavigate("bodies") } : null}
          />
          <StatCard
            label="Assembly seats"
            value={assemblySeats}
            note={assemblySeats === 0 ? { text: "No seats recorded yet", onClick: () => onNavigate("bodies") } : null}
          />
          {countsByType.map((c) => (
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
  family, editing, onEdit, onDone, onCancel,
}: {
  family: Family; editing: boolean; onEdit: () => void; onDone: () => void; onCancel: () => void;
}) {
  const [draft, setDraft] = useState(family.purpose_description ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => { setDraft(family.purpose_description ?? ""); }, [family.id, family.purpose_description]);

  async function save() {
    setBusy(true);
    setMessage(null);
    const { error } = await supabase
      .from("continuity_subjects")
      .update({ purpose_description: draft.trim() === "" ? null : draft.trim() })
      .eq("id", family.id);
    setBusy(false);
    if (error) { setMessage("Could not save the Family Purpose. Please try again."); return; }
    onDone();
  }

  if (!editing) {
    return (
      <div className="mt-xs flex flex-wrap items-start gap-md">
        <p className="max-w-[48rem] text-sm text-slate-grey">
          {family.purpose_description ?? "No Family Purpose recorded yet."}
        </p>
        <button
          type="button"
          onClick={onEdit}
          className="rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-sm py-1 text-xs font-semibold text-kosha-navy hover:bg-vault-ivory"
        >
          Edit Purpose
        </button>
      </div>
    );
  }

  return (
    <div className="mt-sm max-w-[48rem]">
      <label htmlFor="family-purpose" className="text-xs uppercase tracking-widest text-slate-grey">
        Family Purpose
      </label>
      <textarea
        id="family-purpose"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={4}
        className="mt-xs w-full rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-md py-2 text-sm text-kosha-navy"
      />
      <p className="mt-xs text-xs text-slate-grey">
        Purpose may evolve without severing Continuity, provided the change is deliberate and reviewed.
      </p>
      {message && <p className="mt-sm text-sm text-slate-grey">{message}</p>}
      <div className="mt-sm flex items-center gap-sm">
        <button
          type="button"
          disabled={busy}
          onClick={save}
          className="rounded-md bg-kosha-navy px-md py-2 text-sm font-semibold text-vault-ivory hover:bg-kosha-navy/90 disabled:opacity-40"
        >
          {busy ? "Saving…" : "Save Purpose"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-md py-2 text-sm font-semibold text-kosha-navy hover:bg-vault-ivory"
        >
          Cancel
        </button>
      </div>
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

/* ================= Members ================= */

function MembersTab({ family }: { family: Family }) {
  const { items, refresh } = useFamilyMembers(family.id);
  const [creating, setCreating] = useState(false);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-md">
        <p className="text-sm text-slate-grey">
          {items.length === 0
            ? "No Family Members recorded yet."
            : `${items.length} Family Member${items.length === 1 ? "" : "s"} — Belonging is always visible.`}
        </p>
        {!creating && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="rounded-md bg-kosha-navy px-md py-2 text-sm font-semibold text-vault-ivory hover:bg-kosha-navy/90"
          >
            Add Family Member
          </button>
        )}
      </div>

      {creating && (
        <MemberForm
          familyId={family.id}
          onCancel={() => setCreating(false)}
          onCreated={async () => { setCreating(false); await refresh(); }}
        />
      )}

      {items.length > 0 && (
        <ul className="mt-md space-y-xs">
          {items.map((m) => (
            <MemberRow key={m.id} member={m} onChanged={refresh} />
          ))}
        </ul>
      )}
    </div>
  );
}

function MemberRow({ member, onChanged }: { member: FamilyMember; onChanged: () => Promise<void> | void }) {
  const [busy, setBusy] = useState(false);
  async function toggle() {
    setBusy(true);
    const next = member.status === "Active" ? "Suspended" : "Active";
    await supabase.from("family_members").update({ status: next }).eq("id", member.id);
    setBusy(false);
    await onChanged();
  }
  const suspended = member.status === "Suspended";
  return (
    <li className="flex flex-wrap items-center justify-between gap-md rounded-md bg-pure-white px-md py-3 shadow-[var(--shadow-1)] ring-1 ring-[color:var(--color-border-default)]">
      <div className="min-w-0">
        <div className="text-sm text-kosha-navy">{member.full_name}</div>
        {member.branch && (
          <div className="text-xs text-slate-grey">Branch · {member.branch}</div>
        )}
      </div>
      <div className="flex items-center gap-sm">
        <span
          className={
            "inline-flex items-center rounded-full px-sm py-1 text-xs font-semibold " +
            (suspended
              ? "bg-vault-ivory text-slate-grey ring-1 ring-[color:var(--color-border-default)]"
              : "bg-kosha-navy text-vault-ivory")
          }
        >
          {suspended ? "Suspended" : "Active"}
        </span>
        <button
          type="button"
          disabled={busy}
          onClick={toggle}
          className="rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-sm py-1 text-xs font-semibold text-kosha-navy hover:bg-vault-ivory disabled:opacity-40"
        >
          {suspended ? "Restore" : "Suspend"}
        </button>
      </div>
    </li>
  );
}

function MemberForm({ familyId, onCancel, onCreated }: { familyId: string; onCancel: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [branch, setBranch] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setMessage("A full name is required."); return; }
    setBusy(true);
    const { error } = await supabase.from("family_members").insert({
      family_id: familyId,
      full_name: name.trim(),
      branch: branch.trim() === "" ? null : branch.trim(),
    });
    setBusy(false);
    if (error) { setMessage("Could not add this Family Member. Please try again."); return; }
    onCreated();
  }

  return (
    <form onSubmit={submit} className="mt-md rounded-md bg-pure-white p-md shadow-[var(--shadow-1)] ring-1 ring-[color:var(--color-border-default)]">
      <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
        <label className="block">
          <span className="text-xs uppercase tracking-widest text-slate-grey">Full name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-xs w-full rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-md py-2 text-sm text-kosha-navy"
          />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-widest text-slate-grey">Branch (optional)</span>
          <input
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            className="mt-xs w-full rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-md py-2 text-sm text-kosha-navy"
          />
        </label>
      </div>
      {message && <p className="mt-sm text-sm text-slate-grey">{message}</p>}
      <div className="mt-md flex items-center gap-sm">
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-kosha-navy px-md py-2 text-sm font-semibold text-vault-ivory hover:bg-kosha-navy/90 disabled:opacity-40"
        >
          {busy ? "Adding…" : "Add Family Member"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-md py-2 text-sm font-semibold text-kosha-navy hover:bg-vault-ivory"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

/* ================= Governance Documents ================= */

function DocumentsTab({ family, participantId }: { family: Family; participantId: string | null }) {
  const { items, refresh } = useGovernanceDocuments(family.id);
  const { items: members } = useFamilyMembers(family.id);
  const { items: seats } = useGovernanceBodyMembers(family.id);
  const [filter, setFilter] = useState<GovernanceDocumentType | "All">("All");
  const [creatingType, setCreatingType] = useState<GovernanceDocumentType | null>(null);
  const [grantsByDoc, setGrantsByDoc] = useState<Record<string, AccessGrant>>({});

  const docIds = useMemo(() => items.map((d) => d.id), [items]);

  const loadGrants = useCallback(async () => {
    if (docIds.length === 0) { setGrantsByDoc({}); return; }
    const { data } = await supabase
      .from("access_grants")
      .select("*")
      .eq("subject_entity_type", "governance_document")
      .in("subject_entity_id", docIds)
      .order("created_at", { ascending: false });
    const map: Record<string, AccessGrant> = {};
    for (const g of data ?? []) if (!map[g.subject_entity_id]) map[g.subject_entity_id] = g;
    setGrantsByDoc(map);
  }, [docIds]);

  useEffect(() => { loadGrants(); }, [loadGrants]);

  const linkedMemberIds = new Set(members.filter((m) => m.linked_participant_id).map((m) => m.id));
  const hasLinkedSeat = seats.some((s) => linkedMemberIds.has(s.family_member_id));

  const visible = filter === "All" ? items : items.filter((d) => d.document_type === filter);

  async function refreshAll() { await Promise.all([refresh(), loadGrants()]); }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-md">
        <div role="tablist" aria-label="Document type" className="flex flex-wrap gap-sm">
          {(["All", ...GOVERNANCE_DOCUMENT_TYPES] as const).map((f) => {
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
          {GOVERNANCE_DOCUMENT_TYPES.map((t) => (
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
          familyId={family.id}
          documentType={creatingType}
          onCancel={() => setCreatingType(null)}
          onCreated={async () => { setCreatingType(null); await refresh(); }}
        />
      )}

      <div className="mt-md space-y-md">
        {visible.length === 0 && (
          <p className="text-sm text-slate-grey">No governance documents recorded yet.</p>
        )}
        {visible.map((d) => (
          <DocumentCard
            key={d.id}
            doc={d}
            grant={grantsByDoc[d.id] ?? null}
            participantId={participantId}
            hasLinkedSeat={hasLinkedSeat}
            onChanged={refreshAll}
          />
        ))}
      </div>
    </div>
  );
}

function DocumentCard({
  doc, grant, participantId, hasLinkedSeat, onChanged,
}: {
  doc: GovernanceDocument;
  grant: AccessGrant | null;
  participantId: string | null;
  hasLinkedSeat: boolean;
  onChanged: () => Promise<void> | void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(doc.title);
  const [body, setBody] = useState(doc.body);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => { setTitle(doc.title); setBody(doc.body); }, [doc.id, doc.title, doc.body]);

  async function save() {
    if (!title.trim()) { setMessage("A title is required."); return; }
    setBusy(true);
    const { error } = await supabase
      .from("governance_documents")
      .update({ title: title.trim(), body })
      .eq("id", doc.id);
    setBusy(false);
    if (error) { setMessage("Could not save this document. Please try again."); return; }
    setEditing(false);
    await onChanged();
  }

  async function submitRequest() {
    if (!participantId) return;
    setBusy(true); setMessage(null);
    const { error } = await requestActivation(doc.id, participantId);
    setBusy(false);
    if (error) { setMessage("Could not request activation. Please try again."); return; }
    setConfirming(false);
    await onChanged();
  }

  const pending = grant && grant.grant_status === "Requested";
  const canRequest = doc.status === "Draft" && !pending && hasLinkedSeat && !!participantId;

  return (
    <article className="rounded-md bg-pure-white p-md shadow-[var(--shadow-1)] ring-1 ring-[color:var(--color-border-default)]">
      <div className="flex flex-wrap items-start justify-between gap-md">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-widest text-slate-grey">{doc.document_type}</div>
          {!editing ? (
            <h3 className="mt-xs font-display text-[20px] leading-[28px] text-kosha-navy">{doc.title}</h3>
          ) : (
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-xs w-full max-w-[36rem] rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-md py-2 text-sm text-kosha-navy"
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
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={8}
          className="mt-sm w-full rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-md py-2 text-sm text-kosha-navy"
        />
      )}

      {pending ? (
        <p className="mt-md text-xs text-slate-grey">
          Activation requested — awaiting Council/Assembly review.
        </p>
      ) : doc.status === "Draft" ? (
        <p className="mt-md text-xs text-slate-grey">
          Activation requires Family Council or Assembly approval. A seated Participant other
          than the Maker records the decision on Review.
        </p>
      ) : null}

      {message && <p className="mt-sm text-sm text-slate-grey">{message}</p>}

      {confirming && (
        <div className="mt-md rounded-md bg-vault-ivory p-md ring-1 ring-[color:var(--color-border-default)]">
          <p className="text-sm text-kosha-navy">
            This sends the draft to your Family Council or Assembly for review. A seated
            Participant other than you will decide. You can continue editing until a decision
            is recorded — the request stands on its current content.
          </p>
          <div className="mt-md flex flex-wrap gap-sm">
            <button
              type="button"
              disabled={busy}
              onClick={submitRequest}
              className="rounded-md bg-kosha-navy px-md py-2 text-sm font-semibold text-vault-ivory hover:bg-kosha-navy/90 disabled:opacity-40"
            >
              {busy ? "Sending…" : "Confirm request"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirming(false)}
              className="rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-md py-2 text-sm font-semibold text-kosha-navy hover:bg-vault-ivory"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="mt-md flex flex-wrap items-center gap-sm">
        {!editing ? (
          <>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-md py-2 text-sm font-semibold text-kosha-navy hover:bg-vault-ivory"
            >
              Edit Draft
            </button>
            {doc.status === "Draft" && !pending && (
              <button
                type="button"
                disabled={!canRequest}
                title={!hasLinkedSeat
                  ? "Activation needs at least one Council or Assembly seat linked to a real Participant — add one on the Council & Assembly tab."
                  : undefined}
                onClick={() => setConfirming(true)}
                className="rounded-md bg-kosha-navy px-md py-2 text-sm font-semibold text-vault-ivory hover:bg-kosha-navy/90 disabled:opacity-40"
              >
                Request Activation
              </button>
            )}
            {doc.status === "Draft" && !pending && !hasLinkedSeat && (
              <span className="text-xs text-slate-grey">
                Activation needs at least one Council or Assembly seat linked to a real
                Participant — add one on the Council & Assembly tab.
              </span>
            )}
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={save}
              className="rounded-md bg-kosha-navy px-md py-2 text-sm font-semibold text-vault-ivory hover:bg-kosha-navy/90 disabled:opacity-40"
            >
              {busy ? "Saving…" : "Save Draft"}
            </button>
            <button
              type="button"
              onClick={() => { setEditing(false); setTitle(doc.title); setBody(doc.body); }}
              className="rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-md py-2 text-sm font-semibold text-kosha-navy hover:bg-vault-ivory"
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
  familyId, documentType, onCancel, onCreated,
}: {
  familyId: string; documentType: GovernanceDocumentType; onCancel: () => void; onCreated: () => void;
}) {
  const defaultTitle = documentType === "Family Policy" ? "" : documentType;
  const [title, setTitle] = useState(defaultTitle);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setMessage(documentType === "Family Policy"
        ? "Name the specific subject this Policy governs (e.g. \"Education Support Policy\")."
        : "A title is required.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("governance_documents").insert({
      family_id: familyId,
      document_type: documentType,
      title: title.trim(),
      body,
    });
    setBusy(false);
    if (error) { setMessage("Could not create this document. Please try again."); return; }
    onCreated();
  }

  return (
    <form onSubmit={submit} className="mt-md rounded-md bg-pure-white p-md shadow-[var(--shadow-1)] ring-1 ring-[color:var(--color-border-default)]">
      <div className="text-xs uppercase tracking-widest text-slate-grey">New {documentType}</div>
      <label className="mt-sm block">
        <span className="text-xs uppercase tracking-widest text-slate-grey">
          {documentType === "Family Policy" ? "Policy subject" : "Title"}
        </span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={documentType === "Family Policy" ? "e.g. Education Support Policy" : undefined}
          className="mt-xs w-full rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-md py-2 text-sm text-kosha-navy"
        />
      </label>
      <label className="mt-md block">
        <span className="text-xs uppercase tracking-widest text-slate-grey">Body</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={8}
          className="mt-xs w-full rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-md py-2 text-sm text-kosha-navy"
        />
      </label>
      <p className="mt-sm text-xs text-slate-grey">
        Saved as Draft. Activation requires Family Council or Assembly approval — not
        supported in this build.
      </p>
      {message && <p className="mt-sm text-sm text-slate-grey">{message}</p>}
      <div className="mt-md flex items-center gap-sm">
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-kosha-navy px-md py-2 text-sm font-semibold text-vault-ivory hover:bg-kosha-navy/90 disabled:opacity-40"
        >
          {busy ? "Saving…" : "Save Draft"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-md py-2 text-sm font-semibold text-kosha-navy hover:bg-vault-ivory"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

/* ================= Council & Assembly ================= */

function BodiesTab({ family }: { family: Family }) {
  const { items: members, refresh: refreshMembers } = useFamilyMembers(family.id);
  const { items: seats, refresh } = useGovernanceBodyMembers(family.id);
  const [body, setBody] = useState<GovernanceBody>("Council");

  const seatsForBody = seats.filter((s) => s.body === body);
  const membersById = useMemo(
    () => new Map(members.map((m) => [m.id, m] as const)),
    [members],
  );

  const [linkingMemberId, setLinkingMemberId] = useState<string | null>(null);
  const [linkEmail, setLinkEmail] = useState("");
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkMessage, setLinkMessage] = useState<string | null>(null);
  const [linkedNames, setLinkedNames] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancel = false;
    (async () => {
      const ids = Array.from(new Set(
        members.map((m) => m.linked_participant_id).filter((v): v is string => !!v),
      ));
      if (ids.length === 0) { setLinkedNames({}); return; }
      const { data } = await supabase.from("participants").select("id, display_name").in("id", ids);
      if (cancel || !data) return;
      const map: Record<string, string> = {};
      for (const p of data) map[p.id] = p.display_name;
      setLinkedNames(map);
    })();
    return () => { cancel = true; };
  }, [members]);

  function openLink(memberId: string) {
    setLinkingMemberId(memberId);
    setLinkEmail("");
    setLinkMessage(null);
  }

  async function submitLink(memberId: string) {
    if (!linkEmail.trim()) { setLinkMessage("Enter the Participant's email."); return; }
    setLinkBusy(true); setLinkMessage(null);
    const { data, error } = await findParticipantByEmail(linkEmail.trim());
    if (error) { setLinkBusy(false); setLinkMessage("Could not look up that Participant."); return; }
    if (!data) { setLinkBusy(false); setLinkMessage("No Koshagra Participant is registered with that email yet."); return; }
    const { error: upErr } = await supabase
      .from("family_members")
      .update({ linked_participant_id: data.id })
      .eq("id", memberId);
    setLinkBusy(false);
    if (upErr) { setLinkMessage("Could not link this seat. Please try again."); return; }
    setLinkingMemberId(null); setLinkEmail("");
    await refreshMembers();
  }

  async function unlink(memberId: string) {
    await supabase.from("family_members").update({ linked_participant_id: null }).eq("id", memberId);
    await refreshMembers();
  }

  return (
    <div>
      <div role="tablist" aria-label="Governance bodies" className="flex gap-sm">
        {GOVERNANCE_BODIES.map((b) => {
          const active = body === b;
          return (
            <button
              key={b}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setBody(b)}
              className={
                "rounded-full px-md py-1 text-xs font-semibold " +
                (active
                  ? "bg-kosha-navy text-vault-ivory"
                  : "bg-pure-white text-slate-grey ring-1 ring-[color:var(--color-border-default)] hover:text-kosha-navy")
              }
            >
              Family {b}
            </button>
          );
        })}
      </div>

      <p className="mt-md text-xs text-slate-grey">
        Rosters only — who is seated on this body. Convening, quorum, and Decision-making
        arrive with a later sprint.
      </p>

      <SeatForm
        familyId={family.id}
        body={body}
        members={members}
        onCreated={refresh}
      />

      <ul className="mt-md space-y-xs">
        {seatsForBody.length === 0 && (
          <li className="text-sm text-slate-grey">No seats recorded on the Family {body} yet.</li>
        )}
        {seatsForBody.map((s) => {
          const m = membersById.get(s.family_member_id);
          const linkedName = m?.linked_participant_id ? linkedNames[m.linked_participant_id] : null;
          const isLinking = linkingMemberId === s.family_member_id;
          return (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-md rounded-md bg-pure-white px-md py-3 shadow-[var(--shadow-1)] ring-1 ring-[color:var(--color-border-default)]">
              <div className="min-w-0">
                <div className="text-sm text-kosha-navy">{m?.full_name ?? "—"}</div>
                {s.seat_note && <div className="text-xs text-slate-grey">{s.seat_note}</div>}
                {linkedName && (
                  <div className="text-xs text-slate-grey">Linked to <span className="text-kosha-navy">{linkedName}</span></div>
                )}
                {isLinking && (
                  <div className="mt-sm flex flex-wrap items-center gap-sm">
                    <input
                      value={linkEmail}
                      onChange={(e) => setLinkEmail(e.target.value)}
                      placeholder="participant@example.com"
                      className="rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-md py-1 text-sm text-kosha-navy"
                    />
                    <button
                      type="button"
                      disabled={linkBusy}
                      onClick={() => submitLink(s.family_member_id)}
                      className="rounded-md bg-kosha-navy px-md py-1 text-xs font-semibold text-vault-ivory hover:bg-kosha-navy/90 disabled:opacity-40"
                    >
                      {linkBusy ? "Linking…" : "Link"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setLinkingMemberId(null); setLinkEmail(""); setLinkMessage(null); }}
                      className="rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-md py-1 text-xs font-semibold text-kosha-navy hover:bg-vault-ivory"
                    >
                      Cancel
                    </button>
                    {linkMessage && <span className="text-xs text-slate-grey">{linkMessage}</span>}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-sm">
                {m && !m.linked_participant_id && !isLinking && (
                  <button
                    type="button"
                    onClick={() => openLink(s.family_member_id)}
                    className="rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-sm py-1 text-xs font-semibold text-kosha-navy hover:bg-vault-ivory"
                  >
                    Link Participant
                  </button>
                )}
                {m?.linked_participant_id && (
                  <button
                    type="button"
                    onClick={() => unlink(s.family_member_id)}
                    className="rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-sm py-1 text-xs font-semibold text-kosha-navy hover:bg-vault-ivory"
                  >
                    Unlink
                  </button>
                )}
                <button
                  type="button"
                  onClick={async () => {
                    await supabase.from("governance_body_members").delete().eq("id", s.id);
                    await refresh();
                  }}
                  className="rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-sm py-1 text-xs font-semibold text-kosha-navy hover:bg-vault-ivory"
                >
                  Remove seat
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SeatForm({
  familyId, body, members, onCreated,
}: {
  familyId: string; body: GovernanceBody; members: FamilyMember[]; onCreated: () => Promise<void> | void;
}) {
  const [memberId, setMemberId] = useState<string>("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!memberId) { setMessage("Choose a Family Member to seat."); return; }
    setBusy(true);
    const { error } = await supabase.from("governance_body_members").insert({
      family_id: familyId,
      body,
      family_member_id: memberId,
      seat_note: note.trim() === "" ? null : note.trim(),
    });
    setBusy(false);
    if (error) { setMessage("Could not add this seat. They may already be seated on this body."); return; }
    setMemberId(""); setNote(""); setMessage(null);
    await onCreated();
  }

  if (members.length === 0) {
    return (
      <p className="mt-md text-sm text-slate-grey">
        Add Family Members first — you can then seat them on the {body}.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="mt-md rounded-md bg-pure-white p-md shadow-[var(--shadow-1)] ring-1 ring-[color:var(--color-border-default)]">
      <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
        <label className="block">
          <span className="text-xs uppercase tracking-widest text-slate-grey">Family Member</span>
          <select
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            className="mt-xs w-full rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-md py-2 text-sm text-kosha-navy"
          >
            <option value="">Select a Family Member…</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name}{m.branch ? ` · ${m.branch}` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-widest text-slate-grey">Seat note (optional)</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Branch Representative"
            className="mt-xs w-full rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-md py-2 text-sm text-kosha-navy"
          />
        </label>
      </div>
      {message && <p className="mt-sm text-sm text-slate-grey">{message}</p>}
      <div className="mt-md">
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-kosha-navy px-md py-2 text-sm font-semibold text-vault-ivory hover:bg-kosha-navy/90 disabled:opacity-40"
        >
          {busy ? "Adding…" : `Add seat to Family ${body}`}
        </button>
      </div>
    </form>
  );
}

/* ================= Timeline ================= */

type TimelineEntry = { at: string; label: string };

function TimelineTab({ family }: { family: Family }) {
  const { items: members } = useFamilyMembers(family.id);
  const { items: docs } = useGovernanceDocuments(family.id);
  const { items: seats } = useGovernanceBodyMembers(family.id);

  const seatedName = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of members) map.set(m.id, m.full_name);
    return map;
  }, [members]);

  const entries = useMemo<TimelineEntry[]>(() => {
    const out: TimelineEntry[] = [];
    out.push({ at: family.created_at, label: "Family created" });
    for (const m of members) out.push({ at: m.created_at, label: `Family Member added: ${m.full_name}` });
    for (const d of docs) out.push({ at: d.created_at, label: `${d.document_type} drafted: ${d.title}` });
    for (const s of seats) {
      const name = seatedName.get(s.family_member_id) ?? "A Family Member";
      out.push({ at: s.created_at, label: `${name} seated on the ${s.body}` });
    }
    return out.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [family, members, docs, seats, seatedName]);

  return (
    <div className="max-w-[48rem]">
      <p className="text-sm text-slate-grey">
        Every recorded event for this Family, most recent first.
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