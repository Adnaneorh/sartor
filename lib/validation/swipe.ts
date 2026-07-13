import { z } from "zod";

// Boundary validation for swipe writes (golden rule 11), on the
// persona.ts pattern: the direction enum is defined HERE once and feeds
// the schema, the server actions, and the deck UI. Must stay in lockstep
// with the swipes table CHECK constraint (migration 20260712161742).

export const SWIPE_DIRECTIONS = ["left", "right"] as const;
export type SwipeDirection = (typeof SWIPE_DIRECTIONS)[number];

export const swipeInputSchema = z.object({
  job_id: z.uuid("job_id must be a uuid"),
  direction: z.enum(SWIPE_DIRECTIONS, { error: "direction must be left or right" }),
});

export const undoInputSchema = z.object({
  job_id: z.uuid("job_id must be a uuid"),
});

export type SwipeInput = z.infer<typeof swipeInputSchema>;
