"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { personaSchema } from "@/lib/validation/persona";

// One action for BOTH onboarding and settings: Zod-parse at the trust
// boundary (rule 11) → update the user's OWN profiles row under RLS →
// stamp onboarded_at on first completion only (it records a fact —
// DECISION 1 — so later settings saves never re-stamp it).

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

  const { data: current } = await supabase
    .from("profiles")
    .select("onboarded_at")
    .eq("user_id", user.id)
    .single();

  const { error } = await supabase
    .from("profiles")
    .update({
      desired_roles: parsed.data.desired_roles,
      province: parsed.data.province,
      cities: parsed.data.cities,
      remote_preference: parsed.data.remote_preference,
      seniority: parsed.data.seniority,
      salary_min_cad: parsed.data.salary_min_cad ?? null,
      salary_max_cad: parsed.data.salary_max_cad ?? null,
      ...(current?.onboarded_at
        ? {}
        : { onboarded_at: new Date().toISOString() }),
    })
    .eq("user_id", user.id)
    .select("user_id")
    .single(); // .single() also fails on 0 rows, so a silently-filtered write can't pass
  if (error) return { error: "could not save — try again", saved: false };

  // "from" only picks between two harmless behaviors (redirect home vs stay),
  // so it needs no validation beyond this equality check.
  if (formData.get("from") === "onboarding") redirect("/home");
  return { error: null, saved: true };
}
