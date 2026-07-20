import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type SubjectType = Database["public"]["Enums"]["subject_type"];
export type ContinuitySubject = Database["public"]["Tables"]["continuity_subjects"]["Row"];

export const SUBJECT_TYPES: SubjectType[] = [
  "Estate",
  "Family",
  "Enterprise",
  "Trust",
  "Digital Legacy",
];

/**
 * Reads every Continuity Subject the signed-in Participant owns. RLS enforces
 * ownership server-side — this hook does not add its own filter.
 */
export function useContinuitySubjects() {
  const [subjects, setSubjects] = useState<ContinuitySubject[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("continuity_subjects")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      setError(error.message);
      setSubjects([]);
    } else {
      setError(null);
      setSubjects(data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { subjects, loading, error, refresh };
}

export function countByType(subjects: ContinuitySubject[]): Record<SubjectType, number> {
  const out: Record<SubjectType, number> = {
    Estate: 0, Family: 0, Enterprise: 0, Trust: 0, "Digital Legacy": 0,
  };
  for (const s of subjects) out[s.subject_type] += 1;
  return out;
}