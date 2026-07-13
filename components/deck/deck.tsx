"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
} from "framer-motion";
import type { DeckJob } from "@/lib/jobs/deck-query";
import type { SwipeDirection } from "@/lib/validation/swipe";
import { recordSwipeAction, undoSwipeAction } from "@/app/home/actions";
import { JobCard } from "./job-card";
import { DescriptionPanel } from "./description-panel";
import { ShortcutsOverlay } from "./shortcuts-overlay";
import { Kbd } from "./kbd";

// The swipe deck (ROADMAP 1.4). Server gives it the already-filtered,
// freshness-guaranteed batch (lib/jobs/deck-query.ts); this component
// owns gesture + keyboard mechanics and the OPTIMISTIC write path:
// swipe → card leaves instantly → recordSwipeAction persists under RLS;
// a failed write rolls the card back and says so. Undo (Z) is a session
// LIFO stack (1.4 decision 3): it deletes the swipe row server-side and
// restores the card — after a reload there is nothing to step back
// through, by design.

// past this (drag offset + weighted flick velocity) the card commits
const SWIPE_COMMIT = 140;

const EXIT_X = 560;

type HistoryEntry = { job: DeckJob; direction: SwipeDirection };

const cardVariants = {
  // a card newly placed on top (undo) rises from the peek slot
  enter: { scale: 0.95, y: 14, opacity: 0.6 },
  exit: (direction: SwipeDirection | null) =>
    direction
      ? {
          zIndex: 40,
          x: direction === "right" ? EXIT_X : -EXIT_X,
          rotate: direction === "right" ? 14 : -14,
          opacity: 0,
          transition: { duration: 0.22, ease: "easeIn" as const },
        }
      : { opacity: 0 },
};

function DeckCard({
  job,
  index,
  onSwipe,
  onOpenRole,
}: {
  job: DeckJob;
  index: number;
  onSwipe: (direction: SwipeDirection) => void;
  onOpenRole: () => void;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-320, 320], [-12, 12]);
  const isTop = index === 0;
  return (
    <motion.div
      className={`absolute inset-0 ${
        isTop ? "cursor-grab active:cursor-grabbing" : "pointer-events-none"
      }`}
      style={{ x, rotate, zIndex: 30 - index }}
      variants={cardVariants}
      custom={null}
      initial="enter"
      animate={{ scale: 1 - index * 0.045, y: index * 12, opacity: 1 }}
      exit="exit"
      drag={isTop ? "x" : false}
      dragSnapToOrigin
      dragElastic={0.65}
      onDragEnd={
        isTop
          ? (_, info) => {
              const fling = info.offset.x + info.velocity.x * 0.25;
              if (fling > SWIPE_COMMIT) onSwipe("right");
              else if (fling < -SWIPE_COMMIT) onSwipe("left");
            }
          : undefined
      }
      aria-hidden={!isTop}
    >
      <JobCard job={job} onOpenRole={isTop ? onOpenRole : undefined} />
    </motion.div>
  );
}

