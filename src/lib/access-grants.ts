import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AccessGrant = Database["public"]["Tables"]["access_grants"]["Row"];
export type AccessGrantStatus = "Requested" | "Granted" | "Denied";

export type AccessGrantSubjectType =
  | "governance_document"
  | "representation"
  | "institutional_memory_record"
  | "preparedness_record"
  | "dedication";

/**
 * Domain-facing copy for a Requested Transition. The Maker-Checker mechanism is
 * generic; every human label — including the "requested outcome" nuance for
 * Disposition — is derived here so /review can present a subject-appropriate
 * summary without loading each domain's ORM.
 */
export function transitionLabel(g: AccessGrant): string {
  const t = g.requested_transition;
  if (t === "Activate") return "Activate";
  if (t === "Retire") return "Retire";
  if (t === "Conclude") return "Conclude";
  if (t === "Decide Disposition") {
    return g.requested_outcome ? `Decide Disposition · ${g.requested_outcome}` : "Decide Disposition";
  }
  return t;
}

export function subjectTypeLabel(t: string): string {
  switch (t) {
    case "governance_document": return "Governance document";
    case "representation": return "Representation";
    case "institutional_memory_record": return "Institutional Memory Record";
    case "preparedness_record": return "Preparedness Record";
    case "dedication": return "Dedication";
    default: return t;
  }
}

/** All Access Grants where the signed-in Participant is the Maker. */
export function useMyRequests(participantId: string | null) {
  const [items, setItems] = useState<AccessGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    if (!participantId) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("access_grants")
      .select("*")
      .eq("maker_participant_id", participantId)
      .order("created_at", { ascending: false });
    setItems(data ?? []);
    setLoading(false);
  }, [participantId]);
  useEffect(() => { refresh(); }, [refresh]);
  return { items, loading, refresh };
}

/**
 * Access Grants visible to the signed-in Participant as an eligible Checker.
 * RLS surfaces both eligible-checker AND own-maker rows; filter to the ones
 * that aren't the caller's own requests and are still Requested.
 */
export function usePendingReviews(participantId: string | null) {
  const [items, setItems] = useState<AccessGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    if (!participantId) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("access_grants")
      .select("*")
      .eq("grant_status", "Requested")
      .neq("maker_participant_id", participantId)
      .order("created_at", { ascending: true });
    setItems(data ?? []);
    setLoading(false);
  }, [participantId]);
  useEffect(() => { refresh(); }, [refresh]);
  return { items, loading, refresh };
}

export async function findParticipantByEmail(email: string) {
  const { data, error } = await supabase.rpc("find_participant_by_email", { _email: email });
  if (error) return { data: null, error };
  const row = Array.isArray(data) && data.length > 0 ? data[0] : null;
  return { data: row, error: null };
}

export async function decideAccessGrant(grantId: string, decision: "Granted" | "Denied", reason?: string | null) {
  const args: { _grant_id: string; _decision: string; _reason?: string } = {
    _grant_id: grantId,
    _decision: decision,
  };
  if (reason && reason.trim() !== "") args._reason = reason.trim();
  return supabase.rpc("decide_access_grant", args);
}

export async function requestActivation(documentId: string, makerParticipantId: string) {
  return supabase.from("access_grants").insert({
    subject_entity_type: "governance_document",
    subject_entity_id: documentId,
    requested_transition: "Activate",
    required_scope_tier: "Approve",
    maker_participant_id: makerParticipantId,
  });
}

/** DM-0007 §5.3 — Digital Executor decides Memorialize vs Retire (post-Trigger). */
export async function requestDisposition(
  representationId: string,
  outcome: "Memorialize" | "Retire",
  subjectLabel: string,
  makerParticipantId: string,
) {
  return supabase.from("access_grants").insert({
    subject_entity_type: "representation",
    subject_entity_id: representationId,
    requested_transition: "Decide Disposition",
    requested_outcome: outcome,
    subject_label: subjectLabel,
    required_scope_tier: "Approve",
    maker_participant_id: makerParticipantId,
  });
}

/** DM-0008 §4.4 — Knowledge Steward retires a Curated Rationale. */
export async function requestMemoryRetirement(
  recordId: string,
  subjectLabel: string,
  makerParticipantId: string,
) {
  return supabase.from("access_grants").insert({
    subject_entity_type: "institutional_memory_record",
    subject_entity_id: recordId,
    requested_transition: "Retire",
    subject_label: subjectLabel,
    required_scope_tier: "Approve",
    maker_participant_id: makerParticipantId,
  });
}

/** DM-0009 §5.2 — Preparedness Steward retires a recognized Category. */
export async function requestPreparednessRetirement(
  recordId: string,
  subjectLabel: string,
  makerParticipantId: string,
) {
  return supabase.from("access_grants").insert({
    subject_entity_type: "preparedness_record",
    subject_entity_id: recordId,
    requested_transition: "Retire",
    subject_label: subjectLabel,
    required_scope_tier: "Approve",
    maker_participant_id: makerParticipantId,
  });
}

/** DM-0006 §5.4 — Enforcer confirms Conclusion of a Dedication. */
export async function requestDedicationConclusion(
  dedicationId: string,
  subjectLabel: string,
  makerParticipantId: string,
) {
  return supabase.from("access_grants").insert({
    subject_entity_type: "dedication",
    subject_entity_id: dedicationId,
    requested_transition: "Conclude",
    subject_label: subjectLabel,
    required_scope_tier: "Approve",
    maker_participant_id: makerParticipantId,
  });
}

/**
 * Has the signed-in Participant already submitted a Requested grant for this
 * subject + transition + outcome? UI uses this to hide the "Request X" button
 * while a decision is pending.
 */
export function useHasPendingRequest(
  makerParticipantId: string | null,
  subjectEntityType: AccessGrantSubjectType,
  subjectEntityId: string | null,
  requestedTransition: string,
  requestedOutcome?: string | null,
) {
  const [pending, setPending] = useState<boolean>(false);
  const check = useCallback(async () => {
    if (!makerParticipantId || !subjectEntityId) { setPending(false); return; }
    let q = supabase.from("access_grants").select("id", { count: "exact", head: true })
      .eq("subject_entity_type", subjectEntityType)
      .eq("subject_entity_id", subjectEntityId)
      .eq("requested_transition", requestedTransition)
      .eq("grant_status", "Requested");
    if (requestedOutcome) q = q.eq("requested_outcome", requestedOutcome);
    const { count } = await q;
    setPending((count ?? 0) > 0);
  }, [makerParticipantId, subjectEntityType, subjectEntityId, requestedTransition, requestedOutcome]);
  useEffect(() => { check(); }, [check]);
  return { pending, refresh: check };
}