/**
 * Single source of truth for workspace destinations and visibility.
 *
 * Every navigation surface (Primary Navigation, Workspace Switcher, Breadcrumb)
 * MUST resolve destinations through `getVisibleWorkspaces(participant)`.
 * Do NOT re-implement visibility per component. Later sprints add real
 * Access-Grant scoping INTO this function; today every Participant sees the
 * same full list because everyone is "Principal" and nothing is scoped yet.
 */

export type ParticipantSummary = {
  id: string;
  display_name: string;
  email: string;
  participant_type: string;
  capacity_name: string;
};

export type WorkspaceKind = "dashboard" | "domain" | "utility";

export type Workspace = {
  slug: string;
  path: string;
  name: string;
  purpose: string;
  kind: WorkspaceKind;
};

export const WORKSPACES: Workspace[] = [
  {
    slug: "dashboard",
    path: "/dashboard",
    name: "Dashboard",
    purpose: "Read-only aggregation surface across every workspace.",
    kind: "dashboard",
  },
  {
    slug: "estate-planning",
    path: "/estate-planning",
    name: "Estate Planning",
    purpose:
      "Preserves Legacy: the continuity of intent beyond the lifetime or capacity of its originator.",
    kind: "domain",
  },
  {
    slug: "family-governance",
    path: "/family-governance",
    name: "Family Governance",
    purpose:
      "Helps a Family govern belonging, relationships, and collective decisions, so stewardship endures across generations.",
    kind: "domain",
  },
  {
    slug: "business-succession",
    path: "/business-succession",
    name: "Business Succession",
    purpose:
      "Preserves Enterprise Viability through legitimate stewardship, prepared leadership, and responsible ownership.",
    kind: "domain",
  },
  {
    slug: "trust-administration",
    path: "/trust-administration",
    name: "Trust Administration",
    purpose: "Preserves Entrustment through disciplined Fiduciary Stewardship.",
    kind: "domain",
  },
  {
    slug: "institutional-coordination",
    path: "/institutional-coordination",
    name: "Institutional Coordination",
    purpose:
      "Preserves Coherence across every other domain's own account of the same family.",
    kind: "domain",
  },
  {
    slug: "philanthropy",
    path: "/philanthropy",
    name: "Philanthropy",
    purpose:
      "Preserves Dedication: resources committed to a purpose continue to be applied faithfully to it.",
    kind: "domain",
  },
  {
    slug: "digital-legacy",
    path: "/digital-legacy",
    name: "Digital Legacy",
    purpose:
      "Preserves Representation: what stood for a person continues to stand for them, or falls respectfully silent.",
    kind: "domain",
  },
  {
    slug: "institutional-memory",
    path: "/institutional-memory",
    name: "Institutional Memory",
    purpose:
      "Preserves Memory: an institution's own remembered rationale, available to whoever stewards it next.",
    kind: "domain",
  },
  {
    slug: "institutional-preparedness",
    path: "/institutional-preparedness",
    name: "Institutional Preparedness",
    purpose:
      "Preserves readiness, so disruption is met from readiness already confirmed.",
    kind: "domain",
  },
  {
    slug: "search",
    path: "/search",
    name: "Search",
    purpose: "Global search across every workspace.",
    kind: "utility",
  },
  {
    slug: "institution-registry",
    path: "/institution-registry",
    name: "Institution Registry",
    purpose:
      "Every Continuity Subject you steward — Estate, Family, Enterprise, Trust, or Digital Legacy — in one place.",
    kind: "utility",
  },
  {
    slug: "review",
    path: "/review",
    name: "Review",
    purpose:
      "Every Access Grant awaiting your decision, and the status of what you've requested.",
    kind: "utility",
  },
  {
    slug: "notifications",
    path: "/notifications",
    name: "Notification Center",
    purpose: "One consolidated inbox for every actionable signal.",
    kind: "utility",
  },
  {
    slug: "admin",
    path: "/admin",
    name: "Admin",
    purpose: "Administrative controls (visibility arrives with real Access Grants).",
    kind: "utility",
  },
];

/**
 * The single choke-point for navigation visibility.
 *
 * Placeholder implementation: today every Participant sees every workspace
 * because everyone is capacity "Principal" and no scoping model exists yet.
 * Later sprints add real Access-Grant filtering HERE, not at call sites.
 */
export function getVisibleWorkspaces(
  _participant: ParticipantSummary | null,
): Workspace[] {
  return WORKSPACES;
}

export function findWorkspaceByPath(pathname: string): Workspace | undefined {
  return WORKSPACES.find((w) => pathname === w.path || pathname.startsWith(w.path + "/"));
}