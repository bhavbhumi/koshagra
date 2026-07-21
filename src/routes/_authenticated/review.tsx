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
import {
  Term,
  plainSubjectType,
  plainTransition,
  formalHintFor,
} from "@/components/glossary/Glossary";

export const Route = createFileRoute("/_authenticated/review")({ component: ReviewPage });

type ParticipantLite = { id: string; display_name: string };

function ReviewPage() {
  const { participant } = useParticipant();
  const pid = participant?.id ?? null;
  const { items: pending, loading: pendingLoading, refresh: refreshPending } = usePendingReviews(pid);
  const { items: mine, loading: mineLoading, refresh: refreshMine } = useMyRequests(pid);

  const allGrants = useMemo(() => [...pending, ...mine], [pending, mine]);
  const participantIds = useMemo(
    () => Array.from(new Set(
      allGrants.flatMap((g) => [g.maker_participant_id, g.checker_participant_id])
        .filter((v): v is string => !!v),
    )),
    [allGrants],
  );

  const [people, setPeople] = useState<Record<string, ParticipantLite>>({});

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
        <h2 className="font-display text-[28px] leading-[36px] text-kosha-navy">Waiting for your decision</h2>
        <p className="mt-xs text-sm text-slate-grey">
          Someone in your family or circle asked to change something, and you're the person who can approve or decline it. Nothing changes until you decide.
        </p>
        <div className="mt-md space-y-md">
          {pending.length === 0 && (
            <p className="text-sm text-slate-grey">Nothing is waiting on you right now.</p>
          )}
          {pending.map((g) => (
            <PendingCard
              key={g.id}
              grant={g}
              makerName={people[g.maker_participant_id]?.display_name ?? "—"}
              onDecided={refresh}
            />
          ))}
        </div>
      </div>

      <div>
        <h2 className="font-display text-[28px] leading-[36px] text-kosha-navy">Requests you sent</h2>
        <p className="mt-xs text-sm text-slate-grey">
          Changes you've asked for, and where each one stands. You can't approve your own request — a second person has to.
        </p>
        <div className="mt-md space-y-md">
          {mine.length === 0 && (
            <p className="text-sm text-slate-grey">
              You haven't asked for any changes yet. From any workspace — Family Governance,
              Digital Legacy, Institutional Memory, Preparedness, or Philanthropy — you can propose
              a change and send it here for a second person to approve.
            </p>
          )}
          {mine.map((g) => (
            <MineCard
              key={g.id}
              grant={g}
              checkerName={g.checker_participant_id ? people[g.checker_participant_id]?.display_name ?? "—" : null}
            />
          ))}
        </div>
      </div>
      <p className="text-xs text-slate-grey">
        <Link to="/family-governance" className="underline hover:text-kosha-navy">Family Governance</Link>
        {" · "}
        <Link to="/digital-legacy" className="underline hover:text-kosha-navy">Digital Legacy</Link>
        {" · "}
        <Link to="/institutional-memory" className="underline hover:text-kosha-navy">Institutional Memory</Link>
        {" · "}
        <Link to="/institutional-preparedness" className="underline hover:text-kosha-navy">Institutional Preparedness</Link>
        {" · "}
        <Link to="/philanthropy" className="underline hover:text-kosha-navy">Philanthropy</Link>
      </p>
    </section>
  );
}

function SubjectLine({ grant }: { grant: AccessGrant }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-widest text-slate-grey">
        <Term termKey={grant.subject_entity_type as never}>
          {plainSubjectType(grant.subject_entity_type)}
        </Term>
      </div>
      <div className="mt-xs font-display text-[20px] leading-[28px] text-kosha-navy">
        {grant.subject_label ?? "—"}
      </div>
    </div>
  );
}

