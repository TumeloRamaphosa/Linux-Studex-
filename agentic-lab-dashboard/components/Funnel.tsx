import type { Lead, Stage } from "@/lib/types";
import { STAGES } from "@/lib/types";

const label = (s: Stage) => s.replace(/_/g, " ");

export default function Funnel({ leads }: { leads: Lead[] }) {
  const counts = STAGES.map((s) => ({ s, n: leads.filter((l) => l.stage === s).length }));
  const max = Math.max(1, ...counts.map((c) => c.n));
  return (
    <section className="rounded-xl border border-line bg-card p-4">
      <h2 className="mb-3 text-sm font-semibold text-goldlight">Pipeline</h2>
      <ul className="space-y-2">
        {counts.map(({ s, n }) => (
          <li key={s} className="flex items-center gap-3 text-xs">
            <span className="w-28 shrink-0 text-muted">{label(s)}</span>
            <div className="h-3 flex-1 rounded bg-card2">
              <div
                className={`h-3 rounded ${s === "CLOSED_LOST" ? "bg-bad" : s === "CLOSED_WON" ? "bg-ok" : "bg-gold"}`}
                style={{ width: `${(n / max) * 100}%` }}
              />
            </div>
            <span className="w-6 text-right tabular-nums">{n}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
