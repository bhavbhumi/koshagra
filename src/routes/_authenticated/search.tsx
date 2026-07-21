import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * `/search` was a standalone screen that only filtered Continuity Subjects.
 * That capability now lives directly on the Institution Registry. This route
 * is kept only to redirect old links; delete in a later pass.
 */
export const Route = createFileRoute("/_authenticated/search")({
  beforeLoad: () => {
    throw redirect({ to: "/institution-registry", replace: true });
  },
  component: () => null,
});