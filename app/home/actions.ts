"use server";

import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { swipeInputSchema, undoInputSchema } from "@/lib/validation/swipe";

// Swipe writes (ROADMAP 1.4): the ONLY client-writable path this phase.
// Zod-parse at the trust boundary (rule 11) → write the user's OWN
// swipes row under RLS (insert/delete only — the table has no update
// path by design, 1.4 decision 3). Swallowed Postgrest errors go to
// Sentry (AUDIT #5 lesson): the user sees a generic message, we see the
// cause. Jobs stay read-only — nothing here touches them.

export type SwipeActionResult = { ok: boolean; error: string | null };

export async function recordSwipeAction(input: {
  job_id: string;
  direction: string;
}): Promise<SwipeActionResult> {
  const parsed = swipeInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid swipe" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "signed out — sign in again" };

  const { error } = await supabase.from("swipes").insert({
    user_id: user.id,
    job_id: parsed.data.job_id,
    direction: parsed.data.direction,
  });
  // 23505 = already swiped (unique user+job): the decision is recorded,
  // which is what this action promises — idempotent success, not an error
  if (error && error.code !== "23505") {
    Sentry.captureException(error);
    return { ok: false, error: "swipe didn't save — try again" };
  }
  return { ok: true, error: null };
}

export async function undoSwipeAction(input: {
  job_id: string;
}): Promise<SwipeActionResult> {
  const parsed = undoInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid undo" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "signed out — sign in again" };

  // undo = delete own row (1.4 decision 3); RLS confines the delete to
  // the caller's rows, the .eq is belt+suspenders. 0 rows deleted means
  // there was nothing to undo — idempotent success.
  const { error } = await supabase
    .from("swipes")
    .delete()
    .eq("user_id", user.id)
    .eq("job_id", parsed.data.job_id);
  if (error) {
    Sentry.captureException(error);
    return { ok: false, error: "undo didn't save — try again" };
  }
  return { ok: true, error: null };
}
