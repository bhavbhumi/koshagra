import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useParticipant } from "@/lib/participant";
import {
  decideAccessGrant,
  useMyRequests,
  usePendingReviews,
  type AccessGrant,
} from "@/lib/access-grants";

export const Route = createFileRoute("/_authenticated/review")({ component: ReviewPage });

type DocContext = {
  document_title: string;
  document_type: string;
  family_name: string;
};

type ParticipantLite = { id: string; display_name: string };

function ReviewPage() {
  const { participant } = useParticipant();
  const pid = participant?.id ?? null;
  const { items: pending, loading: pendingLoading, refresh: refreshPending } = usePendingReviews(pid);
  const { items: mine, loading: mineLoading, refresh: refreshMine } = useMyRequests(pid);

  const allGrants = useMemo(() => [...pending, ...mine], [pending, mine]);
  const docIds = useMemo(
    () => Array.from(new Set(
      allGrants
        .filter((g) => g.subject_entity_type === "governance_document")
        .map((g) => g.subject_entity_id),
    )),
    [allGrants],
  );
  const participantIds = useMemo(
    () => Array.from(new Set(
      allGrants.flatMap((g) => [g.maker_participant_id, g.checker_participant_id])
        .filter((v): v is string => !!v),
    )),
    [allGrants],
  );

  const [docCtx, setDocCtx] = useState<Record<string, DocContext>>({});
  const [people, setPeople] = useState<Record<string, ParticipantLite>>({});

  useEffect(() => {
    let cancel = false;
    (async () => {
      if (docIds.length === 0) { setDocCtx({}); return; }
      const { data } = await supabase
        .from("governance_documents")
        .select("id, title, document_type, family_id, continuity_subjects(name)")
        .in("id", docIds);
      if (cancel || !data) return;
      const map: Record<string, DocContext> = {};
      for (const row of data as Array<{ id: string; title: string; document_type: string; continuity_subjects: { name: string } | null }>) {
        map[row.id] = {
          document_title: row.title,
          document_type: row.document_type,
          family_name: row.continuity_subjects?.name ?? "—",
        };
      }
      setDocCtx(map);
    })();
    return () => { cancel = true; };
  }, [docIds]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      if (participantIds.length === 0) { setPeople({}); return; }
      const { data } = await supabase
        .from("participants")
        .select("id, display_name")
        .in("id", participantIds);
      if (cancel || !data) return;
      const map: Record<string, ParticipantLite> = {};
      for (const row of data) map[row.id] = row;
      setPeople(map);
    })();
    return () => { cancel = true; };
  }, [participantIds]);

  if (!participant || pendingLoading || mineLoading) {
    return (
      <section aria-busy="true" className="max-w-[64rem]">
        <div className="inline-flex items-center gap-sm text-sm text-slate-grey">
          <span className="h-2 w-2 rounded-full bg-slate-grey animate-pulse" aria-hidden />
          Loading Review…
        </div>
      </section>
    );
  }

  async function refresh() { await Promise.all([refreshPending(), refreshMine()]); }

  return (
    <section className="max-w-[72rem] space-y-2xl">
      <div>
        <h2 className="font-display text-[28px] leading-[36px] text-kosha-navy">Awaiting your decision</h2>
        <p className="mt-xs text-sm text-slate-grey">
          Access Grants where a Council or Assembly seat linked to you is eligible to act as Checker.
        </p>
        <div className="mt-md space-y-md">
          {pending.length === 0 && (
            <p className="text-sm text-slate-grey">Nothing is waiting on you right now.</p>
          )}
          {pending.map((g) => (
            <PendingCard
              key={g.id}
              grant={g}
              doc={docCtx[g.subject_entity_id]}
              makerName={people[g.maker_participant_id]?.display_name ?? "—"}
              onDecided={refresh}
            />
          ))}
        </div>
      </div>

      <div>
        <h2 className="font-display text-[28px] leading-[36px] text-kosha-navy">Your requests</h2>
        <p className="mt-xs text-sm text-slate-grey">
          Access Grants you originated, and where each one now stands.
        </p>
        <div className="mt-md space-y-md">
          {mine.length === 0 && (
            <p className="text-sm text-slate-grey">
              You haven't requested any transitions yet. Draft governance documents on{" "}
              <Link to="/family-governance" className="underline hover:text-kosha-navy">Family Governance</Link>{" "}
              can be sent for Council or Assembly review.
            </p>
          )}
          {mine.map((g) => (
            <MineCard
              key={g.id}
              grant={g}
              doc={docCtx[g.subject_entity_id]}
              checkerName={g.checker_participant_id ? people[g.checker_participant_id]?.display_name ?? "—" : null}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function DocLine({ doc }: { doc: DocContext | undefined }) {
  if (!doc) return <div className="text-sm text-kosha-navy">Governance document</div>;
  return (
    <div>
      <div className="text-xs uppercase tracking-widest text-slate-grey">{doc.document_type} · {doc.family_name}</div>
      <div className="mt-xs font-display text-[20px] leading-[28px] text-kosha-navy">{doc.document_title}</div>
    </div>
  );
}

function PendingCard({
  grant, doc, makerName, onDecided,
}: {
  grant: AccessGrant;
  doc: DocContext | undefined;
  makerName: string;
  onDecided: () => Promise<void> | void;
}) {
  const [mode, setMode] = useState<"idle" | "approve" | "deny">("idle");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(decision: "Granted" | "Denied") {
    setBusy(true); setMessage(null);
    const { error } = await decideAccessGrant(grant.id, decision, decision === "Denied" ? reason : null);
    setBusy(false);
    if (error) { setMessage(error.message || "Could not record this decision."); return; }
    setMode("idle"); setReason("");
    await onDecided();
  }

  return (
    <article className="rounded-md bg-pure-white p-md shadow-[var(--shadow-1)] ring-1 ring-[color:var(--color-border-default)]">
      <div className="flex flex-wrap items-start justify-between gap-md">
        <DocLine doc={doc} />
        <div className="text-right text-xs text-slate-grey">
          <div>Requested by</div>
          <div className="mt-xs text-sm text-kosha-navy">{makerName}</div>
        </div>
      </div>
      <p className="mt-sm text-sm text-slate-grey">
        Requested transition · <span className="text-kosha-navy">Activate</span>
      </p>

      {message && <p className="mt-sm text-sm text-slate-grey">{message}</p>}

      {mode === "idle" && (
        <div className="mt-md flex flex-wrap gap-sm">
          <button
            type="button"
            onClick={() => setMode("approve")}
            className="rounded-md bg-kosha-navy px-md py-2 text-sm font-semibold text-vault-ivory hover:bg-kosha-navy/90"
          >
            Approve
          </button>
          <button
            type="button"
            onClick={() => setMode("deny")}
            className="rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-md py-2 text-sm font-semibold text-kosha-navy hover:bg-vault-ivory"
          >
            Deny
          </button>
        </div>
      )}

      {mode === "approve" && (
        <div className="mt-md rounded-md bg-vault-ivory p-md ring-1 ring-[color:var(--color-border-default)]">
          <p className="text-sm text-kosha-navy">
            Approving will make this document Active. If another {doc?.document_type ?? "document"} of the same type
            is currently Active for this Family, it will be superseded — its history remains intact.
          </p>
          <div className="mt-md flex flex-wrap gap-sm">
            <button
              type="button"
              disabled={busy}
              onClick={() => submit("Granted")}
              className="rounded-md bg-kosha-navy px-md py-2 text-sm font-semibold text-vault-ivory hover:bg-kosha-navy/90 disabled:opacity-40"
            >
              {busy ? "Recording…" : "Confirm approval"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setMode("idle")}
              className="rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-md py-2 text-sm font-semibold text-kosha-navy hover:bg-vault-ivory"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {mode === "deny" && (
        <div className="mt-md rounded-md bg-vault-ivory p-md ring-1 ring-[color:var(--color-border-default)]">
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-slate-grey">Reason (optional)</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="mt-xs w-full rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-md py-2 text-sm text-kosha-navy"
              placeholder="A brief note the Maker will see."
            />
          </label>
          <div className="mt-md flex flex-wrap gap-sm">
            <button
              type="button"
              disabled={busy}
              onClick={() => submit("Denied")}
              className="rounded-md bg-kosha-navy px-md py-2 text-sm font-semibold text-vault-ivory hover:bg-kosha-navy/90 disabled:opacity-40"
            >
              {busy ? "Recording…" : "Confirm denial"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => { setMode("idle"); setReason(""); }}
              className="rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-md py-2 text-sm font-semibold text-kosha-navy hover:bg-vault-ivory"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

function MineCard({
  grant, doc, checkerName,
}: {
  grant: AccessGrant; doc: DocContext | undefined; checkerName: string | null;
}) {
  const statusCopy = grant.grant_status === "Requested"
    ? "Awaiting Council/Assembly review"
    : grant.grant_status === "Granted"
    ? "Granted"
    : "Denied";
  return (
    <article className="rounded-md bg-pure-white p-md shadow-[var(--shadow-1)] ring-1 ring-[color:var(--color-border-default)]">
      <div className="flex flex-wrap items-start justify-between gap-md">
        <DocLine doc={doc} />
        <div className="text-right">
          <span className="inline-flex items-center rounded-full bg-vault-ivory px-sm py-1 text-xs font-semibold text-slate-grey ring-1 ring-[color:var(--color-border-default)]">
            {statusCopy}
          </span>
          {grant.decision_at && (
            <div className="mt-xs font-numeral text-xs text-slate-grey">
              {new Date(grant.decision_at).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>
      <p className="mt-sm text-sm text-slate-grey">
        Requested transition · <span className="text-kosha-navy">Activate</span>
      </p>
      {checkerName && (
        <p className="mt-xs text-xs text-slate-grey">Decided by · <span className="text-kosha-navy">{checkerName}</span></p>
      )}
      {grant.denial_reason && (
        <p className="mt-xs text-xs text-slate-grey">Reason · {grant.denial_reason}</p>
      )}
    </article>
  );
}