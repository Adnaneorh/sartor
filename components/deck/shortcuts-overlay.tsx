"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Kbd } from "./kbd";

// "?" shortcuts overlay (DESIGN: every interactive surface keeps a
// keyboard path; ? opens this). ⌘K palette is v1.5 — not listed yet.
const SHORTCUTS = [
  { action: "decline", keys: ["←"] },
  { action: "save", keys: ["→"] },
  { action: "full role", keys: ["↑", "space"] },
  { action: "undo last swipe", keys: ["Z"] },
  { action: "shortcuts", keys: ["?"] },
  { action: "close", keys: ["esc"] },
] as const;

export function ShortcutsOverlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="keyboard shortcuts"
            className="w-80 rounded-card hairline bg-surface p-6"
            initial={{ scale: 0.96, y: 8 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 8 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-medium tracking-tight text-ink">
              keyboard <span className="marker-mint">shortcuts</span>
            </h2>
            <ul className="mt-4 flex flex-col gap-2.5">
              {SHORTCUTS.map(({ action, keys }) => (
                <li key={action} className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">{action}</span>
                  <span className="flex items-center gap-1">
                    {keys.map((key, i) => (
                      <span key={key} className="flex items-center gap-1">
                        {i > 0 && (
                          <span className="text-xs text-text-muted">/</span>
                        )}
                        <Kbd>{key}</Kbd>
                      </span>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
