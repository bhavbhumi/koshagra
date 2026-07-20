import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ParticipantSummary } from "./workspaces";

/**
 * Read the signed-in Participant record. Returns null while loading or when
 * no session exists. Intentionally minimal — Sprint 1 has no full identity model.
 */
export function useParticipant(): { participant: ParticipantSummary | null; loading: boolean } {
  const [participant, setParticipant] = useState<ParticipantSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes.user;
      if (!user) {
        if (!cancelled) { setParticipant(null); setLoading(false); }
        return;
      }
      const { data } = await supabase
        .from("participants")
        .select("id, display_name, email, participant_type, capacity_name")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      setParticipant(
        data ?? {
          id: user.id,
          display_name: user.email?.split("@")[0] ?? "Participant",
          email: user.email ?? "",
          participant_type: "Individual",
          capacity_name: "Principal",
        },
      );
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  return { participant, loading };
}