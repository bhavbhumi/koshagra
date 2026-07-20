import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { findParticipantByEmail } from "@/lib/access-grants";

/**
 * A compact chip that reads/writes `linked_participant_id` on the given roster
 * table row. Linking a Steward or seat to a real Participant is what makes them
 * eligible to act as Checker on cross-domain Access Grants (Sprint 14).
 *
 * Domain rosters that this component supports:
 *   digital_executors · enforcers · knowledge_stewards · preparedness_stewards
 *   · family_members (Council/Assembly seats)
 */
export function LinkParticipant({
  table, rowId, linkedParticipantId, onChanged,
}: {
  table:
    | "digital_executors"
    | "enforcers"
    | "knowledge_stewards"
    | "preparedness_stewards"
    | "family_members";
  rowId: string;
  linkedParticipantId: string | null;
  onChanged?: () => Promise<void> | void;
}) {
  const [name, setName] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!linkedParticipantId) { setName(null); return; }
      const { data } = await supabase.from("participants").select("display_name").eq("id", linkedParticipantId).maybeSingle();
      if (!cancel) setName(data?.display_name ?? "Linked participant");
    })();
    return () => { cancel = true; };
  }, [linkedParticipantId]);

  async function link(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true); setMessage(null);
    const { data, error } = await findParticipantByEmail(email.trim());
    if (error || !data) {
      setBusy(false);
      setMessage("No Participant found with that email. Ask them to sign in first.");
      return;
    }
    const { error: upErr } = await supabase.from(table).update({ linked_participant_id: data.id }).eq("id", rowId);
    setBusy(false);
    if (upErr) { setMessage("Could not link. Please try again."); return; }
    setEditing(false); setEmail("");
    await onChanged?.();
  }

  async function unlink() {
    setBusy(true);
    await supabase.from(table).update({ linked_participant_id: null }).eq("id", rowId);
    setBusy(false);
    await onChanged?.();
  }

  if (linkedParticipantId) {
    return (
      <div className="mt-xs flex flex-wrap items-center gap-sm text-xs text-slate-grey">
        <span className="rounded px-2 py-0.5 uppercase tracking-widest bg-vault-ivory ring-1 ring-[color:var(--color-border-default)]">
          Linked · {name ?? "…"}
        </span>
        <button type="button" onClick={unlink} disabled={busy} className="underline hover:text-kosha-navy disabled:opacity-40">
          Unlink
        </button>
      </div>
    );
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="mt-xs text-xs text-slate-grey underline hover:text-kosha-navy"
      >
        Link Participant
      </button>
    );
  }

  return (
    <form onSubmit={link} className="mt-xs flex flex-wrap items-center gap-sm text-xs">
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="participant@example.com"
        className="rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-sm py-1 text-xs text-kosha-navy"
      />
      <button type="submit" disabled={busy} className="rounded-md bg-kosha-navy px-sm py-1 text-xs font-semibold text-vault-ivory disabled:opacity-40">
        {busy ? "Linking…" : "Link"}
      </button>
      <button type="button" onClick={() => { setEditing(false); setEmail(""); setMessage(null); }} className="text-slate-grey underline hover:text-kosha-navy">
        Cancel
      </button>
      {message && <span className="basis-full text-slate-grey">{message}</span>}
    </form>
  );
}