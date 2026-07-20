import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Trust = Database["public"]["Tables"]["continuity_subjects"]["Row"];
export type Settlor = Database["public"]["Tables"]["settlors"]["Row"];
export type Trustee = Database["public"]["Tables"]["trustees"]["Row"];
export type TrusteeRole = Database["public"]["Enums"]["trustee_role"];
export type Protector = Database["public"]["Tables"]["protectors"]["Row"];
export type Beneficiary = Database["public"]["Tables"]["beneficiaries"]["Row"];
export type BeneficiaryType = Database["public"]["Enums"]["beneficiary_type"];
export type TrustProperty = Database["public"]["Tables"]["trust_property"]["Row"];
export type TrustInstrument = Database["public"]["Tables"]["trust_instruments"]["Row"];

export const TRUSTEE_ROLES: TrusteeRole[] = ["Trustee", "Successor Trustee"];
export const BENEFICIARY_TYPES: BeneficiaryType[] = ["Named", "Class"];

type TrustTable =
  | "settlors"
  | "trustees"
  | "protectors"
  | "beneficiaries"
  | "trust_property"
  | "trust_instruments";

function useOwned<T>(
  table: TrustTable,
  trustId: string | null,
  order: { column: string; ascending: boolean } = { column: "created_at", ascending: true },
) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    if (!trustId) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from(table).select("*")
      .eq("trust_id", trustId)
      .order(order.column, { ascending: order.ascending });
    setItems((data ?? []) as T[]);
    setLoading(false);
  }, [trustId, table, order.column, order.ascending]);
  useEffect(() => { refresh(); }, [refresh]);
  return { items, loading, refresh };
}

export function useTrusts(participantId: string | null) {
  const [trusts, setTrusts] = useState<Trust[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    if (!participantId) { setTrusts([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("continuity_subjects").select("*")
      .eq("owner_participant_id", participantId)
      .eq("subject_type", "Trust")
      .order("created_at", { ascending: true });
    setTrusts(data ?? []);
    setLoading(false);
  }, [participantId]);
  useEffect(() => { refresh(); }, [refresh]);
  return { trusts, loading, refresh };
}

export const useSettlors = (id: string | null) => useOwned<Settlor>("settlors", id);
export const useTrustees = (id: string | null) => useOwned<Trustee>("trustees", id);
export const useProtectors = (id: string | null) => useOwned<Protector>("protectors", id);
export const useBeneficiaries = (id: string | null) => useOwned<Beneficiary>("beneficiaries", id);
export const useTrustProperty = (id: string | null) => useOwned<TrustProperty>("trust_property", id);
export const useTrustInstruments = (id: string | null) =>
  useOwned<TrustInstrument>("trust_instruments", id, { column: "created_at", ascending: false });