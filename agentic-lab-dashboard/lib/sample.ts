import type { GuardState, Lead, PipelineData, Stage } from "./types";
import { priorityFor } from "./scoring";

const raw: Array<[string, string, string, Lead["source"], boolean, number, Stage, boolean]> = [
  ["Braai & Co", "Restaurant", "Sandton", "Google Maps", false, 62, "CONTACTED", true],
  ["Melville Bakehouse", "Bakery", "Melville", "Instagram", false, 58, "REPLIED", true],
  ["Rosebank Threads", "Fashion retail", "Rosebank", "Google Maps", false, 55, "FOLLOWED_UP", true],
  ["Fourways Dental", "Clinic", "Fourways", "Google Maps", true, 28, "SCORED", true],
  ["Maboneng Coffee Lab", "Cafe", "Maboneng", "Instagram", false, 57, "DEMO_BOOKED", true],
  ["Parkhurst Legal", "Legal services", "Parkhurst", "LinkedIn", true, 31, "VERIFIED", true],
  ["Soweto Kota House", "Restaurant", "Soweto", "Google Maps", false, 60, "CONTACTED", false],
  ["Linden Beauty Bar", "Beauty salon", "Linden", "Instagram", false, 52, "PROPOSAL_SENT", true],
  ["Bryanston Caterers", "Catering", "Bryanston", "Yelp", false, 48, "CLOSED_WON", true],
  ["Randburg Print Works", "Printing", "Randburg", "Yellow Pages", true, 12, "SOURCED", false],
  ["Greenside Deli", "Restaurant", "Greenside", "Google Maps", false, 54, "SCORED", true],
  ["Midrand Auto Spares", "Retail", "Midrand", "Yellow Pages", true, 16, "CLOSED_LOST", true],
];

export const sampleLeads: Lead[] = raw.map(([name, category, area, source, hasWebsite, score, stage, hasEmail], i) => ({
  id: `L-${1000 + i}`,
  name,
  category,
  area,
  source,
  hasWebsite,
  score,
  priority: priorityFor(score),
  stage,
  email: hasEmail ? `hello@${name.toLowerCase().replace(/[^a-z]/g, "")}.co.za` : null,
  phone: `+27 11 555 ${String(1000 + i * 7).slice(-4)}`,
  updatedAt: new Date(Date.now() - i * 3_600_000 * 5).toISOString(),
}));

export function samplePipeline(note?: string): PipelineData {
  return {
    source: "sample",
    note: note ?? "Showing sample data. Set DATA_SOURCE in .env.local to go live.",
    generatedAt: new Date().toISOString(),
    kpis: {
      leadsThisMonth: 214,
      costPerLeadZar: 4.6,
      replyRatePct: 7.4,
      dealsClosed: 3,
      humanHoursPerWeek: 2.5,
    },
    leads: sampleLeads,
  };
}

export const sampleGuard: GuardState = {
  source: "sample",
  dailyCapUsd: 50,
  spentTodayUsd: 11.3,
  perCallCapUsd: 5,
  killsToday: 0,
  blockedToolCalls: 2,
  lastEvent: "tool_denied: shell (outreach-agent)",
};
