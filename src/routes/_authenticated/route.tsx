import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PrimaryNav } from "@/components/shell/PrimaryNav";
import { AppHeader } from "@/components/shell/WorkspaceHeader";
import { useParticipant } from "@/lib/participant";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { userId: data.user.id };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { participant } = useParticipant();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  return (
    <div className="min-h-dvh bg-vault-ivory text-kosha-navy">
      {/* Fixed top header, spans full viewport width */}
      <AppHeader
        participant={participant}
        onOpenMobileNav={() => setMobileNavOpen(true)}
      />
      {/* Fixed left sidebar (desktop) + slide-in drawer (mobile) */}
      <PrimaryNav
        participant={participant}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />
      {/* Main content: offset for fixed header (h-14) and desktop sidebar (w-64) */}
      <div className="flex min-w-0 flex-col pt-14 md:pl-64">
        <main className="flex-1 px-md py-lg sm:px-xl sm:py-xl md:px-3xl md:py-3xl">
          <Outlet />
        </main>
      </div>
    </div>
  );
}