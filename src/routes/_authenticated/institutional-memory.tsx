import { createFileRoute } from "@tanstack/react-router";
import { InstitutionalMemoryPage } from "@/components/institutional-memory/InstitutionalMemoryPage";
export const Route = createFileRoute("/_authenticated/institutional-memory")({
  component: InstitutionalMemoryPage,
});