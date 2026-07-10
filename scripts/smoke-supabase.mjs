// Smoke test: the app's env + client wiring can reach the local Supabase
// stack (ROADMAP 0.3 "confirm app connects"). Run: node scripts/smoke-supabase.mjs
//
// Two probes, both must behave exactly as designed for exit 0:
//   1. service_role: SELECT succeeds with 0 rows → connection + table + API up.
//   2. anon: SELECT is DENIED (42501) → profiles has no anon grant at all —
//      logged-out clients are rejected at the privilege layer (golden rule 1).
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)])
);

let failed = false;

const service = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);
const svc = await service.from("profiles").select("user_id");
if (svc.error) {
  console.error("SMOKE FAIL (service_role):", svc.error.message);
  failed = true;
} else if (svc.data.length !== 0) {
  console.error(`SMOKE FAIL (service_role): expected empty table, got ${svc.data.length} rows`);
  failed = true;
} else {
  console.log("SMOKE PASS 1/2: service_role connected; profiles reachable (0 rows)");
}

const anon = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
const an = await anon.from("profiles").select("user_id");
if (an.error && an.error.code === "42501") {
  console.log("SMOKE PASS 2/2: anon denied at privilege layer (42501) — as designed");
} else if (an.error) {
  console.error("SMOKE FAIL (anon): unexpected error:", an.error.code, an.error.message);
  failed = true;
} else {
  console.error("SMOKE FAIL (anon): expected permission denied, got data:", an.data.length, "rows");
  failed = true;
}

process.exit(failed ? 1 : 0);
