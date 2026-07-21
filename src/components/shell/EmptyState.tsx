import type { ReactNode } from "react";

/**
 * Teaching empty-state card. Used where a list is empty for a real reason —
 * not "loading" and not "you searched and found nothing". The tone stays calm:
 * short title, one sentence of context, one primary action.
 */
export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-md bg-pure-white p-lg ring-1 ring-[color:var(--color-border-default)]">
      <h3 className="font-display text-[18px] leading-[26px] text-kosha-navy">{title}</h3>
      <p className="mt-xs text-sm text-slate-grey">{body}</p>
      {action ? <div className="mt-md">{action}</div> : null}
    </div>
  );
}