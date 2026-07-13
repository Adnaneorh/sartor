import type { DeckJob } from "@/lib/jobs/deck-query";

// Display helpers shared by the card and the full-role panel — pure
// functions, no client/server split.

export const monogramLetter = (company: string) =>
  company.trim().charAt(0).toUpperCase();

export function locationLabel(
  job: Pick<DeckJob, "province" | "city" | "is_remote">
): string {
  if (job.is_remote) {
    return job.city && job.province
      ? `${job.city}, ${job.province} · remote`
      : "remote (Canada)";
  }
  // non-remote seeds always carry both (seed schema enforces it)
  return job.city && job.province ? `${job.city}, ${job.province}` : "Canada";
}

const cad = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 0,
});

// both-or-neither by DB constraint + seed schema; null = undisclosed
export function salaryLabel(min: number | null, max: number | null): string | null {
  if (min === null || max === null) return null;
  return `${cad.format(min)}–${cad.format(max)}`;
}

// PRD 3.2b#4: every card shows relative age — freshness stays VISIBLE,
// not just enforced. Vibe microcopy per DESIGN ("dropped 2 days ago").
export function postedAgoLabel(postedAt: string): string {
  const days = Math.max(
    0,
    Math.floor((Date.now() - new Date(postedAt).getTime()) / 86_400_000)
  );
  if (days === 0) return "dropped today";
  if (days === 1) return "dropped yesterday";
  return `dropped ${days} days ago`;
}
