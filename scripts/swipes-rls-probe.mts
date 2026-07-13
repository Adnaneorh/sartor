// Phase 1.4 two-account probe — rerunnable. Proves the swipes table's
// RLS + privilege model LIVE (golden rule 1: user-owned table, strictly
// user-scoped; rule 13: tested with two accounts, repeatably).
//
// swipes is a THIRD shape, distinct from both prior templates:
// profiles grants full DML and lets RLS filter (0-rows outcomes);
// jobs grants SELECT only (42501 on every write). swipes grants
// select/insert/delete but NO UPDATE AT ALL (1.4 decision 3: undo =
// delete own row, re-swipe = fresh insert) — so cross-account reads
// and deletes surface as 0 rows, a forged-user insert as 42501
// (with-check), and ANY update as 42501 (privilege layer).
//
//   1. A INSERT own swipe succeeds (positive control)
//   2. A duplicate swipe on the same job → exactly 23505 (unique user+job)
//   3. B SELECT sees zero swipes (cannot read A's)
//   4. B INSERT forging user_id = A → exactly 42501 (with-check denial)
//   5. B UPDATE targeting A's swipe → exactly 42501 (no UPDATE grant)
//   6. B DELETE targeting A's swipe → 0 rows; A's row intact (service-role verify)
//   7. B INSERT own swipe on the SAME job succeeds (unique is per user+job)
//   8. A undo (DELETE own) removes exactly 1 row; re-swipe after undo succeeds
//   9. anon SELECT → exactly 42501 (anon gets NOTHING)
//  10. service-role sees exactly the expected final state (ground truth)
//
// Tester-tested (CLAUDE.md): --simulate-hole runs B's cross-account legs
// (3–6) with the service-role client — a stand-in for broken RLS/grants —
// and the probe must then FAIL, proving it can detect a leaky-swipes hole.
//
// usage: npx tsx scripts/swipes-rls-probe.mts          (requires seed-jobs.mts run)
//        npx tsx scripts/swipes-rls-probe.mts --simulate-hole   (must FAIL)

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

const mintUser = async (tag: string) => {
  const email = `swipes-probe-${tag}-${randomUUID()}@probe.local`;
  const password = `Probe-${randomUUID()}`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `Swipes Probe ${tag}`, age_confirmed: true },
  });
  if (error) {
    console.error(`cannot mint probe user ${tag}: ${error.message}`);
    process.exit(2);
  }
  return { id: data.user.id, email, password };
};

const A = await mintUser("A");
const B = await mintUser("B");

