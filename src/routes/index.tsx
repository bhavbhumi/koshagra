import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <section aria-labelledby="foundation-heading" className="max-w-3xl">
      <p className="text-xs uppercase tracking-widest text-slate-grey">
        Sprint 0
      </p>
      <h1
        id="foundation-heading"
        className="mt-md text-[40px] leading-[48px]"
      >
        Foundation.
      </h1>
      <p className="mt-lg max-w-prose text-base leading-[26px] text-slate-grey">
        This build establishes the design system, typography, and application
        shell for Koshagra. Features arrive in later sprints. The token
        reference is available at{" "}
        <a
          href="/style-guide"
          className="text-kosha-navy underline decoration-bindu-gold decoration-2 underline-offset-4 hover:text-kosha-navy/80"
        >
          /style-guide
        </a>
        .
      </p>

      <div className="mt-2xl grid gap-lg sm:grid-cols-3">
        {[
          { label: "Palette", value: "5" },
          { label: "Semantic tokens", value: "11" },
          { label: "Type scale", value: "6" },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-md bg-pure-white p-lg shadow-[var(--shadow-1)] ring-1 ring-[color:var(--color-border-default)]"
          >
            <div className="numeral text-4xl text-kosha-navy">{item.value}</div>
            <div className="mt-xs text-xs uppercase tracking-widest text-slate-grey">
              {item.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