function PendingCard({
  grant, makerName, onDecided,
}: {
  grant: AccessGrant;
  makerName: string;
  onDecided: () => Promise<void> | void;
}) {
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(decision: "Granted" | "Denied") {
    setBusy(true); setMessage(null);
    const { error } = await decideAccessGrant(
      grant.id,
      decision,
      decision === "Denied" ? reason : null,
    );
    setBusy(false);
    if (error) { setMessage(error.message || "Could not record this decision."); return; }
    setDeclining(false); setReason("");
    await onDecided();
  }

  const plain = plainTransition(grant.requested_transition, grant.subject_entity_type);
  const { formal, hint } = formalHintFor(grant.requested_transition, grant.subject_entity_type);
  const subjectPlain = plainSubjectType(grant.subject_entity_type);
  const subjectLabel = grant.subject_label ?? "—";
  const outcome = grant.requested_outcome ? ` — ${grant.requested_outcome}` : "";

  return (
    <article className="rounded-md bg-pure-white p-md shadow-[var(--shadow-1)] ring-1 ring-[color:var(--color-border-default)]">
      <p className="text-[15px] leading-[24px] text-kosha-navy">
        <span className="text-kosha-navy">{makerName}</span>
        {" is asking to "}
        <span
          title={hint ? `${formal} — ${hint}` : formal}
          className="underline decoration-dotted decoration-slate-grey/60 underline-offset-4 cursor-help"
        >
          {plain.toLowerCase()}
        </span>
        {" on "}
        <span className="text-kosha-navy">{subjectLabel}</span>
        {outcome && <span className="text-kosha-navy">{outcome}</span>}
        {" — a "}
        <Term termKey={grant.subject_entity_type as never}>{subjectPlain.toLowerCase()}</Term>
        {". You can approve or decline. Nothing changes until you do."}
      </p>

      {message && <p className="mt-sm text-sm text-slate-grey">{message}</p>}

      {!declining && (
        <div className="mt-md flex flex-wrap gap-sm">
          <button
            type="button"
            disabled={busy}
            onClick={() => submit("Granted")}
            className="rounded-md bg-kosha-navy px-md py-2 text-sm font-semibold text-vault-ivory hover:bg-kosha-navy/90 disabled:opacity-40"
          >
            {busy ? "Recording…" : "Approve"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setDeclining(true)}
            className="rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-md py-2 text-sm font-semibold text-kosha-navy hover:bg-vault-ivory"
          >
            Decline
          </button>
        </div>
      )}

      {declining && (
        <div className="mt-md rounded-md bg-vault-ivory p-md ring-1 ring-[color:var(--color-border-default)]">
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-slate-grey">Reason (optional)</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="mt-xs w-full rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-md py-2 text-sm text-kosha-navy"
              placeholder="A short note the person who asked will see."
            />
          </label>
          <div className="mt-md flex flex-wrap gap-sm">
            <button
              type="button"
              disabled={busy}
              onClick={() => submit("Denied")}
              className="rounded-md bg-kosha-navy px-md py-2 text-sm font-semibold text-vault-ivory hover:bg-kosha-navy/90 disabled:opacity-40"
            >
              {busy ? "Recording…" : "Confirm decline"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => { setDeclining(false); setReason(""); }}
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
  grant, checkerName,
}: {
  grant: AccessGrant; checkerName: string | null;
}) {
  const statusCopy = grant.grant_status === "Requested"
    ? "Awaiting review"
    : grant.grant_status === "Granted"
    ? "Approved"
    : "Declined";
  return (
    <article className="rounded-md bg-pure-white p-md shadow-[var(--shadow-1)] ring-1 ring-[color:var(--color-border-default)]">
      <div className="flex flex-wrap items-start justify-between gap-md">
        <SubjectLine grant={grant} />
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
      <TransitionLine grant={grant} />
      {checkerName && (
        <p className="mt-xs text-xs text-slate-grey">Decided by · <span className="text-kosha-navy">{checkerName}</span></p>
      )}
      {grant.denial_reason && (
        <p className="mt-xs text-xs text-slate-grey">Reason · {grant.denial_reason}</p>
      )}
    </article>
  );
}

function TransitionLine({ grant }: { grant: AccessGrant }) {
  const plain = plainTransition(grant.requested_transition, grant.subject_entity_type);
  const { formal, hint } = formalHintFor(grant.requested_transition, grant.subject_entity_type);
  const outcome = grant.requested_outcome ? ` — ${grant.requested_outcome}` : "";
  return (
    <p className="mt-sm text-sm text-slate-grey">
      What will change ·{" "}
      <span
        title={hint ? `${formal} — ${hint}` : formal}
        className="text-kosha-navy underline decoration-dotted decoration-slate-grey/60 underline-offset-4 cursor-help"
      >
        {plain}
      </span>
      {outcome && <span className="text-kosha-navy">{outcome}</span>}
    </p>
  );
}