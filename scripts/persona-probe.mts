// Phase 1.2 behavioral probe (close-out contract, 2026-07-11) — rerunnable.
// On the rls-two-account-test.mjs pattern: mints a REAL confirmed user via
// the admin API, signs in with the anon key, and proves live:
//
//   1. positive control — a valid persona passes personaSchema AND lands
//      on the user's own profiles row under RLS
//   2. updated_at ADVANCES on a real UPDATE (closes the parked audit #3
//      item: the trigger was only structurally verified until now)
//   3. onboarded_at stamps ONCE — the action's .is('onboarded_at', null)
//      guard is proven at the DB: a second stamp matches 0 rows and the
//      first timestamp survives (AUDIT #5 finding 1)
//   4. personaSchema rejects a city outside the selected province
//   5. personaSchema rejects salary min > max
//   6. the DB salary_range_valid check ALSO rejects min > max (the schema
//      is the boundary, the constraint is the backstop — prove both)
//
// usage: npx tsx scripts/persona-probe.mts   (requires `supabase start`)
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { personaSchema } from "../lib/validation/persona";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)])
);

let failures = 0;
const check = (label: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? " — " + detail : ""}`);
  if (!ok) failures++;
};

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const email = `persona-probe-${randomUUID()}@probe.local`;
const password = `Probe-${randomUUID()}`;
const { data: created, error: createErr } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: "Persona Probe", age_confirmed: true },
});
if (createErr) {
  console.error(`cannot mint probe user: ${createErr.message}`);
  process.exit(2);
}
const userId = created.user.id;

try {
  const me = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const { error: signInErr } = await me.auth.signInWithPassword({ email, password });
  if (signInErr) {
    // throw (not process.exit) so finally still deletes the probe user
    throw new Error(`cannot sign in probe user: ${signInErr.message}`);
  }

  const before = await me
    .from("profiles")
    .select("updated_at, onboarded_at")
    .eq("user_id", userId)
    .single();
  check("probe profile row exists (signup trigger)", !before.error);

  // 1 — positive control through the SAME schema the action uses
  const valid = personaSchema.safeParse({
    desired_roles: ["frontend developer", "ui engineer"],
    province: "ON",
    cities: ["Toronto", "Ottawa"],
    remote_preference: "hybrid",
    seniority: "mid",
    salary_min_cad: 55000,
    salary_max_cad: 85000,
  });
  check("valid persona passes personaSchema", valid.success);

  await new Promise((r) => setTimeout(r, 1100)); // let now() visibly advance
  const upd = valid.success
    ? await me
        .from("profiles")
        .update({ ...valid.data, salary_min_cad: valid.data.salary_min_cad ?? null, salary_max_cad: valid.data.salary_max_cad ?? null })
        .eq("user_id", userId)
        .select("updated_at, province, cities")
        .single()
    : { error: new Error("skipped: schema rejected valid persona"), data: null };
  check(
    "valid persona lands on own row under RLS",
    !upd.error && upd.data?.province === "ON" && (upd.data?.cities?.length ?? 0) === 2
  );

  // 2 — audit #3 parked item: the updated_at trigger, exercised for real
  check(
    "updated_at advances on a real UPDATE",
    !!before.data &&
      !!upd.data &&
      new Date(upd.data.updated_at).getTime() > new Date(before.data.updated_at).getTime(),
    `${before.data?.updated_at} → ${upd.data?.updated_at}`
  );

  // 3 — stamp-once: the exact stamp shape savePersonaAction issues, twice
  // with distinct sentinel timestamps — the .is() guard must let only the
  // first one write, whatever races (AUDIT #5 finding 1)
  const t1 = "2026-01-01T00:00:00.000Z";
  const t2 = "2026-02-02T00:00:00.000Z";
  const stamp1 = await me
    .from("profiles")
    .update({ onboarded_at: t1 })
    .eq("user_id", userId)
    .is("onboarded_at", null)
    .select("onboarded_at");
  check(
    "first onboarded_at stamp lands (row starts null)",
    !stamp1.error && stamp1.data?.length === 1
  );
  const stamp2 = await me
    .from("profiles")
    .update({ onboarded_at: t2 })
    .eq("user_id", userId)
    .is("onboarded_at", null)
    .select("onboarded_at");
  check(
    "re-stamp matches 0 rows — success, not an overwrite",
    !stamp2.error && stamp2.data?.length === 0
  );
  const stamped = await me.from("profiles").select("onboarded_at").eq("user_id", userId).single();
  check(
    "onboarded_at still the FIRST stamp",
    !stamped.error && new Date(stamped.data?.onboarded_at).getTime() === new Date(t1).getTime(),
    `${stamped.data?.onboarded_at}`
  );

  // 4 — Calgary is real, but it is not in Ontario
  const wrongCity = personaSchema.safeParse({
    desired_roles: ["frontend developer"],
    province: "ON",
    cities: ["Calgary"],
    remote_preference: "any",
    seniority: "mid",
  });
  check(
    "schema rejects city outside the selected province",
    !wrongCity.success,
    wrongCity.success ? "accepted!" : wrongCity.error.issues[0]?.message
  );

  // 5 — min > max fails the schema refine
  const invertedRange = personaSchema.safeParse({
    desired_roles: ["frontend developer"],
    province: "ON",
    cities: [],
    remote_preference: "any",
    seniority: "mid",
    salary_min_cad: 90000,
    salary_max_cad: 60000,
  });
  check(
    "schema rejects salary min > max",
    !invertedRange.success,
    invertedRange.success ? "accepted!" : invertedRange.error.issues[0]?.message
  );

  // 6 — and the DB check constraint is a live backstop behind the schema
  const dbReject = await me
    .from("profiles")
    .update({ salary_min_cad: 90000, salary_max_cad: 60000 })
    .eq("user_id", userId)
    .select("user_id");
  check(
    "DB salary_range_valid constraint rejects min > max",
    dbReject.error !== null &&
      (dbReject.error.code === "23514" || /salary_range_valid/.test(dbReject.error.message)),
    dbReject.error ? dbReject.error.code : "no error!"
  );
} finally {
  await admin.auth.admin.deleteUser(userId);
}

console.log(
  failures === 0
    ? "\nPERSONA PROBE: ALL CHECKS PASS"
    : `\nPERSONA PROBE: ${failures} FAILURES — boundary or trigger broken`
);
process.exit(failures === 0 ? 0 : 1);
