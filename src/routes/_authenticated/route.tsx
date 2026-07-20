import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
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
  return (
    <div className="flex min-h-dvh bg-vault-ivory text-kosha-navy">
      <PrimaryNav participant={participant} />
      <div className="flex min-w-0 flex-1 flex-col">
        <WorkspaceHeader participant={participant} />
        <main className="flex-1 px-xl py-2xl md:px-3xl md:py-3xl">
          <Outlet />
        </main>
      </div>
    </div>
  );
}