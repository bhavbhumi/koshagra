import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AccessGrant = Database["public"]["Tables"]["access_grants"]["Row"];
export type AccessGrantStatus = "Requested" | "Granted" | "Denied";

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