// Phase 1.3 seed script (ROADMAP 1.3) — rerunnable.
//
// Seeds exactly 50 fictional-company Canadian jobs from scripts/seed-jobs.json
// into public.jobs via the SERVICE-ROLE key (golden rule 1: clients never
// write jobs; this script and the Phase 2 worker are the only writers).
//
// Freshness (rule 14): posted_at is computed AT RUN TIME from each row's
// posted_hours_ago (0–228h, i.e. inside the 10-day window with ≥12h slack),
// so re-running refreshes the deck — that is what makes the seed genuinely
// re-runnable rather than a one-shot fixture that ages out.
//
// Re-run semantics: stable external_ids (seed-001…seed-050) upsert in place
// on (source, external_id); rows whose external_id left the dataset are
// PRUNED first, so renames/renumbers can't strand orphans (audit fix from
// the 1.3 plan review).
//
// SAFETY: this is the first committed script that WRITES with the
// service-role key. It refuses to run unless the Supabase URL is local
// (127.0.0.1 / localhost / ::1). Seeds are LOCAL-ONLY until Phase 5
// (Adnane decision 2026-07-11, option B): --remote exists for the Phase 5
// migration run and demands typed confirmation of the target hostname.
//
// usage: npx tsx scripts/seed-jobs.mts   (requires `supabase start`)

import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { seedJobSchema, UNCATEGORIZED } from "../lib/validation/job";

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

// --- target guard: exact hostname match on the SAME string the client uses
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY; // never NEXT_PUBLIC (rule 8)
if (!supabaseUrl || !serviceRoleKey) {
  console.error("missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(2);
}
const LOCAL_HOSTS = ["127.0.0.1", "localhost", "::1", "[::1]"];
const hostname = new URL(supabaseUrl).hostname;
if (!LOCAL_HOSTS.includes(hostname)) {
  if (!process.argv.includes("--remote")) {
    console.error(
      `refusing to seed non-local Supabase host "${hostname}" — seeds are local-only until Phase 5. Pass --remote only for the Phase 5 run.`
    );
    process.exit(2);
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const typed = await rl.question(
    `about to WRITE seed jobs to REMOTE host "${hostname}" with the service-role key.\ntype the hostname to confirm: `
  );
  rl.close();
  if (typed.trim() !== hostname) {
    console.error("hostname mismatch — aborting.");
    process.exit(2);
  }
}

// --- load + validate the dataset (rule 11: never trust the data file)
const raw = JSON.parse(
  readFileSync(new URL("./seed-jobs.json", import.meta.url), "utf8")
);
const seedJobs = z.array(seedJobSchema).length(50, "the seed dataset must hold exactly 50 jobs").parse(raw);

const ids = new Set(seedJobs.map((j) => j.external_id));
if (ids.size !== 50) {
  console.error("duplicate external_ids in seed-jobs.json");
  process.exit(2);
}

// dedup recipe (must match the jobs migration comment byte-for-byte;
// the Phase 2 worker reimplements the same recipe):
// sha256 hex of lower(company)|lower(title)|coalesce(province,'')|lower(coalesce(city,''))
const dedupHash = (j: (typeof seedJobs)[number]) =>
  createHash("sha256")
    .update(
      `${j.company.toLowerCase()}|${j.title.toLowerCase()}|${j.province ?? ""}|${(j.city ?? "").toLowerCase()}`
    )
    .digest("hex");

const hashes = new Set(seedJobs.map(dedupHash));
if (hashes.size !== 50) {
  console.error("dedup_hash collision inside seed-jobs.json (two rows share company+title+location)");
  process.exit(2);
}
for (let day = 0; day <= 9; day++) {
  if (!seedJobs.some((j) => Math.floor(j.posted_hours_ago / 24) === day)) {
    console.error(`no seed job posted ${day} days ago — the 10-day spread has a hole`);
    process.exit(2);
  }
}

// --- write
const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const now = Date.now();
const rows = seedJobs.map((j) => ({
  source: "seed",
  external_id: j.external_id,
  company: j.company,
  title: j.title,
  province: j.province,
  city: j.city,
  is_remote: j.is_remote,
  logo_url: null, // fictional companies — the UI renders a monogram
  salary_min_cad: j.salary_min_cad,
  salary_max_cad: j.salary_max_cad,
  description: j.description,
  apply_url: j.apply_url,
  apply_mode: "hard", // no ATS API behind a seed — easy would be untrue (PRD 3.2c)
  occupation_category: UNCATEGORIZED, // fixed NOC list arrives in Phase 2
  tags: j.tags,
  posted_at: new Date(now - j.posted_hours_ago * 3_600_000).toISOString(),
  last_seen_at: new Date(now).toISOString(),
  is_active: true,
  is_fresh: true,
  dedup_hash: dedupHash(j),
}));

// prune rows whose external_id left the dataset (PostgREST filter over our
// own /^seed-\d{3}$/-validated constants — no hand-built SQL, rule 7)
const idList = `(${[...ids].join(",")})`;
const { error: pruneErr, count: pruned } = await admin
  .from("jobs")
  .delete({ count: "exact" })
  .eq("source", "seed")
  .not("external_id", "in", idList);
if (pruneErr) {
  console.error(`prune failed: ${pruneErr.message}`);
  process.exit(1);
}
if (pruned) console.log(`pruned ${pruned} seed row(s) no longer in the dataset`);

const { error: upsertErr } = await admin
  .from("jobs")
  .upsert(rows, { onConflict: "source,external_id" });
if (upsertErr) {
  console.error(`upsert failed: ${upsertErr.message}`);
  process.exit(1);
}

// --- post-run assertions (verified against the DB, not our own intent)
const { data: after, error: readErr } = await admin
  .from("jobs")
  .select("external_id, posted_at, is_active, is_fresh")
  .eq("source", "seed");
if (readErr || !after) {
  console.error(`post-run read failed: ${readErr?.message}`);
  process.exit(1);
}
check("exactly 50 seed rows in jobs", after.length === 50, `found ${after.length}`);
const tenDaysAgo = now - 10 * 24 * 3_600_000;
check(
  "every seed posted_at inside the 10-day freshness window (rule 14)",
  after.every((r) => new Date(r.posted_at).getTime() >= tenDaysAgo)
);
check(
  "every seed row is_active AND is_fresh",
  after.every((r) => r.is_active && r.is_fresh)
);

console.log(failures === 0 ? "\nseed-jobs: ALL CHECKS PASSED" : "\nseed-jobs: FAILURES FOUND");
process.exit(failures === 0 ? 0 : 1);
