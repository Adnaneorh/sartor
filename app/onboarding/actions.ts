"use server";

import { redirect } from "next/navigation";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { personaSchema } from "@/lib/validation/persona";

// One action for BOTH onboarding and settings: Zod-parse at the trust
// boundary (rule 11) → update the user's OWN profiles row under RLS →
// stamp onboarded_at on first completion only (DECISIONS 2026-07-11 §4).
// The stamp is guarded IN THE QUERY (.is onboarded_at null), not by a
// read-then-write, so it can only ever write once whatever races
// (AUDIT #5 finding 1). Every swallowed Postgrest error goes to Sentry
// (finding 2) — the user sees a generic message, we see the cause.

export type PersonaFormState = { error: string | null; saved: boolean };

function toOptionalInt(value: FormDataEntryValue | null): number | undefined {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  return Number(value);
}

export async function savePersonaAction(
  _prev: PersonaFormState,
  formData: FormData
): Promise<PersonaFormState> {
  const parsed = personaSchema.safeParse({
    desired_roles: formData.getAll("desired_roles"),
    province: formData.get("province"),
    cities: formData.getAll("cities"),
    remote_preference: formData.get("remote_preference"),
    seniority: formData.get("seniority"),
    salary_min_cad: toOptionalInt(formData.get("salary_min_cad")),
    salary_max_cad: toOptionalInt(formData.get("salary_max_cad")),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "invalid input",
      saved: false,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signin");

  const personaColumns = {
    desired_roles: parsed.data.desired_roles,
    province: parsed.data.province,
    cities: parsed.data.cities,
    remote_preference: parsed.data.remote_preference,
    seniority: parsed.data.seniority,
    salary_min_cad: parsed.data.salary_min_cad ?? null,
    salary_max_cad: parsed.data.salary_max_cad ?? null,
  };

  let onboardedAt: string | null;
  const updated = await supabase
    .from("profiles")
    .update(personaColumns)
    .eq("user_id", user.id)
    .select("onboarded_at")
    .single(); // .single() also fails on 0 rows, so a silently-filtered write can't pass
  if (!updated.error) {
    onboardedAt = updated.data.onboarded_at;
  } else if (updated.error.code === "PGRST116") {
    // 0 rows: the row the signup trigger guarantees is missing (AUDIT #5
    // finding 2). Recover instead of dead-ending — profiles_insert_own
    // exists for exactly this — and tell Sentry the invariant broke.
    Sentry.captureMessage("profiles row missing on persona save — recreating", {
      level: "warning",
      extra: { user_id: user.id },
    });
    const inserted = await supabase
      .from("profiles")
      .insert({ user_id: user.id, ...personaColumns })
      .select("onboarded_at")
      .single();
    if (inserted.error) {
      Sentry.captureException(inserted.error);
      return {
        error: "your profile could not be restored — sign out, back in, and retry",
        saved: false,
      };
    }
    onboardedAt = inserted.data.onboarded_at;
  } else {
    Sentry.captureException(updated.error);
    return { error: "could not save — try again", saved: false };
  }

  if (!onboardedAt) {
    // First completion: the .is() filter makes the stamp atomic — only a
    // never-stamped row matches, so a concurrent save's stamp finds 0 rows
    // (which is success, not an error) and can never overwrite the fact.
    const { error: stampError } = await supabase
      .from("profiles")
      .update({ onboarded_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("onboarded_at", null);
    if (stampError) {
      // persona fields DID save; only the stamp failed — retry re-stamps
      Sentry.captureException(stampError);
      return { error: "saved, but onboarding didn't complete — try again", saved: false };
    }
  }

  // "from" only picks between two harmless behaviors (redirect home vs stay),
  // so it needs no validation beyond this equality check.
  if (formData.get("from") === "onboarding") redirect("/home");
  return { error: null, saved: true };
}
