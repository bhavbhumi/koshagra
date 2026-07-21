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

export type WorkspaceKind = "start" | "dashboard" | "domain" | "shared" | "admin";

export type Workspace = {
  slug: string;
  path: string;
  name: string;
  purpose: string;
  intro?: string[];
  kind: WorkspaceKind;
};

export const WORKSPACES: Workspace[] = [
  {
    slug: "institution-registry",
    path: "/institution-registry",
    name: "Institution Registry",
    purpose:
      "Every Continuity Subject you steward — Estate, Family, Enterprise, Trust, or Digital Legacy — in one place. Start here.",
    intro: [
      "The Registry is the list of what you're looking after — family, estate, business, trust, or a digital footprint.",
      "Add a new subject here, search across everything, or pick one to open its workspace.",
      "The Registry doesn't hold any decisions itself; each subject has its own workspace where the work happens.",
    ],
    kind: "start",
  },
  {
    slug: "dashboard",
    path: "/dashboard",
    name: "Dashboard",
    purpose: "Read-only aggregation surface across every workspace.",
    intro: [
      "This is your calm view over everything you're looking after.",
      "Start with the Registry to add a family, an estate, a business, a trust, or a digital footprint. Once things are added, this page shows you what's steady and what needs your attention.",
      "Nothing here changes anything on its own — Koshagra records; people decide.",
    ],
    kind: "dashboard",
  },
  {
    slug: "estate-planning",
    path: "/estate-planning",
    name: "Estate Planning",
    purpose:
      "Preserves Legacy: the continuity of intent beyond the lifetime or capacity of its originator.",
    intro: [
      "Estate Planning is where you record what a person owns, what they owe, and who is meant to receive what.",
      "Add assets, liabilities, and nominations. Koshagra keeps them together so nothing important is forgotten.",
      "This is a record, not a will. It doesn't replace legal documents — it makes sure they're findable and consistent.",
    ],
    kind: "domain",
  },
  {
    slug: "family-governance",
    path: "/family-governance",
    name: "Family Governance",
    purpose:
      "Helps a Family govern belonging, relationships, and collective decisions, so stewardship endures across generations.",
    intro: [
      "Family Governance is where the family writes down how it makes decisions together.",
      "Keep the member list current, record the rulebook you agree to follow, and note who sits on which council.",
      "Changing the active rulebook needs a second person's approval — one person cannot activate a version alone.",
    ],
    kind: "domain",
  },
  {
    slug: "business-succession",
    path: "/business-succession",
    name: "Business Succession",
    purpose:
      "Preserves Enterprise Viability through legitimate stewardship, prepared leadership, and responsible ownership.",
    intro: [
      "Business Succession is where you record who owns what share of the business, who steps in next, and who serves on the board.",
      "Keep ownership interests, named successors, and board roles up to date here.",
      "This is a record for the family; company registers and shareholder agreements stay with the company.",
    ],
    kind: "domain",
  },
  {
    slug: "trust-administration",
    path: "/trust-administration",
    name: "Trust Administration",
    purpose: "Preserves Entrustment through disciplined Fiduciary Stewardship.",
    intro: [
      "Trust Administration is where a trust's people, property, and beneficiaries are recorded together.",
      "Log settlors, trustees, the property held under trust, and who benefits.",
      "This is the family's living record of the trust — the deed and legal filings remain the source of authority.",
    ],
    kind: "domain",
  },
  {
    slug: "institutional-coordination",
    path: "/institutional-coordination",
    name: "Institutional Coordination",
    purpose:
      "Preserves Coherence across every other domain's own account of the same family.",
    intro: [
      "Institutional Coordination is a calm read across everything you're looking after — nothing here changes any single domain.",
      "Record the advisors you work with, note anything that spans two or more domains, and hold periodic reviews.",
      "Fixes still happen in each domain's workspace; this page only records what was noticed and reviewed.",
    ],
    kind: "domain",
  },
  {
    slug: "philanthropy",
    path: "/philanthropy",
    name: "Philanthropy",
    purpose:
      "Preserves Dedication: resources committed to a purpose continue to be applied faithfully to it.",
    intro: [
      "Philanthropy is where charitable commitments — the money set aside and the purpose it serves — are recorded and looked after.",
      "Record donors, grantees, disbursements, and any concerns; run periodic reviews to confirm the commitment is still on purpose.",
      "The stated purpose of a dedication is fixed. It never changes here, even when the vehicle around it does.",
    ],
    kind: "domain",
  },
  {
    slug: "digital-legacy",
    path: "/digital-legacy",
    name: "Digital Legacy",
    purpose:
      "Preserves Representation: what stood for a person continues to stand for them, or falls respectfully silent.",
    intro: [
      "Digital Legacy is where online accounts, digital identities, and cryptographic keys are recorded so nothing is lost or orphaned.",
      "Add each account or key, name the person who can act on it, and log periodic checks that it's still fine.",
      "AI agents and assistants are recorded here as belongings; they never act on the family's behalf.",
    ],
    kind: "domain",
  },
  {
    slug: "institutional-memory",
    path: "/institutional-memory",
    name: "Institutional Memory",
    purpose:
      "Preserves Memory: an institution's own remembered rationale, available to whoever stewards it next.",
    intro: [
      "Institutional Memory holds short notes explaining why past decisions were made — the reasoning, not the decision itself.",
      "Recognize a decision, curate the reasoning, and future family members can retrieve it when they need context.",
      "Once a note is curated it is permanent — the text is preserved exactly. Memory is not the same as understanding.",
    ],
    kind: "domain",
  },
  {
    slug: "institutional-preparedness",
    path: "/institutional-preparedness",
    name: "Institutional Preparedness",
    purpose:
      "Preserves readiness, so disruption is met from readiness already confirmed.",
    intro: [
      "Institutional Preparedness records, in plain terms, what happens if a specific disruption occurs — who steps in and how.",
      "Write a 'what if…' note for each realistic scenario, review it periodically, and log gaps as they appear.",
      "A gap or an out-of-date note is normal, not alarming — currency matters more than looking complete.",
    ],
    kind: "domain",
  },
  {
    slug: "review",
    path: "/review",
    name: "Review",
    purpose:
      "Every Access Grant awaiting your decision, and the status of what you've requested.",
    kind: "shared",
  },
  {
    slug: "notifications",
    path: "/notifications",
    name: "Notification Center",
    purpose: "One consolidated inbox for every actionable signal.",
    kind: "shared",
  },
  {
    slug: "admin",
    path: "/admin",
    name: "Admin",
    purpose: "Administrative controls (visibility arrives with real Access Grants).",
    kind: "admin",
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