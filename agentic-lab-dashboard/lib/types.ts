export type Stage =
  | "SOURCED"
  | "VERIFIED"
  | "SCORED"
  | "CONTACTED"
  | "FOLLOWED_UP"
  | "REPLIED"
  | "DEMO_BOOKED"
  | "PROPOSAL_SENT"
  | "CLOSED_WON"
  | "CLOSED_LOST";

export const STAGES: Stage[] = [
  "SOURCED",
  "VERIFIED",
  "SCORED",
  "CONTACTED",
  "FOLLOWED_UP",
  "REPLIED",
  "DEMO_BOOKED",
  "PROPOSAL_SENT",
  "CLOSED_WON",
  "CLOSED_LOST",
];

export type Priority = "High" | "Medium" | "Low";

export interface Lead {
  id: string;
  name: string;
  category: string;
  area: string;
  source: "Google Maps" | "LinkedIn" | "Instagram" | "Yelp" | "Yellow Pages";
  hasWebsite: boolean;
  score: number;
  priority: Priority;
  stage: Stage;
  email: string | null;
  phone: string | null;
  updatedAt: string;
}

export interface Kpis {
  leadsThisMonth: number;
  costPerLeadZar: number;
  replyRatePct: number;
  dealsClosed: number;
  humanHoursPerWeek: number;
}

export interface PipelineData {
  source: "sample" | "denchclaw" | "sheets-csv";
  note?: string;
  generatedAt: string;
  kpis: Kpis;
  leads: Lead[];
}

export type HealthStatus = "up" | "down" | "slow";

export interface ServiceHealth {
  name: string;
  url: string;
  status: HealthStatus;
  latencyMs: number | null;
}

export interface GuardState {
  source: "sample" | "file";
  dailyCapUsd: number;
  spentTodayUsd: number;
  perCallCapUsd: number;
  killsToday: number;
  blockedToolCalls: number;
  lastEvent: string;
}
