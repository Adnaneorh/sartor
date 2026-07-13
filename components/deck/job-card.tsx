import type { DeckJob } from "@/lib/jobs/deck-query";
import { Kbd } from "./kbd";
import {
  locationLabel,
  monogramLetter,
  postedAgoLabel,
  salaryLabel,
} from "./format";

// Swipe card (ROADMAP 1.4, DESIGN components list). Company-initial
// monogram on a mint tint circle — logo_url is null for every seed job;
// Phase 2 adds real-logo rendering when a source provides one. The card
// shows ONLY what PRD 3.2 allows at this phase: tags, no match score /
// vibe ring (Phase 3.3), no lane badge (Phase 2.3), no streak pill
// (post-launch). Relative age is mandatory (PRD 3.2b#4).
export function JobCard({
  job,
  onOpenRole,
}: {
  job: DeckJob;
  onOpenRole?: () => void;
}) {
  const salary = salaryLabel(job.salary_min_cad, job.salary_max_cad);
  return (
    <article className="flex h-full w-full flex-col gap-3 rounded-card hairline bg-surface p-6">
      <div className="flex items-start justify-between">
        <span
          aria-hidden
          className="flex h-12 w-12 items-center justify-center rounded-full bg-mint-tint text-lg font-medium text-mint-text"
        >
          {monogramLetter(job.company)}
        </span>
        <span className="font-mono text-xs text-text-muted">
          {postedAgoLabel(job.posted_at)}
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-medium tracking-tight text-ink">
          {job.title}
        </h2>
        <p className="text-sm text-text-secondary">
          {job.company} · {locationLabel(job)}
        </p>
      </div>

      {salary ? (
        <p className="font-mono text-sm text-primary">
          {salary} <span className="text-text-muted">CAD/yr</span>
        </p>
      ) : (
        <p className="font-mono text-xs text-text-muted">salary undisclosed</p>
      )}

      <ul className="flex flex-wrap gap-1.5">
        {job.tags.map((tag) => (
          <li
            key={tag}
            className="rounded-pill bg-surface-tint px-3 py-1 text-xs text-text-secondary"
          >
            {tag}
          </li>
        ))}
      </ul>

      {onOpenRole && (
        <div className="mt-auto">
          <button
            type="button"
            onClick={onOpenRole}
            className="text-sm text-text-secondary transition-colors hover:text-ink"
          >
            full role ↗ <Kbd>↑</Kbd>
          </button>
        </div>
      )}
    </article>
  );
}
