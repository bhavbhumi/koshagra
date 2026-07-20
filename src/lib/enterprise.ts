import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Enterprise = Database["public"]["Tables"]["continuity_subjects"]["Row"];
export type EnterprisePrincipal = Database["public"]["Tables"]["enterprise_principals"]["Row"];
export type EnterprisePrincipalRole = Database["public"]["Enums"]["enterprise_principal_role"];
export type OwnershipInterest = Database["public"]["Tables"]["ownership_interests"]["Row"];
export type Successor = Database["public"]["Tables"]["successors"]["Row"];
export type SuccessorType = Database["public"]["Enums"]["successor_type"];
export type KeyPerson = Database["public"]["Tables"]["key_persons"]["Row"];
export type EnterpriseDocument = Database["public"]["Tables"]["enterprise_documents"]["Row"];
export type EnterpriseDocumentType = Database["public"]["Enums"]["enterprise_document_type"];
export type BoardMember = Database["public"]["Tables"]["board_members"]["Row"];

export const PRINCIPAL_ROLES: EnterprisePrincipalRole[] = ["Founder", "Principal"];
export const SUCCESSOR_TYPES: SuccessorType[] = ["Leadership", "Ownership"];
export const ENTERPRISE_DOCUMENT_TYPES: EnterpriseDocumentType[] = [
  "Enterprise Constitution",
  "Buy-Sell Agreement",
];

function useOwned<T>(
  table:
    | "enterprise_principals"
    | "ownership_interests"
    | "successors"
    | "key_persons"
    | "enterprise_documents"
    | "board_members",
  enterpriseId: string | null,
  order: { column: string; ascending: boolean } = { column: "created_at", ascending: true },
) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    if (!enterpriseId) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from(table).select("*")
      .eq("enterprise_id", enterpriseId)
      .order(order.column, { ascending: order.ascending });
    setItems((data ?? []) as T[]);
    setLoading(false);
  }, [enterpriseId, table, order.column, order.ascending]);
  useEffect(() => { refresh(); }, [refresh]);
  return { items, loading, refresh };
}

export function useEnterprises(participantId: string | null) {
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    if (!participantId) { setEnterprises([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("continuity_subjects").select("*")
      .eq("owner_participant_id", participantId)
      .eq("subject_type", "Enterprise")
      .order("created_at", { ascending: true });
    setEnterprises(data ?? []);
    setLoading(false);
  }, [participantId]);
  useEffect(() => { refresh(); }, [refresh]);
  return { enterprises, loading, refresh };
}

export const usePrincipals = (id: string | null) =>
  useOwned<EnterprisePrincipal>("enterprise_principals", id);
export const useOwnershipInterests = (id: string | null) =>
  useOwned<OwnershipInterest>("ownership_interests", id);
export const useSuccessors = (id: string | null) =>
  useOwned<Successor>("successors", id);
export const useKeyPersons = (id: string | null) =>
  useOwned<KeyPerson>("key_persons", id);
export const useEnterpriseDocuments = (id: string | null) =>
  useOwned<EnterpriseDocument>("enterprise_documents", id, { column: "created_at", ascending: false });
export const useBoardMembers = (id: string | null) =>
  useOwned<BoardMember>("board_members", id);