try {
  const signIn = async (u: { email: string; password: string }, tag: string) => {
    const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const { error } = await client.auth.signInWithPassword({
      email: u.email,
      password: u.password,
    });
    // throw (not process.exit) so finally still deletes the probe users
    if (error) throw new Error(`cannot sign in probe user ${tag}: ${error.message}`);
    return client;
  };
  const asA = await signIn(A, "A");
  const asB = await signIn(B, "B");

  // two real seed jobs: job1 carries A's swipe; job2 is a clean target
  // for the forged insert (same-job would 23505 and MASK a hole)
  const { data: jobs, error: jobsErr } = await asA
    .from("jobs")
    .select("id")
    .eq("source", "seed")
    .limit(2);
  if (jobsErr || !jobs || jobs.length < 2) {
    throw new Error(`need 2 seed jobs (run seed-jobs.mts first): ${jobsErr?.message ?? "too few rows"}`);
  }
  const [job1, job2] = jobs.map((j) => j.id);

  // the client whose cross-account legs we EXPECT to be denied;
  // --simulate-hole swaps in the service-role client, which the
  // checks below must then flag as failures
  const attacker = SIMULATE_HOLE ? admin : asB;

  // 1. positive control: A records their own swipe
  const { error: ownInsErr } = await asA
    .from("swipes")
    .insert({ user_id: A.id, job_id: job1, direction: "right" });
  check("A INSERT own swipe succeeds", !ownInsErr, ownInsErr?.message);

  // 2. one decision per user per job (PRD 3.2)
  const { error: dupErr } = await asA
    .from("swipes")
    .insert({ user_id: A.id, job_id: job1, direction: "left" });
  check(
    "A duplicate swipe on same job denied with exactly 23505",
    dupErr?.code === "23505",
    dupErr ? `code ${dupErr.code}` : "DUPLICATE INSERT SUCCEEDED!"
  );

  // 3. B cannot read A's swipes (RLS filters to zero rows)
  const { data: bSees, error: bSelErr } = await attacker
    .from("swipes")
    .select("id, user_id")
    .eq("user_id", A.id);
  check(
    "B SELECT of A's swipes returns zero rows",
    !bSelErr && bSees?.length === 0,
    bSelErr ? bSelErr.message : `saw ${bSees?.length}`
  );

  // 4. B cannot forge a swipe AS A (insert_own with-check → 42501)
  const { error: forgeErr } = await attacker
    .from("swipes")
    .insert({ user_id: A.id, job_id: job2, direction: "right" });
  check(
    "B INSERT forging user_id=A denied with exactly 42501",
    forgeErr?.code === "42501",
    forgeErr ? `code ${forgeErr.code}` : "FORGED INSERT SUCCEEDED!"
  );

  // 5. NO update path exists for any client (1.4 decision 3): denial is
  // at the privilege layer, so 42501 — not a silent 0-rows match
  const { error: updErr } = await attacker
    .from("swipes")
    .update({ direction: "left" })
    .eq("user_id", A.id);
  check(
    "B UPDATE targeting A's swipe denied with exactly 42501 (no UPDATE grant)",
    updErr?.code === "42501",
    updErr ? `code ${updErr.code}` : "UPDATE SUCCEEDED!"
  );

  // 6. B cannot delete A's swipe (RLS: 0 rows), and the row survives
  const { error: bDelErr, count: bDeleted } = await attacker
    .from("swipes")
    .delete({ count: "exact" })
    .eq("user_id", A.id);
  const { data: intact } = await admin
    .from("swipes")
    .select("direction")
    .eq("user_id", A.id)
    .eq("job_id", job1)
    .single();
  check(
    "B DELETE targeting A's swipe matches 0 rows and A's row is intact",
    !bDelErr && bDeleted === 0 && intact?.direction === "right",
    bDelErr?.message ?? `deleted ${bDeleted}, row ${intact ? "intact" : "GONE"}`
  );

  // 7. unique is per user+job: B swiping the SAME job is fine
  const { error: bOwnErr } = await asB
    .from("swipes")
    .insert({ user_id: B.id, job_id: job1, direction: "right" });
  check("B INSERT own swipe on the same job succeeds", !bOwnErr, bOwnErr?.message);

  // 8. undo = delete own row, then re-swipe is a fresh insert
  const { error: undoErr, count: undone } = await asA
    .from("swipes")
    .delete({ count: "exact" })
    .eq("user_id", A.id)
    .eq("job_id", job1);
  const { error: reswipeErr } = await asA
    .from("swipes")
    .insert({ user_id: A.id, job_id: job1, direction: "left" });
  check(
    "A undo removes exactly 1 row and re-swipe succeeds",
    !undoErr && undone === 1 && !reswipeErr,
    undoErr?.message ?? reswipeErr?.message ?? `deleted ${undone}`
  );

  // 9. anon gets NOTHING — denied at the privilege layer
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const { error: anonErr } = await anon.from("swipes").select("id").limit(1);
  check(
    "anon SELECT denied with exactly 42501",
    anonErr?.code === "42501",
    anonErr ? `code ${anonErr.code}` : "anon READ SUCCEEDED!"
  );

  // 10. ground truth: exactly A(job1,left) + B(job1,right) exist
  const { data: truth } = await admin
    .from("swipes")
    .select("user_id, job_id, direction")
    .in("user_id", [A.id, B.id]);
  const finalOk =
    truth?.length === 2 &&
    truth.some((s) => s.user_id === A.id && s.job_id === job1 && s.direction === "left") &&
    truth.some((s) => s.user_id === B.id && s.job_id === job1 && s.direction === "right");
  check(
    "service-role ground truth matches expected final state",
    !!finalOk,
    `found ${truth?.length} row(s)`
  );
} finally {
  // deleting the users cascades their swipes; explicit delete is belt+suspenders
  await admin.from("swipes").delete().in("user_id", [A.id, B.id]);
  await admin.auth.admin.deleteUser(A.id);
  await admin.auth.admin.deleteUser(B.id);
}

if (SIMULATE_HOLE) {
  console.log(
    failures > 0
      ? "\nswipes-rls-probe (--simulate-hole): checks FAILED as expected — the probe detects a leaky-swipes hole"
      : "\nswipes-rls-probe (--simulate-hole): checks PASSED — the probe CANNOT detect a hole, fix the probe"
  );
  // in simulate-hole mode, failures are the desired outcome
  process.exit(failures > 0 ? 0 : 1);
}
console.log(failures === 0 ? "\nswipes-rls-probe: ALL CHECKS PASSED" : "\nswipes-rls-probe: FAILURES FOUND");
process.exit(failures === 0 ? 0 : 1);
