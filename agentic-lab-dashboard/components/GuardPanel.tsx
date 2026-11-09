import type { GuardState } from "@/lib/types";

export default function GuardPanel({ g }: { g: GuardState }) {
  const pct = Math.min(100, Math.round((g.spentTodayUsd / g.dailyCapUsd) * 100));
  const bar = pct > 85 ? "bg-bad" : pct > 60 ? "bg-warn" : "bg-ok";
  return (
    <section className="rounded-xl border border-line bg-card p-4">
      <h2 className="mb-3 text-sm font-semibold text-goldlight">Guard: spend and safety</h2>
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-muted">Today</span>
        <span className="tabular-nums">
          ${g.spentTodayUsd.toFixed(2)} / ${g.dailyCapUsd}
        </span>
      </div>
      <div className="mt-1 h-3 rounded bg-card2">
        <div className={`h-3 rounded ${bar}`} style={{ width: `${pct}%` }} />
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <div>
          <dt className="text-muted">Per-call cap</dt>
          <dd className="tabular-nums">${g.perCallCapUsd}</dd>
        </div>
        <div>
          <dt className="text-muted">Loops killed</dt>
          <dd className="tabular-nums">{g.killsToday}</dd>
        </div>
        <div>
          <dt className="text-muted">Tools blocked</dt>
          <dd className="tabular-nums">{g.blockedToolCalls}</dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-muted">Last event: {g.lastEvent}</p>
      {g.source === "sample" && (
        <p className="mt-1 text-[11px] text-muted">Sample values. Set GUARD_STATE_PATH to read real Guard state.</p>
      )}
    </section>
  );
}
