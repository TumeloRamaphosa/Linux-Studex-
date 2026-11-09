import type { Lead } from "@/lib/types";

const pill: Record<Lead["priority"], string> = {
  High: "bg-ok/20 text-ok",
  Medium: "bg-warn/20 text-warn",
  Low: "bg-line text-muted",
};

export default function LeadsTable({ leads }: { leads: Lead[] }) {
  const rows = [...leads].sort((a, b) => b.score - a.score);
  return (
    <section className="rounded-xl border border-line bg-card p-4">
      <h2 className="mb-3 text-sm font-semibold text-goldlight">Top leads by score</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-xs">
          <thead className="text-muted">
            <tr>
              <th className="pb-2 pr-3 font-medium">Business</th>
              <th className="pb-2 pr-3 font-medium">Area</th>
              <th className="pb-2 pr-3 font-medium">Source</th>
              <th className="pb-2 pr-3 font-medium">Website</th>
              <th className="pb-2 pr-3 font-medium">Score</th>
              <th className="pb-2 pr-3 font-medium">Priority</th>
              <th className="pb-2 font-medium">Stage</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.id} className="border-t border-line">
                <td className="py-2 pr-3">
                  <div className="font-medium">{l.name}</div>
                  <div className="text-muted">{l.category}</div>
                </td>
                <td className="py-2 pr-3">{l.area}</td>
                <td className="py-2 pr-3">{l.source}</td>
                <td className="py-2 pr-3">{l.hasWebsite ? "Yes" : <span className="text-goldlight">None</span>}</td>
                <td className="py-2 pr-3 tabular-nums">{l.score}</td>
                <td className="py-2 pr-3">
                  <span className={`rounded-full px-2 py-0.5 ${pill[l.priority]}`}>{l.priority}</span>
                </td>
                <td className="py-2">{l.stage.replace(/_/g, " ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
