/**
 * State-label humanization.
 *
 * The doctrine keeps its formal state names (used in computeState comparisons,
 * seeded data, and any advisor-facing exports). Human wording is a display
 * concern only: we translate the state at render time, and pair it with a
 * quiet one-line hint families can read out loud.
 */

export type StateBucket = {
  label: string;
  hint: string;
  /** Formal doctrine name kept for tooltips / advisor context. */
  formal: string;
};

const MAP: Record<string, StateBucket> = {
  // Institutional Coordination
  Fragmented: { label: "Attention needed", hint: "Two or more things are open across domains.", formal: "Fragmented" },
  Flagged: { label: "One thing to look at", hint: "A single open flag across your subjects.", formal: "Flagged" },
  Coherent: { label: "In good order", hint: "Reviewed and holding together.", formal: "Coherent" },
  Monitoring: { label: "Being watched", hint: "Nothing is open — no formal review recorded yet.", formal: "Monitoring" },

  // Philanthropy
  Contested: { label: "In dispute", hint: "An escalated concern is open on this dedication.", formal: "Contested" },
  Drifting: { label: "Needs attention", hint: "Concerns are open that may drift from the stated purpose.", formal: "Drifting" },
  Faithful: { label: "On purpose", hint: "Reviewed and running as dedicated.", formal: "Faithful" },
  Administering: { label: "Being run", hint: "Active — no formal review recorded yet.", formal: "Administering" },

  // Digital Legacy
  Transitioning: { label: "In handover", hint: "A transition trigger has been recorded.", formal: "Transitioning" },
  Compromised: { label: "Needs attention", hint: "One or more concerns are open on this account.", formal: "Compromised" },
  Active: { label: "In use", hint: "Currently in active use.", formal: "Active" },

  // Institutional Memory
  "Curated Memory": { label: "Locked in", hint: "Curated and permanent — the text will not change.", formal: "Curated Memory" },
  "Emerging Memory": { label: "Just recorded", hint: "Captured but not yet curated. Still editable.", formal: "Emerging Memory" },

  // Institutional Preparedness
  "Confirmed Preparedness": { label: "In place", hint: "Reviewed and currently adequate.", formal: "Confirmed Preparedness" },
  "Partial Preparedness": { label: "Partly in place", hint: "Some elements confirmed, others still to be filled.", formal: "Partial Preparedness" },
  "Gap Identified": { label: "Missing piece", hint: "A full gap has been flagged on this record.", formal: "Gap Identified" },
  "Invalidated Preparedness": { label: "No longer adequate", hint: "A currency review found this no longer holds. Update, don't panic.", formal: "Invalidated Preparedness" },
  "Emerging Preparedness": { label: "Just recorded", hint: "Captured but not yet confirmed by review.", formal: "Emerging Preparedness" },
};

export function humanizeState(state: string): StateBucket {
  return MAP[state] ?? { label: state, hint: "", formal: state };
}

/** Convenience for badge title/tooltip attributes. */
export function stateTitle(state: string): string {
  const b = humanizeState(state);
  return b.hint ? `${b.formal} — ${b.hint}` : b.formal;
}