export function Deck({ initialJobs }: { initialJobs: DeckJob[] }) {
  const [stack, setStack] = useState<DeckJob[]>(initialJobs);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  // AnimatePresence reads this at exit time so the leaving card flies
  // the way it was swiped
  const [lastDirection, setLastDirection] = useState<SwipeDirection | null>(null);
  const [roleOpen, setRoleOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const top: DeckJob | undefined = stack[0];

  const swipe = useCallback(
    (direction: SwipeDirection) => {
      const job = stack[0];
      if (!job) return;
      setActionError(null);
      setLastDirection(direction);
      setRoleOpen(false);
      setStack((s) => s.slice(1));
      setHistory((h) => [...h, { job, direction }]);
      const rollback = (message: string) => {
        setActionError(message);
        setHistory((h) => h.filter((entry) => entry.job.id !== job.id));
        setStack((s) => [job, ...s]);
      };
      void recordSwipeAction({ job_id: job.id, direction })
        .then((res) => {
          if (!res.ok) rollback(res.error ?? "swipe didn't save — try again");
        })
        .catch(() => rollback("you're offline — that swipe didn't save"));
    },
    [stack]
  );

  const undo = useCallback(() => {
    const last = history[history.length - 1];
    if (!last) return;
    setActionError(null);
    setHistory((h) => h.slice(0, -1));
    setStack((s) => [last.job, ...s]);
    const rollback = (message: string) => {
      // the swipe row still exists server-side — take the card back off
      setActionError(message);
      setStack((s) => s.filter((j) => j.id !== last.job.id));
      setHistory((h) => [...h, last]);
    };
    void undoSwipeAction({ job_id: last.job.id })
      .then((res) => {
        if (!res.ok) rollback(res.error ?? "undo didn't save — try again");
      })
      .catch(() => rollback("you're offline — that undo didn't save"));
  }, [history]);

  // keyboard map (DESIGN, unchanged): ← → ↑/space Z ? esc. Never steals
  // keys from form fields (the filter rail) or modified combos.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target.isContentEditable
      ) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          swipe("left");
          break;
        case "ArrowRight":
          e.preventDefault();
          swipe("right");
          break;
        case "ArrowUp":
        case " ":
          e.preventDefault();
          setRoleOpen((open) => !open);
          break;
        case "z":
        case "Z":
          e.preventDefault();
          undo();
          break;
        case "?":
          e.preventDefault();
          setShortcutsOpen((open) => !open);
          break;
        case "Escape":
          setRoleOpen(false);
          setShortcutsOpen(false);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [swipe, undo]);

  return (
    <div className="flex w-full max-w-[480px] flex-col items-center gap-5">
      <p className="self-end font-mono text-xs text-text-muted">
        {stack.length} fresh {stack.length === 1 ? "role" : "roles"}
      </p>

      <div className="relative h-[360px] w-full">
        {/* offset tint panel (DESIGN signature 3): solid mint block
            peeking behind the stack — depth without shadows */}
        <div
          aria-hidden
          className="absolute inset-0 translate-x-2.5 translate-y-2.5 rounded-card bg-mint-tint"
        />
        {stack.length === 0 ? (
          <div className="relative z-10 flex h-full w-full flex-col items-center justify-center gap-2 rounded-card hairline bg-surface p-8 text-center">
            <p className="text-lg font-medium tracking-tight text-ink">
              the deck is <span className="marker-amber">dry</span>
            </p>
            <p className="text-sm text-text-secondary">
              no fresh roles match these filters — loosen them, or check back
              soon.
            </p>
            {history.length > 0 && (
              <p className="text-sm text-text-muted">
                or take one back with <Kbd>Z</Kbd>
              </p>
            )}
          </div>
        ) : (
          <AnimatePresence custom={lastDirection} initial={false}>
            {stack.slice(0, 2).map((job, index) => (
              <DeckCard
                key={job.id}
                job={job}
                index={index}
                onSwipe={swipe}
                onOpenRole={() => setRoleOpen(true)}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      {actionError && (
        <p role="alert" className="text-sm text-destructive">
          {actionError}
        </p>
      )}

      {/* buttons under the deck (ROADMAP 1.4); save is the screen's one
          saturated object (DESIGN) */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => swipe("left")}
          disabled={!top}
          className="h-10 rounded-pill hairline bg-surface px-5 text-sm text-text-secondary transition-colors hover:bg-surface-tint disabled:opacity-40"
        >
          skip <Kbd>←</Kbd>
        </button>
        <button
          type="button"
          onClick={() => setRoleOpen((open) => !open)}
          disabled={!top}
          className="h-10 rounded-pill hairline bg-surface px-5 text-sm text-text-secondary transition-colors hover:bg-surface-tint disabled:opacity-40"
        >
          full role ↗ <Kbd>↑</Kbd>
        </button>
        <button
          type="button"
          onClick={() => swipe("right")}
          disabled={!top}
          className="h-10 rounded-pill bg-primary px-6 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          save{" "}
          {/* not <Kbd>: its hairline+tint keycap vanishes on green, and
              hairline must never be overridden with border-* (audit #2) */}
          <kbd className="rounded-md bg-white/20 px-1.5 py-0.5 font-mono text-[10px] leading-none text-primary-foreground">
            →
          </kbd>
        </button>
      </div>

      <div className="flex items-center gap-5">
        <button
          type="button"
          onClick={undo}
          disabled={history.length === 0}
          className="text-xs text-text-secondary transition-colors hover:text-ink disabled:opacity-40"
        >
          undo <Kbd>Z</Kbd>
        </button>
        <button
          type="button"
          onClick={() => setShortcutsOpen(true)}
          className="text-xs text-text-secondary transition-colors hover:text-ink"
        >
          shortcuts <Kbd>?</Kbd>
        </button>
      </div>

      <DescriptionPanel
        job={top ?? null}
        open={roleOpen && !!top}
        onClose={() => setRoleOpen(false)}
      />
      <ShortcutsOverlay
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />
    </div>
  );
}
