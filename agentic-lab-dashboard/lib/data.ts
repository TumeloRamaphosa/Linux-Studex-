import { readFile } from "node:fs/promises";
import type { GuardState, Lead, PipelineData, ServiceHealth, Stage } from "./types";
import { STAGES } from "./types";
import { priorityFor } from "./scoring";
import { sampleGuard, samplePipeline } from "./sample";

const TIMEOUT_MS = 2500;

async function fetchJson(url: string, token?: string): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: ctrl.signal,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

function toStage(v: unknown): Stage {
  const s = String(v ?? "").toUpperCase().replace(/[\s-]+/g, "_");
  return (STAGES as string[]).includes(s) ? (s as Stage) : "SOURCED";
}

function mapLead(r: Record<string, unknown>, i: number): Lead {
  const score = Number(r.score ?? 0);
  return {
    id: String(r.id ?? `L-${i}`),
    name: String(r.name ?? "Unknown"),
    category: String(r.category ?? ""),
    area: String(r.area ?? r.city ?? ""),
    source: (r.source as Lead["source"]) ?? "Google Maps",
    hasWebsite: Boolean(r.hasWebsite ?? r.website),
    score,
    priority: priorityFor(score),
    stage: toStage(r.stage),
    email: (r.email as string) ?? null,
    phone: (r.phone as string) ?? null,
    updatedAt: String(r.updatedAt ?? new Date().toISOString()),
  };
}

function kpisFromLeads(leads: Lead[]): PipelineData["kpis"] {
  const contacted = leads.filter((l) => !["SOURCED", "VERIFIED", "SCORED"].includes(l.stage)).length;
  const replied = leads.filter((l) =>
    ["REPLIED", "DEMO_BOOKED", "PROPOSAL_SENT", "CLOSED_WON"].includes(l.stage),
  ).length;
  return {
    leadsThisMonth: leads.length,
    costPerLeadZar: 0,
    replyRatePct: contacted ? Math.round((replied / contacted) * 1000) / 10 : 0,
    dealsClosed: leads.filter((l) => l.stage === "CLOSED_WON").length,
    humanHoursPerWeek: 0,
  };
}

// Adapter: DenchClaw API. Endpoint shape is configurable; adjust once DenchClaw is running.
async function fromDenchClaw(): Promise<PipelineData> {
  const base = process.env.DENCHCLAW_URL ?? "http://localhost:3200";
  const json = (await fetchJson(`${base}/api/leads`, process.env.DENCHCLAW_TOKEN)) as
    | { leads?: Record<string, unknown>[] }
    | Record<string, unknown>[];
  const rows = Array.isArray(json) ? json : (json.leads ?? []);
  const leads = rows.map(mapLead);
  return { source: "denchclaw", generatedAt: new Date().toISOString(), kpis: kpisFromLeads(leads), leads };
}

// Adapter: published Google Sheet CSV.
async function fromSheetsCsv(): Promise<PipelineData> {
  const url = process.env.SHEETS_CSV_URL;
  if (!url) throw new Error("SHEETS_CSV_URL not set");
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const [head, ...lines] = (await res.text()).trim().split(/\r?\n/);
  const cols = head.split(",").map((c) => c.trim());
  const leads = lines.map((line, i) => {
    const cells = line.split(",");
    const row: Record<string, unknown> = {};
    cols.forEach((c, idx) => (row[c] = cells[idx]?.trim()));
    return mapLead(row, i);
  });
  return { source: "sheets-csv", generatedAt: new Date().toISOString(), kpis: kpisFromLeads(leads), leads };
}

export async function getPipeline(): Promise<PipelineData> {
  const mode = process.env.DATA_SOURCE ?? "sample";
  try {
    if (mode === "denchclaw") return await fromDenchClaw();
    if (mode === "sheets-csv") return await fromSheetsCsv();
  } catch (e) {
    return samplePipeline(`Live source "${mode}" unavailable (${(e as Error).message}). Showing sample data.`);
  }
  return samplePipeline();
}

export async function getHealth(): Promise<ServiceHealth[]> {
  const targets = (process.env.HEALTH_TARGETS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const [name, url] = s.split("|");
      return { name, url };
    });
  return Promise.all(
    targets.map(async ({ name, url }) => {
      const start = Date.now();
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
      try {
        await fetch(url, { cache: "no-store", signal: ctrl.signal });
        const ms = Date.now() - start;
        return { name, url, status: ms > 1200 ? "slow" : "up", latencyMs: ms } as ServiceHealth;
      } catch {
        return { name, url, status: "down", latencyMs: null } as ServiceHealth;
      } finally {
        clearTimeout(t);
      }
    }),
  );
}

export async function getGuard(): Promise<GuardState> {
  const path = process.env.GUARD_STATE_PATH;
  if (!path) return sampleGuard;
  try {
    const j = JSON.parse(await readFile(path, "utf8")) as Partial<GuardState>;
    return { ...sampleGuard, ...j, source: "file" };
  } catch {
    return sampleGuard;
  }
}
