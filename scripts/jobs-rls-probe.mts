// Phase 1.3 behavioral probe — rerunnable. Proves the jobs table's
// privilege + RLS model LIVE (golden rule 1: shared reference table,
// read-only for authenticated, writes only via service-role).
//
// DELIBERATELY different expectations from rls-two-account-test.mjs:
// profiles GRANTS authenticated its DML and lets RLS filter rows, so
// cross-account writes there show up as "0 rows affected". jobs grants
// authenticated SELECT ONLY, so every write dies at the privilege layer
// with SQLSTATE 42501 before RLS is consulted. Future shared-table probes
// should copy THIS template, not the profiles one.
//
//   1. authenticated SELECT sees all 50 seed rows (shared read)
//   2. authenticated INSERT  → exactly 42501 (privilege denial)
//   3. authenticated UPDATE  → exactly 42501
//   4. authenticated DELETE  → exactly 42501
//   5. anon (no session) SELECT → exactly 42501 (anon gets NOTHING)
//   6. service-role write + delete positive control
//
// Tester-tested (CLAUDE.md): --simulate-hole runs the write legs with the
// service-role client (a stand-in for a mistakenly-granted client) — the
// probe must then FAIL, proving it detects a writable-jobs hole.
//
// usage: npx tsx scripts/jobs-rls-probe.mts          (after seed-jobs.mts)
//        npx tsx scripts/jobs-rls-probe.mts --simulate-hole   (must FAIL)

import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)])
);

const SIMULATE_HOLE = process.argv.includes("--simulate-hole");

let failures = 0;
const check = (label: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? " — " + detail : ""}`);
  if (!ok) failures++;
};

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const email = `jobs-probe-${randomUUID()}@probe.local`;
const password = `Probe-${randomUUID()}`;
const { data: created, error: createErr } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: "Jobs Probe", age_confirmed: true },
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

  // the client whose writes we EXPECT to be denied; --simulate-hole swaps
  // in the service-role client, which the checks below must then flag
  const attacker = SIMULATE_HOLE ? admin : me;

  // 1. shared read: every authenticated user sees the whole deck
  const { data: readable, error: selErr } = await me
    .from("jobs")
    .select("id, external_id")
    .eq("source", "seed");
  check(
    "authenticated SELECT sees all 50 seed jobs",
    !selErr && readable?.length === 50,
    selErr ? selErr.message : `saw ${readable?.length}`
  );
  const victimId = readable?.[0]?.id;

  // 2. INSERT denied at the privilege layer
  const { error: insErr } = await attacker.from("jobs").insert({
    source: "probe",
    external_id: `probe-${randomUUID()}`,
    company: "Probe Co",
    title: "Probe Title",
    description: "probe",
    apply_url: "https://probe.example/j",
    posted_at: new Date().toISOString(),
    dedup_hash: randomUUID(),
  });
  check(
    "authenticated INSERT denied with exactly 42501",
    insErr?.code === "42501",
    insErr ? `code ${insErr.code}` : "INSERT SUCCEEDED!"
  );

  // 3. UPDATE denied at the privilege layer
  const { error: updErr } = await attacker
    .from("jobs")
    .update({ title: "hijacked" })
    .eq("id", victimId ?? randomUUID());
  check(
    "authenticated UPDATE denied with exactly 42501",
    updErr?.code === "42501",
    updErr ? `code ${updErr.code}` : "UPDATE SUCCEEDED!"
  );

  // 4. DELETE denied at the privilege layer
  const { error: delErr } = await attacker
    .from("jobs")
    .delete()
    .eq("id", victimId ?? randomUUID());
  check(
    "authenticated DELETE denied with exactly 42501",
    delErr?.code === "42501",
    delErr ? `code ${delErr.code}` : "DELETE SUCCEEDED!"
  );

  // undo any damage the simulated hole did (title restore is enough: the
  // simulated UPDATE is the only mutating leg that can land on seed rows)
  if (SIMULATE_HOLE && victimId) {
    const { data: victim } = await admin.from("jobs").select("external_id, title").eq("id", victimId).single();
    if (victim?.title === "hijacked") {
      console.log(`(simulate-hole cleanup: re-run seed-jobs.mts to restore "${victim.external_id}")`);
    }
  }

  // 5. anon gets NOTHING — not even reads
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const { error: anonErr } = await anon.from("jobs").select("id").limit(1);
  check(
    "anon SELECT denied with exactly 42501",
    anonErr?.code === "42501",
    anonErr ? `code ${anonErr.code}` : "anon READ SUCCEEDED!"
  );

  // 6. positive control: service-role writes work (the worker's path)
  const controlId = `probe-${randomUUID()}`;
  const { error: ctlInsErr } = await admin.from("jobs").insert({
    source: "probe",
    external_id: controlId,
    company: "Control Co",
    title: "Service-Role Control",
    description: "service-role positive control row",
    apply_url: "https://control.probe.example/j",
    posted_at: new Date().toISOString(),
    dedup_hash: `control-${randomUUID()}`,
  });
  const { error: ctlDelErr, count: ctlDeleted } = await admin
    .from("jobs")
    .delete({ count: "exact" })
    .eq("source", "probe")
    .eq("external_id", controlId);
  check(
    "service-role INSERT + DELETE positive control",
    !ctlInsErr && !ctlDelErr && ctlDeleted === 1,
    ctlInsErr?.message ?? ctlDelErr?.message ?? `deleted ${ctlDeleted}`
  );
} finally {
  // remove any probe-source rows (incl. the insert --simulate-hole lands)
  await admin.from("jobs").delete().eq("source", "probe");
  await admin.auth.admin.deleteUser(userId);
}

if (SIMULATE_HOLE) {
  console.log(
    failures > 0
      ? "\njobs-rls-probe (--simulate-hole): checks FAILED as expected — the probe detects a writable-jobs hole"
      : "\njobs-rls-probe (--simulate-hole): checks PASSED — the probe CANNOT detect a hole, fix the probe"
  );
  // in simulate-hole mode, failures are the desired outcome
  process.exit(failures > 0 ? 0 : 1);
}
console.log(failures === 0 ? "\njobs-rls-probe: ALL CHECKS PASSED" : "\njobs-rls-probe: FAILURES FOUND");
process.exit(failures === 0 ? 0 : 1);
