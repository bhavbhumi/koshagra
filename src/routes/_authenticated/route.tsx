import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PrimaryNav } from "@/components/shell/PrimaryNav";
import { WorkspaceHeader } from "@/components/shell/WorkspaceHeader";
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
    <div className="flex min-h-dvh bg-vault-ivory text-kosha-navy">
      <PrimaryNav
        participant={participant}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar: hamburger + compact lockup. Hidden on md+. */}
        <div className="flex md:hidden items-center justify-between border-b border-[color:var(--color-border-default)] bg-pure-white px-md h-14">
          <button
            type="button"
            aria-label="Open navigation"
            aria-expanded={mobileNavOpen}
            onClick={() => setMobileNavOpen(true)}
            className="rounded-md p-2 text-kosha-navy hover:bg-vault-ivory"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>
          <img src="/brand/lockup-horizontal-primary.svg" alt="Koshagra" className="h-6 w-auto" />
          <span className="w-9" aria-hidden />
        </div>
        <WorkspaceHeader participant={participant} />
        <main className="flex-1 px-md py-lg sm:px-xl sm:py-xl md:px-3xl md:py-3xl">
          <Outlet />
        </main>
      </div>
    </div>
  );
}