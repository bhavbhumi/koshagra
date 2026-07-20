import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/**
 * Landing route. Sprint 1 has no marketing surface, so `/` routes the
 * visitor to the workspace when signed in and to /auth otherwise.
 */
export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/dashboard", replace: true });
    throw redirect({ to: "/auth", replace: true });
  },
  component: () => null,
});
