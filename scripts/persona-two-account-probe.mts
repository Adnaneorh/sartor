// Two-account probe for the persona WRITE path (AUDIT #5 finding 4 —
// rule 13: client-writable profiles paths get tested with two accounts,
// repeatably, not ad-hoc). Mints TWO real confirmed users via the admin
// API, seeds B a persona, signs in as A, and proves live:
//
//   1. A cannot READ B's persona row (0 rows under RLS)
//   2. A's TARGETED update of B — the exact shape savePersonaAction
//      issues (.eq on B's user_id + .select().single()), including an
//      onboarded_at overwrite attempt — matches 0 rows and errors
//   3. A's un-owned BULK update (.neq A) matches 0 rows
//   4. A cannot recovery-INSERT a row for another user — the missing-row
//      recovery shape is rejected by profiles_insert_own (42501), proven
//      against a ROWLESS user so a PK conflict can't mask the RLS verdict
//   5. the recovery insert DOES restore A's own missing row, and the
//      recreated row starts with onboarded_at null (stamp stays guarded)
//   6. B's row is byte-identical after A's attempts (service-role read)
//   7. positive control — the update shape DOES land on A's own row
//
// usage: npx tsx scripts/persona-two-account-probe.mts   (requires `supabase start`)
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

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

const mintUser = async (tag: string) => {
  const email = `persona-2acct-${tag}-${randomUUID()}@probe.local`;
  const password = `Probe-${randomUUID()}`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `Persona Probe ${tag}`, age_confirmed: true },
  });
  if (error) {
    console.error(`cannot mint probe user ${tag}: ${error.message}`);
    process.exit(2);
  }
  return { id: data.user.id, email, password };
};

const A = await mintUser("A");
const B = await mintUser("B");
const C = await mintUser("C"); // exists in auth.users, profiles row deleted below

const B_PERSONA = {
  desired_roles: ["b-role"],
  province: "BC",
  cities: ["Victoria"],
  remote_preference: "remote",
  seniority: "senior",
  onboarded_at: "2026-01-01T00:00:00+00:00",
};

try {
  const seeded = await admin
    .from("profiles")
    .update(B_PERSONA)
    .eq("user_id", B.id)
    .select("user_id")
    .single();
  if (seeded.error) throw new Error(`cannot seed B's persona: ${seeded.error.message}`);

  const asA = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const { error: signInErr } = await asA.auth.signInWithPassword({
    email: A.email,
    password: A.password,
  });
  // throw (not process.exit) so finally still deletes both probe users
  if (signInErr) throw new Error(`cannot sign in probe user A: ${signInErr.message}`);

  // 1 — cross-account read
  const read = await asA.from("profiles").select("desired_roles").eq("user_id", B.id);
  check(
    "A cannot read B's persona row",
    !read.error && (read.data?.length ?? -1) === 0,
    `rows=${read.data?.length}, err=${read.error?.message ?? "none"}`
  );

  // 2 — cross-account write, exact savePersonaAction shape
  const write = await asA
    .from("profiles")
    .update({
      desired_roles: ["hijacked"],
      province: "ON",
      cities: ["Toronto"],
      remote_preference: "onsite",
      seniority: "intern",
      salary_min_cad: null,
      salary_max_cad: null,
      onboarded_at: new Date().toISOString(),
    })
    .eq("user_id", B.id)
    .select("user_id")
    .single();
  check(
    "A's targeted update of B matches 0 rows and .single() errors",
    write.error !== null && write.data === null,
    write.error ? write.error.code : "UPDATE SUCCEEDED!"
  );

  // 3 — cross-account bulk write
  const broad = await asA
    .from("profiles")
    .update({ desired_roles: ["hijack-all"] })
    .neq("user_id", A.id)
    .select("user_id");
  check(
    "A's un-owned bulk update matches 0 rows",
    !broad.error && (broad.data?.length ?? -1) === 0,
    `rows=${broad.data?.length}, err=${broad.error?.message ?? "none"}`
  );

  // 4 + 5 — the recovery INSERT (savePersonaAction missing-row path):
  // exactly { user_id, ...persona columns }, never onboarded_at. C's row
  // is admin-deleted first, so what rejects the cross-insert must be the
  // profiles_insert_own policy, not the primary key.
  const RECOVERY_PERSONA = {
    desired_roles: ["a-role"],
    province: "ON",
    cities: ["Toronto"],
    remote_preference: "hybrid",
    seniority: "mid",
    salary_min_cad: null,
    salary_max_cad: null,
  };
  const delC = await admin.from("profiles").delete().eq("user_id", C.id);
  if (delC.error) throw new Error(`cannot clear C's row: ${delC.error.message}`);
  const crossInsert = await asA
    .from("profiles")
    .insert({ user_id: C.id, ...RECOVERY_PERSONA })
    .select("onboarded_at")
    .single();
  check(
    "A cannot recovery-insert a row for another user (42501)",
    crossInsert.error !== null && crossInsert.error.code === "42501",
    crossInsert.error ? crossInsert.error.code : "INSERT SUCCEEDED!"
  );

  const delA = await admin.from("profiles").delete().eq("user_id", A.id);
  if (delA.error) throw new Error(`cannot clear A's row: ${delA.error.message}`);
  const ownInsert = await asA
    .from("profiles")
    .insert({ user_id: A.id, ...RECOVERY_PERSONA })
    .select("onboarded_at")
    .single();
  check(
    "recovery insert restores A's OWN missing row, onboarded_at starts null",
    !ownInsert.error && ownInsert.data?.onboarded_at === null,
    ownInsert.error ? ownInsert.error.message : `onboarded_at=${ownInsert.data?.onboarded_at}`
  );

  // 6 — B unharmed, byte for byte
  const after = await admin
    .from("profiles")
    .select("desired_roles, province, cities, remote_preference, seniority, onboarded_at")
    .eq("user_id", B.id)
    .single();
  check(
    "B's persona is unchanged after A's attempts",
    !after.error && JSON.stringify(after.data) === JSON.stringify(B_PERSONA),
    JSON.stringify(after.data)
  );

  // 7 — positive control: RLS filters, it doesn't block the owner
  const own = await asA
    .from("profiles")
    .update({
      desired_roles: ["a-role"],
      province: "ON",
      cities: ["Toronto"],
      remote_preference: "hybrid",
      seniority: "mid",
    })
    .eq("user_id", A.id)
    .select("user_id")
    .single();
  check("positive control: A updates A's own row", !own.error && own.data?.user_id === A.id);
} finally {
  await admin.auth.admin.deleteUser(A.id);
  await admin.auth.admin.deleteUser(B.id);
  await admin.auth.admin.deleteUser(C.id);
}

console.log(
  failures === 0
    ? "\nTWO-ACCOUNT PERSONA PROBE: ALL CHECKS PASS"
    : `\nTWO-ACCOUNT PERSONA PROBE: ${failures} FAILURES — RLS or write path broken`
);
process.exit(failures === 0 ? 0 : 1);
