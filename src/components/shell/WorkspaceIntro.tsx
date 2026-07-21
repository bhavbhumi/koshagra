import { useState } from "react";

/**
 * Central copy for every workspace intro. One collapsible card per domain.
 * Rule: three sentences maximum. First = what this is, second = what you do
 * here, third = what it explicitly is NOT. Plain-English only.
 */
const INTROS: Record<string, { title: string; body: string[] }> = {
  dashboard: {
    title: "What this screen is",
    body: [
      "This is your calm view over everything you're looking after.",
      "Start with the Registry to add a family, an estate, a business, a trust, or a digital footprint. Once things are added, this page shows you what's steady and what needs your attention.",
      "Nothing here changes anything on its own — Koshagra records; people decide.",
    ],
  },
  registry: {
    title: "What this screen is",
    body: [
      "The Registry is the list of what you're looking after — family, estate, business, trust, or a digital footprint.",
      "Add a new subject here, search across everything, or pick one to open its workspace.",
      "The Registry doesn't hold any decisions itself; each subject has its own workspace where the work happens.",
    ],
  },
  estate: {
    title: "What this workspace is",
    body: [
      "Estate Planning is where you record what a person owns, what they owe, and who is meant to receive what.",
      "Add assets, liabilities, and nominations. Koshagra keeps them together so nothing important is forgotten.",
      "This is a record, not a will. It doesn't replace legal documents — it makes sure they're findable and consistent.",
    ],
  },
  family: {
    title: "What this workspace is",
    body: [
      "Family Governance is where the family writes down how it makes decisions together.",
      "Keep the member list current, record the rulebook you agree to follow, and note who sits on which council.",
      "Changing the active rulebook needs a second person's approval — one person cannot activate a version alone.",
    ],
  },
  business: {
    title: "What this workspace is",
    body: [
      "Business Succession is where you record who owns what share of the business, who steps in next, and who serves on the board.",
      "Keep ownership interests, named successors, and board roles up to date here.",
      "This is a record for the family; company registers and shareholder agreements stay with the company.",
    ],
  },
  trust: {
    title: "What this workspace is",
    body: [
      "Trust Administration is where a trust's people, property, and beneficiaries are recorded together.",
      "Log settlors, trustees, the property held under trust, and who benefits.",
      "This is the family's living record of the trust — the deed and legal filings remain the source of authority.",
    ],
  },
  coordination: {
    title: "What this workspace is",
    body: [
      "Institutional Coordination is a calm read across everything you're looking after — nothing here changes any single domain.",
      "Record the advisors you work with, note anything that spans two or more domains, and hold periodic reviews.",
      "Fixes still happen in each domain's workspace; this page only records what was noticed and reviewed.",
    ],
  },
  philanthropy: {
    title: "What this workspace is",
    body: [
      "Philanthropy is where charitable commitments — the money set aside and the purpose it serves — are recorded and looked after.",
      "Record donors, grantees, disbursements, and any concerns; run periodic reviews to confirm the commitment is still on purpose.",
      "The stated purpose of a dedication is fixed. It never changes here, even when the vehicle around it does.",
    ],
  },
  digital: {
    title: "What this workspace is",
    body: [
      "Digital Legacy is where online accounts, digital identities, and cryptographic keys are recorded so nothing is lost or orphaned.",
      "Add each account or key, name the person who can act on it, and log periodic checks that it's still fine.",
      "AI agents and assistants are recorded here as belongings; they never act on the family's behalf.",
    ],
  },
  memory: {
    title: "What this workspace is",
    body: [
      "Institutional Memory holds short notes explaining why past decisions were made — the reasoning, not the decision itself.",
      "Recognize a decision, curate the reasoning, and future family members can retrieve it when they need context.",
      "Once a note is curated it is permanent — the text is preserved exactly. Memory is not the same as understanding.",
    ],
  },
  preparedness: {
    title: "What this workspace is",
    body: [
      "Institutional Preparedness records, in plain terms, what happens if a specific disruption occurs — who steps in and how.",
      "Write a 'what if…' note for each realistic scenario, review it periodically, and log gaps as they appear.",
      "A gap or an out-of-date note is normal, not alarming — currency matters more than looking complete.",
    ],
  },
};

export function WorkspaceIntro({ slug }: { slug: keyof typeof INTROS }) {
  const intro = INTROS[slug];
  const [open, setOpen] = useState(false);
  if (!intro) return null;
  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      className="mb-lg rounded-md bg-pure-white p-md ring-1 ring-[color:var(--color-border-default)]"
    >
      <summary className="cursor-pointer list-none text-xs uppercase tracking-widest text-slate-grey hover:text-kosha-navy">
        {open ? "Hide intro" : intro.title}
      </summary>
      <div className="mt-sm space-y-xs text-sm text-kosha-navy">
        {intro.body.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </details>
  );
}

export type WorkspaceIntroSlug = keyof typeof INTROS;