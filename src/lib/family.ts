import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Family = Database["public"]["Tables"]["continuity_subjects"]["Row"];
export type FamilyMember = Database["public"]["Tables"]["family_members"]["Row"];
export type FamilyMemberStatus = Database["public"]["Enums"]["family_member_status"];
export type GovernanceDocument = Database["public"]["Tables"]["governance_documents"]["Row"];
export type GovernanceDocumentType = Database["public"]["Enums"]["governance_document_type"];
export type GovernanceDocumentStatus = Database["public"]["Enums"]["governance_document_status"];
export type GovernanceBodyMember = Database["public"]["Tables"]["governance_body_members"]["Row"];
export type GovernanceBody = Database["public"]["Enums"]["governance_body"];

export const GOVERNANCE_DOCUMENT_TYPES: GovernanceDocumentType[] = [
  "Constitution",
  "Family Policy",
  "Code of Conduct",
];
export const GOVERNANCE_BODIES: GovernanceBody[] = ["Council", "Assembly"];

/**
 * Every Family (subject_type = 'Family') owned by the signed-in Participant.
 * A Participant may own more than one — the workspace lets them pick.
 */
export function useFamilies(participantId: string | null) {
  const [families, setFamilies] = useState<Family[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    if (!participantId) { setFamilies([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("continuity_subjects")
      .select("*")
      .eq("owner_participant_id", participantId)
      .eq("subject_type", "Family")
      .order("created_at", { ascending: true });
    setFamilies(data ?? []);
    setLoading(false);
  }, [participantId]);
  useEffect(() => { refresh(); }, [refresh]);
  return { families, loading, refresh };
}

export function useFamilyMembers(familyId: string | null) {
  const [items, setItems] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    if (!familyId) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("family_members").select("*").eq("family_id", familyId)
      .order("created_at", { ascending: true });
    setItems(data ?? []);
    setLoading(false);
  }, [familyId]);
  useEffect(() => { refresh(); }, [refresh]);
  return { items, loading, refresh };
}

export function useGovernanceDocuments(familyId: string | null) {
  const [items, setItems] = useState<GovernanceDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    if (!familyId) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("governance_documents").select("*").eq("family_id", familyId)
      .order("created_at", { ascending: false });
    setItems(data ?? []);
    setLoading(false);
  }, [familyId]);
  useEffect(() => { refresh(); }, [refresh]);
  return { items, loading, refresh };
}

export function useGovernanceBodyMembers(familyId: string | null) {
  const [items, setItems] = useState<GovernanceBodyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    if (!familyId) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("governance_body_members").select("*").eq("family_id", familyId)
      .order("created_at", { ascending: true });
    setItems(data ?? []);
    setLoading(false);
  }, [familyId]);
  useEffect(() => { refresh(); }, [refresh]);
  return { items, loading, refresh };
}