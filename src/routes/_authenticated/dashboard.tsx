import { createFileRoute, Link } from "@tanstack/react-router";
import { SUBJECT_TYPES, countByType, useContinuitySubjects } from "@/lib/continuity-subjects";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: DashboardPage });

function DashboardPage() {
  const { subjects, loading } = useContinuitySubjects();

  if (loading) {
    return (
      <section aria-busy="true" className="max-w-[64rem]">
        <div className="inline-flex items-center gap-sm text-sm text-slate-grey">
          <span className="h-2 w-2 rounded-full bg-slate-grey animate-pulse" aria-hidden />
          Loading your registry…
        </div>
      </section>
    );
  }

  const list = subjects ?? [];
  const total = list.length;

  if (total === 0) {
    return (
      <section className="max-w-[42rem]">
        <StatCard label="Continuity Subjects" value={0} />
        <div className="mt-lg rounded-md border border-[color:var(--color-border-default)] bg-pure-white p-lg">
          <h2 className="font-display text-[20px] leading-[28px] text-kosha-navy">Begin your registry</h2>
          <p className="mt-xs text-sm text-slate-grey">
            You don't steward any Continuity Subjects yet. Every action originates in a workspace —
            create your first Estate, Family, Enterprise, Trust, or Digital Legacy in the Institution Registry.
          </p>
          <Link
            to="/institution-registry"
            className="mt-md inline-flex items-center rounded-md bg-kosha-navy px-md py-2 text-sm font-semibold text-vault-ivory hover:bg-kosha-navy/90"
          >
            Open Institution Registry
          </Link>
        </div>
      </section>
    );
  }

  const counts = countByType(list);

  return (
    <section className="max-w-[64rem]">
      <div className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Continuity Subjects" value={total} />
        {SUBJECT_TYPES.map((t) => (
          <StatCard key={t} label={t} value={counts[t]} />
        ))}
      </div>
      <p className="mt-lg text-xs text-slate-grey">
        Dashboards never originate a write. To add or edit a Continuity Subject, open{" "}
        <Link to="/institution-registry" className="underline hover:text-kosha-navy">
          Institution Registry
        </Link>
        .
      </p>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-pure-white p-lg shadow-[var(--shadow-1)] ring-1 ring-[color:var(--color-border-default)]">
      <div className="text-xs uppercase tracking-widest text-slate-grey">{label}</div>
      <div className="mt-sm font-numeral text-[40px] leading-[48px] text-kosha-navy">{value}</div>
    </div>
  );
}