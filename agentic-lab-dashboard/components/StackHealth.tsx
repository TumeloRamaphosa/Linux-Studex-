import type { ServiceHealth } from "@/lib/types";

const dot = { up: "bg-ok", slow: "bg-warn", down: "bg-bad" } as const;

export default function StackHealth({ items }: { items: ServiceHealth[] }) {
  return (
    <section className="rounded-xl border border-line bg-card p-4">
      <h2 className="mb-3 text-sm font-semibold text-goldlight">Stack health</h2>
      {items.length === 0 ? (
        <p className="text-xs text-muted">Set HEALTH_TARGETS in .env.local to monitor services.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((s) => (
            <li key={s.name} className="flex items-center justify-between gap-3 text-xs">
              <span className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${dot[s.status]}`} />
                {s.name}
              </span>
              <span className="text-muted">
                {s.status === "down" ? "unreachable" : `${s.latencyMs} ms`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
