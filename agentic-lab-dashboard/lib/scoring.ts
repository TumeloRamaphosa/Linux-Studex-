import type { Priority } from "./types";

// Scoring matrix from the PRD (Section 9).
export interface ScoreInput {
  hasWebsite: boolean;
  hasGoogleListing: boolean;
  rating: number | null;
  reviews: number | null;
  category: string;
  instagramFollowers: number | null;
  hasEmail: boolean;
  isChain: boolean;
}

export function scoreLead(i: ScoreInput): number {
  let s = 0;
  if (!i.hasWebsite) s += 30;
  if (!i.hasGoogleListing) s += 20;
  if ((i.rating ?? 0) > 4.0 && (i.reviews ?? 0) >= 50) s += 15;
  const c = i.category.toLowerCase();
  if (/(restaurant|food|hospitality|cafe|bakery|catering)/.test(c)) s += 10;
  else if (/(retail|fashion|beauty|salon|boutique)/.test(c)) s += 10;
  else if (/(legal|account|consult|agency|professional|clinic)/.test(c)) s += 8;
  if ((i.instagramFollowers ?? 0) > 1000) s += 5;
  if (!i.hasEmail) s -= 5;
  if (i.isChain) s -= 20;
  return s;
}

export function priorityFor(score: number): Priority {
  if (score >= 40) return "High";
  if (score >= 20) return "Medium";
  return "Low";
}
