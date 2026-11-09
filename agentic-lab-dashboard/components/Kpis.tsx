import type { Kpis as K } from "@/lib/types";

const targets = { leads: 500, cpl: 5, reply: 8, deals: 8, hours: 2 };

function Card({ label, value, target, good }: { label: string; value: string; target: string; good: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-card p-4">
      <div className="text-[11px] uppercase tracking-wider text-muted">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${good ? "text-ok" : "text-goldlight"}`}>{value}</div>
      <div className="mt-1 text-xs text-muted">90-day target: {target}</div>
    </div>
  );
}

export default function Kpis({ k }: { k: K }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <Card label="Leads this month" value={String(k.leadsThisMonth)} target={`${targets.leads}+`} good={k.leadsThisMonth >= targets.leads} />
      <Card label="Cost per lead" value={`R${k.costPerLeadZar.toFixed(2)}`} target={`< R${targets.cpl}`} good={k.costPerLeadZar > 0 && k.costPerLeadZar < targets.cpl} />
      <Card label="Reply rate" value={`${k.replyRatePct}%`} target={`${targets.reply}%+`} good={k.replyRatePct >= targets.reply} />
      <Card label="Deals closed" value={String(k.dealsClosed)} target={`${targets.deals}+ / mo`} good={k.dealsClosed >= targets.deals} />
      <Card label="Human hrs / week" value={String(k.humanHoursPerWeek)} target={`< ${targets.hours}`} good={k.humanHoursPerWeek > 0 && k.humanHoursPerWeek < targets.hours} />
    </div>
  );
}
