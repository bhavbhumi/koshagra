import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";

export const Route = createFileRoute("/style-guide")({
  head: () => ({
    meta: [
      { title: "Style Guide — Koshagra" },
      { name: "description", content: "Internal token reference for Koshagra." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StyleGuide,
});

/* --------------------------------- data --------------------------------- */

const brand = [
  { name: "kosha-navy", hex: "#0A1628", note: "Strokes, display, dark surfaces (60%)" },
  { name: "bindu-gold", hex: "#C9982A", note: "Positive figures, key accents (≤5%)" },
  { name: "vault-ivory", hex: "#F7F5F0", note: "Primary light background (30%)" },
  { name: "slate-grey", hex: "#5B6472", note: "Secondary text, attention states" },
  { name: "pure-white", hex: "#FFFFFF", note: "Cards, data surfaces on ivory" },
];

const semantic = [
  ["surface.primary", "#F7F5F0"],
  ["surface.raised", "#FFFFFF"],
  ["surface.inverse", "#0A1628"],
  ["text.primary", "#0A1628"],
  ["text.secondary", "#5B6472"],
  ["text.inverse", "#F7F5F0"],
  ["state.positive", "#C9982A"],
  ["state.attention", "#5B6472"],
  ["state.disabled", "rgba(91,100,114,0.4)"],
  ["border.default", "rgba(91,100,114,0.2)"],
  ["border.focus", "#C9982A"],
] as const;

const viz = [
  { name: "viz-indigo", hex: "#3E5C8A" },
  { name: "viz-teal", hex: "#2F6E6E" },
  { name: "viz-terracotta", hex: "#A85D3B" },
  { name: "viz-plum", hex: "#6B4870" },
  { name: "viz-moss", hex: "#5C7A52" },
  { name: "viz-steel", hex: "#5B7290" },
];

const typeScale = [
  { label: "H1 · Montserrat 600", cls: "font-display text-[40px] leading-[48px]", sample: "Continuity, precisely held." },
  { label: "H2 · Montserrat 600", cls: "font-display text-[28px] leading-[36px]", sample: "Institutions endure across generations." },
  { label: "H3 · Montserrat 600", cls: "font-display text-[20px] leading-[28px]", sample: "Registry · Governance · Estate" },
  { label: "Body · Source Sans 3 400", cls: "font-body text-[16px] leading-[26px]", sample: "Body copy reads at 16/26. Regular weight for prose; SemiBold when a phrase must carry structural weight." },
  { label: "Caption · Source Sans 3 400 · slate-grey", cls: "font-body text-[13px] leading-[20px] text-slate-grey", sample: "Metadata, timestamps, and secondary annotations." },
  { label: "Hero figure · IBM Plex Mono 500", cls: "numeral text-[56px] leading-none", sample: "₹ 12,48,73,056.40" },
  { label: "Table figure · IBM Plex Mono 500", cls: "numeral text-[16px] leading-[24px]", sample: "₹ 1,24,873.00" },
];

const spacing = [
  ["xs", 4],
  ["sm", 8],
  ["md", 16],
  ["lg", 24],
  ["xl", 32],
  ["2xl", 48],
  ["3xl", 64],
] as const;

const radii = [
  { name: "sm · 4px", cls: "rounded-[4px]", note: "Legal / audit / tables" },
  { name: "md · 8px", cls: "rounded-[8px]", note: "Default — cards, forms" },
  { name: "lg · 16px", cls: "rounded-[16px]", note: "Conversational / AI surfaces" },
  { name: "full", cls: "rounded-full", note: "Avatars, pills, status dots" },
];

const shadows = [
  { name: "Elevation 0", cls: "shadow-none" },
  { name: "Elevation 1", cls: "shadow-[var(--shadow-1)]" },
  { name: "Elevation 2", cls: "shadow-[var(--shadow-2)]" },
  { name: "Elevation 3", cls: "shadow-[var(--shadow-3)]" },
];

/* --------------------------------- view --------------------------------- */

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="mt-2xl first:mt-0">
      <div className="flex items-baseline justify-between border-b border-[color:var(--color-border-default)] pb-md">
        <h2 className="text-[20px] leading-[28px]">{title}</h2>
        {note ? <span className="text-xs text-slate-grey">{note}</span> : null}
      </div>
      <div className="mt-lg">{children}</div>
    </section>
  );
}

function Swatch({ hex, name, note, dark }: { hex: string; name: string; note?: string; dark?: boolean }) {
  return (
    <div className="rounded-md bg-pure-white p-md ring-1 ring-[color:var(--color-border-default)]">
      <div
        className={`h-20 w-full rounded-sm ring-1 ${dark ? "ring-white/10" : "ring-black/5"}`}
        style={{ background: hex }}
      />
      <div className="mt-md text-sm font-semibold text-kosha-navy">{name}</div>
      <div className="numeral mt-xs text-xs text-slate-grey">{hex}</div>
      {note ? <div className="mt-xs text-xs text-slate-grey">{note}</div> : null}
    </div>
  );
}

function StyleGuide() {
  return (
    <div className="max-w-[72rem]">
      <header>
        <p className="text-xs uppercase tracking-widest text-slate-grey">Internal reference</p>
        <h1 className="mt-md text-[40px] leading-[48px]">Style Guide</h1>
        <p className="mt-md max-w-prose text-slate-grey">
          Book 1 §14 Master Token Table, rendered live. If a value here doesn't
          match the Book, the token is wrong — not the Book.
        </p>
      </header>

      <Section title="Brand palette" note="5 hues · fixed composition">
        <div className="grid gap-md sm:grid-cols-2 lg:grid-cols-5">
          {brand.map((c) => <Swatch key={c.name} {...c} dark={c.name === "kosha-navy"} />)}
        </div>
      </Section>

      <Section title="Semantic tokens" note="Derived — introduces no new hue">
        <div className="overflow-hidden rounded-md bg-pure-white ring-1 ring-[color:var(--color-border-default)]">
          <table className="w-full text-sm">
            <thead className="bg-vault-ivory text-left text-xs uppercase tracking-widest text-slate-grey">
              <tr>
                <th className="px-md py-sm">Token</th>
                <th className="px-md py-sm">Value</th>
                <th className="px-md py-sm">Sample</th>
              </tr>
            </thead>
            <tbody>
              {semantic.map(([name, val]) => (
                <tr key={name} className="border-t border-[color:var(--color-border-default)]">
                  <td className="px-md py-sm font-semibold text-kosha-navy">{name}</td>
                  <td className="numeral px-md py-sm text-slate-grey">{val}</td>
                  <td className="px-md py-sm">
                    <span
                      className="inline-block h-6 w-16 rounded-sm ring-1 ring-black/5"
                      style={{ background: val }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-md text-xs text-slate-grey">
          By design, there is no error-red token. Negative / overdue states use
          slate-grey with a calm verb ("Needs attention").
        </p>
      </Section>

      <Section title="Data visualization palette" note="Charts only · fixed order for &lt;6 categories">
        <div className="grid gap-md sm:grid-cols-3 lg:grid-cols-6">
          {viz.map((c) => <Swatch key={c.name} {...c} />)}
        </div>
      </Section>

      <Section title="Typography">
        <div className="space-y-lg">
          {typeScale.map((t) => (
            <div key={t.label} className="rounded-md bg-pure-white p-lg ring-1 ring-[color:var(--color-border-default)]">
              <div className="text-xs uppercase tracking-widest text-slate-grey">{t.label}</div>
              <div className={`mt-sm ${t.cls}`}>{t.sample}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Spacing scale" note="8px base · nested, never skipped">
        <div className="space-y-sm rounded-md bg-pure-white p-lg ring-1 ring-[color:var(--color-border-default)]">
          {spacing.map(([name, px]) => (
            <div key={name} className="flex items-center gap-md">
              <div className="w-16 text-xs uppercase tracking-widest text-slate-grey">{name}</div>
              <div className="numeral w-16 text-xs text-slate-grey">{px}px</div>
              <div className="h-3 rounded-sm bg-kosha-navy" style={{ width: `${px * 4}px` }} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Radius">
        <div className="grid gap-md sm:grid-cols-2 lg:grid-cols-4">
          {radii.map((r) => (
            <div key={r.name} className="rounded-md bg-pure-white p-lg ring-1 ring-[color:var(--color-border-default)]">
              <div className={`h-20 w-full bg-kosha-navy ${r.cls}`} />
              <div className="mt-md text-sm font-semibold text-kosha-navy">{r.name}</div>
              <div className="mt-xs text-xs text-slate-grey">{r.note}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Elevation" note="kosha-navy tinted · never generic black">
        <div className="grid gap-lg sm:grid-cols-2 lg:grid-cols-4">
          {shadows.map((s) => (
            <div key={s.name} className={`rounded-md bg-pure-white p-lg ${s.cls}`}>
              <div className="text-sm font-semibold text-kosha-navy">{s.name}</div>
              <div className="mt-sm text-xs text-slate-grey">Sample surface</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Focus ring" note="2px bindu-gold · 2px offset · exempt from 5% cap">
        <div className="flex flex-wrap gap-md rounded-md bg-pure-white p-lg ring-1 ring-[color:var(--color-border-default)]">
          <button className="rounded-md bg-kosha-navy px-lg py-sm text-sm font-semibold text-vault-ivory">
            Focusable button
          </button>
          <a href="#" className="rounded-md px-lg py-sm text-sm font-semibold text-kosha-navy underline decoration-bindu-gold decoration-2 underline-offset-4">
            Focusable link
          </a>
          <input
            type="text"
            placeholder="Focusable field"
            className="rounded-md border border-[color:var(--color-border-default)] bg-vault-ivory px-md py-sm text-sm text-kosha-navy placeholder:text-slate-grey"
          />
        </div>
        <p className="mt-sm text-xs text-slate-grey">Tab through the controls above to see the ring.</p>
      </Section>

      <Section title="Currency &amp; numerals" note="Always ₹ · Indian numbering · IBM Plex Mono 500">
        <div className="grid gap-md sm:grid-cols-3">
          {[
            "₹ 12,48,73,056.40",
            "₹ 4,50,000.00",
            "₹ 78.25",
          ].map((n) => (
            <div key={n} className="rounded-md bg-pure-white p-lg ring-1 ring-[color:var(--color-border-default)]">
              <div className="numeral text-2xl text-kosha-navy">{n}</div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}