// Audit #4 finding 1 (open redirect) — behavioral probe, rerunnable.
// Proves the auth confirmation route never redirects off-origin: each probe
// mints a REAL single-use token_hash via the admin API (local Supabase),
// hits the live route on the dev server, and inspects the Location header.
//
//   next=https://evil.example  → must land on /home  (was: evil.example)
//   next=//evil.example        → must land on /home  (was: evil.example)
//   next=/check-inbox (legit)  → must land on /check-inbox
//
// RE-RUN when Google OAuth lands: /auth/callback shares safeRedirectPath(),
// but its success path can only be exercised by a real OAuth flow — proof
// beats inheritance (see ROADMAP 1.1 follow-up gate).
//
// usage: node scripts/open-redirect-probe.mjs
//        (requires: `npm run dev` on :3010 + `supabase start` running)
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const APP = "http://localhost:3010";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)])
);

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const PROBES = [
  ["absolute URL", "https://evil.example", "/home"],
  ["protocol-relative", "//evil.example", "/home"],
  ["legit path", "/check-inbox", "/check-inbox"],
];

let failures = 0;
for (const [label, next, want] of PROBES) {
  const email = `redirect-probe-${randomUUID()}@probe.local`;
  const { data, error } = await admin.auth.admin.generateLink({
    type: "signup",
    email,
    password: `Probe-${randomUUID()}`,
  });
  if (error) {
    console.error(`cannot mint token for probe "${label}": ${error.message}`);
    process.exit(2);
  }

  const url = `${APP}/auth/confirm?token_hash=${data.properties.hashed_token}&type=signup&next=${encodeURIComponent(next)}`;
  const res = await fetch(url, { redirect: "manual" });
  const location = res.headers.get("location") ?? "(no Location header)";
  const wantAbs = new URL(want, APP).href;
  const ok = res.status >= 300 && res.status < 400 && location === wantAbs;
  console.log(`${ok ? "PASS" : "FAIL"}  next=${next} → ${location}${ok ? "" : ` (wanted ${wantAbs}, status ${res.status})`}`);
  if (!ok) failures++;

  await admin.auth.admin.deleteUser(data.user.id);
}

console.log(
  failures === 0
    ? "\nOPEN-REDIRECT PROBE: ALL PASS — next never escapes the origin"
    : `\nOPEN-REDIRECT PROBE: ${failures} FAILURES — redirect boundary broken`
);
process.exit(failures === 0 ? 0 : 1);
