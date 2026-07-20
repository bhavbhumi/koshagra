import { createFileRoute } from "@tanstack/react-router";
import { InstitutionalPreparednessPage } from "@/components/institutional-preparedness/InstitutionalPreparednessPage";
export const Route = createFileRoute("/_authenticated/institutional-preparedness")({
  component: InstitutionalPreparednessPage,
});