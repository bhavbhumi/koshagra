import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePlaceholder } from "@/components/shell/WorkspacePlaceholder";
export const Route = createFileRoute("/_authenticated/institutional-preparedness")({ component: WorkspacePlaceholder });