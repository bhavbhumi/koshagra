import type { ReactNode } from "react";

/**
 * Central glossary for Koshagra. The UI defaults to plain-language wording;
 * the formal doctrine term is preserved as a tooltip so a family lawyer,
 * trustee, or auditor can still see the exact vocabulary the model uses.
 *
 * Rule of thumb: primary label = what a layman would say out loud.
 *                formal        = the DM term of art (kept, never lost).
 *                hint          = one sentence, no jargon.
 */
export type GlossaryEntry = {
  /** Plain-language label shown in the UI. */
  plain: string;
  /** Formal doctrine name (kept for the tooltip and for advisors). */
  formal: string;
  /** One-line, plain-English explanation. No doctrine references. */
  hint: string;
};

export const GLOSSARY = {
  // Maker-Checker mechanism
  maker: {
    plain: "the person who asked",
    formal: "Maker",
    hint: "The person who requested this change. They can't approve their own request.",
  },
  checker: {
    plain: "the person who decides",
    formal: "Checker",
    hint: "Someone else — the person authorised to approve or decline this request.",
  },
  accessGrant: {
    plain: "request for approval",
    formal: "Access Grant",
    hint: "A change one person proposes and a second person approves before it takes effect.",
  },
  requestedTransition: {
    plain: "what will change",
    formal: "Requested Transition",
    hint: "The specific change being asked for — for example, making a document active or winding up a charity.",
  },

  // Subject types (what a request is about)
  governance_document: {
    plain: "Family rulebook",
    formal: "Governance Document",
    hint: "A document the family has agreed to follow — a charter, a policy, a set of rules.",
  },
  representation: {
    plain: "Digital account or key",
    formal: "Representation",
    hint: "An online account, digital identity, or cryptographic key that stands in for a person online.",
  },
  institutional_memory_record: {
    plain: "Recorded reason for a past decision",
    formal: "Institutional Memory Record",
    hint: "A short note that captures why a past decision was made, so the family doesn't forget the reasoning.",
  },
  preparedness_record: {
    plain: "'What if…' plan",
    formal: "Preparedness Record",
    hint: "A note confirming the family is prepared for a specific disruption — who steps in, and how.",
  },
  dedication: {
    plain: "Charitable commitment",
    formal: "Dedication",
    hint: "Money or assets set aside for a charitable purpose. The purpose itself cannot be changed later.",
  },

  // Transitions
  activate: {
    plain: "Make this the version everyone follows",
    formal: "Activate",
    hint: "Approve this document as the one the family will follow from now on. The previous version stays on file.",
  },
  retire_memory: {
    plain: "Take out of active use",
    formal: "Retire",
    hint: "Stop showing this note in active views. The original text is kept exactly as written — nothing is deleted.",
  },
  retire_preparedness: {
    plain: "No longer maintained",
    formal: "Retire",
    hint: "Mark this plan as no longer maintained. The history remains on file.",
  },
  conclude: {
    plain: "Wind up",
    formal: "Conclude",
    hint: "Record that this charitable vehicle is being wound up. The stated purpose is preserved on file.",
  },
  decide_disposition: {
    plain: "Decide what happens to it",
    formal: "Decide Disposition",
    hint: "Now that the person is no longer available, decide whether this account is memorialised or retired.",
  },
} as const;

export type GlossaryKey = keyof typeof GLOSSARY;

/**
 * Renders the plain-language label with a native tooltip revealing the
 * formal doctrine name and a one-line explanation. Dotted underline is
 * a subtle affordance ("there's more here if you hover").
 */
export function Term({
  termKey,
  children,
  className = "",
}: {
  termKey: GlossaryKey;
  children?: ReactNode;
  className?: string;
}) {
  const entry = GLOSSARY[termKey];
  const label = children ?? entry.plain;
  return (
    <span
      title={`${entry.formal} — ${entry.hint}`}
      className={`underline decoration-dotted decoration-slate-grey/60 underline-offset-4 cursor-help ${className}`}
    >
      {label}
    </span>
  );
}

/** Plain label lookup helpers used where JSX isn't convenient. */
export function plainSubjectType(t: string): string {
  const key = t as GlossaryKey;
  return (GLOSSARY[key]?.plain) ?? t;
}

export function plainTransition(
  transition: string,
  subjectType?: string,
): string {
  if (transition === "Activate") return GLOSSARY.activate.plain;
  if (transition === "Conclude") return GLOSSARY.conclude.plain;
  if (transition === "Decide Disposition") return GLOSSARY.decide_disposition.plain;
  if (transition === "Retire") {
    return subjectType === "preparedness_record"
      ? GLOSSARY.retire_preparedness.plain
      : GLOSSARY.retire_memory.plain;
  }
  return transition;
}

export function formalHintFor(transition: string, subjectType?: string): { formal: string; hint: string } {
  if (transition === "Activate") return { formal: GLOSSARY.activate.formal, hint: GLOSSARY.activate.hint };
  if (transition === "Conclude") return { formal: GLOSSARY.conclude.formal, hint: GLOSSARY.conclude.hint };
  if (transition === "Decide Disposition") return { formal: GLOSSARY.decide_disposition.formal, hint: GLOSSARY.decide_disposition.hint };
  if (transition === "Retire") {
    return subjectType === "preparedness_record"
      ? { formal: GLOSSARY.retire_preparedness.formal, hint: GLOSSARY.retire_preparedness.hint }
      : { formal: GLOSSARY.retire_memory.formal, hint: GLOSSARY.retire_memory.hint };
  }
  return { formal: transition, hint: "" };
}