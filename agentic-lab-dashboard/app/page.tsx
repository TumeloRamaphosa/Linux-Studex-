import AutoRefresh from "@/components/AutoRefresh";
import Funnel from "@/components/Funnel";
import GuardPanel from "@/components/GuardPanel";
import Kpis from "@/components/Kpis";
import LeadsTable from "@/components/LeadsTable";
import StackHealth from "@/components/StackHealth";
import { getGuard, getHealth, getPipeline } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Page() {
  const [pipeline, health, guard] = await Promise.all([getPipeline(), getHealth(), getGuard()]);

  return (
    <main className="mx-auto max-w-6xl space-y-4 px-4 py-6">
      <AutoRefresh seconds={30} />
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-gold">Studex Group / Agentic Lab</div>
          <h1 className="text-2xl font-semibold">Lead Engine Control Room</h1>
        </div>
        <div className="text-right text-xs text-muted">
          <div>
            Source: <span className="text-ink">{pipeline.source}</span>
          </div>
          <div>Updated {new Date(pipeline.generatedAt).toLocaleTimeString("en-ZA")}</div>
        </div>
      </header>

      {pipeline.note && (
        <div className="rounded-lg border border-gold/40 bg-card2 px-3 py-2 text-xs text-goldlight">{pipeline.note}</div>
      )}

      <Kpis k={pipeline.kpis} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Funnel leads={pipeline.leads} />
        </div>
        <div className="space-y-4">
          <StackHealth items={health} />
          <GuardPanel g={guard} />
        </div>
      </div>

      <LeadsTable leads={pipeline.leads} />
    </main>
  );
}
