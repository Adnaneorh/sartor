"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { DeckJob } from "@/lib/jobs/deck-query";
import { Kbd } from "./kbd";
import {
  locationLabel,
  monogramLetter,
  postedAgoLabel,
  salaryLabel,
} from "./format";

// Full-description panel (PRD 3.2: "full description opens on demand" —
// the text is the real posting's). Right-side sheet, hairline elevation
// per DESIGN (no shadows). Deliberately NO apply button: the apply flow
// (deep link + click-time validity re-probe) is Phase 2.3.
export function DescriptionPanel({
  job,
  open,
  onClose,
}: {
  job: DeckJob | null;
  open: boolean;
  onClose: () => void;
}) {
  const salary = job ? salaryLabel(job.salary_min_cad, job.salary_max_cad) : null;
  return (
    <AnimatePresence>
      {open && job && (
        <>
          <motion.div
            aria-hidden
            className="fixed inset-0 z-40 bg-ink/10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={`full role: ${job.title}`}
            className="fixed inset-y-0 right-0 z-50 flex w-[460px] max-w-full flex-col gap-4 overflow-y-auto hairline-l bg-surface p-8"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.22, ease: "easeOut" }}
          >
            <div className="flex items-start justify-between">
              <span
                aria-hidden
                className="flex h-12 w-12 items-center justify-center rounded-full bg-mint-tint text-lg font-medium text-mint-text"
              >
                {monogramLetter(job.company)}
              </span>
              <button
                type="button"
                onClick={onClose}
                className="text-sm text-text-secondary transition-colors hover:text-ink"
              >
                close <Kbd>esc</Kbd>
              </button>
            </div>

            <div className="flex flex-col gap-1">
              <h2 className="text-xl font-medium tracking-tight text-ink">
                {job.title}
              </h2>
              <p className="text-sm text-text-secondary">
                {job.company} · {locationLabel(job)}
              </p>
              <p className="font-mono text-xs text-text-muted">
                {postedAgoLabel(job.posted_at)}
              </p>
            </div>

            {salary && (
              <p className="font-mono text-sm text-primary">
                {salary} <span className="text-text-muted">CAD/yr</span>
              </p>
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

            <div className="hairline-t pt-4">
              <p className="whitespace-pre-line text-sm leading-relaxed text-ink">
                {job.description}
              </p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
