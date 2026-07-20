import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Estate = Database["public"]["Tables"]["continuity_subjects"]["Row"];
export type Will = Database["public"]["Tables"]["wills"]["Row"];
export type Asset = Database["public"]["Tables"]["assets"]["Row"];
export type Liability = Database["public"]["Tables"]["liabilities"]["Row"];
export type Nomination = Database["public"]["Tables"]["nominations"]["Row"];
export type NominationRole = Database["public"]["Enums"]["nomination_role"];
export type AssetTypeName = Database["public"]["Enums"]["asset_type"];

export const NOMINATION_ROLES: NominationRole[] = ["Executor", "Guardian", "Beneficiary"];
export const ASSET_TYPES: AssetTypeName[] = ["Asset", "Digital Asset"];

/**
 * Format a numeric value as Indian-grouped currency with the ₹ glyph.
 * Always render inside a `font-numeral` container (IBM Plex Mono, Book 1 §3.3).
 */
export function formatINR(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "—";
  const formatted = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
  return `₹ ${formatted}`;
}

/** Resolve the signed-in Participant's own Estate (at most one, per DM-0001). */
export function useEstate(participantId: string | null) {
  const [estate, setEstate] = useState<Estate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!participantId) { setEstate(null); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("continuity_subjects")
      .select("*")
      .eq("owner_participant_id", participantId)
      .eq("subject_type", "Estate")
      .maybeSingle();
    if (error) setError(error.message);
    else { setError(null); setEstate(data ?? null); }
    setLoading(false);
  }, [participantId]);

  useEffect(() => { refresh(); }, [refresh]);
  return { estate, loading, error, refresh };
}

export function useWill(estateId: string | null) {
  const [will, setWill] = useState<Will | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!estateId) { setWill(null); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("wills").select("*").eq("estate_id", estateId).maybeSingle();
    setWill(data ?? null);
    setLoading(false);
  }, [estateId]);

  useEffect(() => { refresh(); }, [refresh]);
  return { will, loading, refresh };
}

export function useAssets(estateId: string | null) {
  const [items, setItems] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    if (!estateId) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("assets").select("*").eq("estate_id", estateId)
      .order("created_at", { ascending: false });
    setItems(data ?? []);
    setLoading(false);
  }, [estateId]);
  useEffect(() => { refresh(); }, [refresh]);
  return { items, loading, refresh };
}

export function useLiabilities(estateId: string | null) {
  const [items, setItems] = useState<Liability[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    if (!estateId) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("liabilities").select("*").eq("estate_id", estateId)
      .order("created_at", { ascending: false });
    setItems(data ?? []);
    setLoading(false);
  }, [estateId]);
  useEffect(() => { refresh(); }, [refresh]);
  return { items, loading, refresh };
}

export function useNominations(estateId: string | null) {
  const [items, setItems] = useState<Nomination[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    if (!estateId) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("nominations").select("*").eq("estate_id", estateId)
      .order("created_at", { ascending: false });
    setItems(data ?? []);
    setLoading(false);
  }, [estateId]);
  useEffect(() => { refresh(); }, [refresh]);
  return { items, loading, refresh };
}

/**
 * DM-0001 §7 Domain Lifecycle. Planning/Documentation/Validation are the
 * stages Sprint 3 can honestly reach. Everything after Validation requires a
 * death/incapacity trigger this build has no way to fire — render greyed.
 */
export const LIFECYCLE_STAGES = [
  "Planning",
  "Documentation",
  "Validation",
  "Activation",
  "Stewardship",
  "Succession",
  "Continuity",
] as const;
export type LifecycleStage = (typeof LIFECYCLE_STAGES)[number];
export const REACHABLE_STAGES: LifecycleStage[] = ["Planning", "Documentation", "Validation"];

export function computeCurrentStage(input: {
  hasAny: boolean;
  willExecuted: boolean;
}): LifecycleStage {
  if (input.willExecuted) return "Validation";
  if (input.hasAny) return "Documentation";
  return "Planning";
}