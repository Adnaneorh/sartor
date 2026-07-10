// GATE 2 (BLOCKING for Phase 1): behavioral two-account RLS test.
// Run AFTER creating + confirming two accounts through the real UI:
//   node scripts/rls-two-account-test.mjs a@example.com passA b@example.com passB
//
// Proves, live and in BOTH directions:
//   positive: each user reads exactly their own profiles row (1 row)
//   negative: cross-account SELECT sees 0 rows; cross-account UPDATE
//             affects 0 rows; INSERT with the other user's id is DENIED.
// Exit 0 only if every one of the 8 checks behaves exactly as designed.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const [emailA, passA, emailB, passB] = process.argv.slice(2);
if (!emailA || !passA || !emailB || !passB) {
  console.error("usage: node scripts/rls-two-account-test.mjs <emailA> <passA> <emailB> <passB>");
  process.exit(2);
}

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)])
);

let failures = 0;
const check = (label, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? " — " + detail : ""}`);
  if (!ok) failures++;
};

async function signedInClient(email, password) {
  const c = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const { data, error } = await c.auth.signInWithPassword({ email, password });
  if (error) {
    console.error(`cannot sign in ${email}: ${error.message}`);
    process.exit(2);
  }
  return { client: c, userId: data.user.id };
}

const A = await signedInClient(emailA, passA);
const B = await signedInClient(emailB, passB);

for (const [me, other, myLabel, otherLabel] of [
  [A, B, "A", "B"],
  [B, A, "B", "A"],
]) {
  const own = await me.client.from("profiles").select("user_id").eq("user_id", me.userId);
  check(`${myLabel} reads own profile`, !own.error && own.data.length === 1);

  const cross = await me.client.from("profiles").select("user_id").eq("user_id", other.userId);
  check(`${myLabel} cannot SELECT ${otherLabel}'s profile`, !cross.error && cross.data.length === 0, `${cross.data?.length ?? "?"} rows`);

  const upd = await me.client
    .from("profiles")
    .update({ full_name: "HACKED" })
    .eq("user_id", other.userId)
    .select();
  check(`${myLabel} cannot UPDATE ${otherLabel}'s profile`, !upd.error && upd.data.length === 0, `${upd.data?.length ?? "?"} rows affected`);

  const ins = await me.client
    .from("profiles")
    .insert({ user_id: other.userId, full_name: "FORGED" });
  check(`${myLabel} cannot INSERT as ${otherLabel}`, ins.error !== null, ins.error?.code ?? "no error!");
}

// Confirm no HACKED/FORGED writes actually landed (paranoia pass)
const verify = await A.client.from("profiles").select("full_name").eq("user_id", A.userId).single();
check("A's profile name unchanged by B's attempts", verify.data?.full_name !== "HACKED");

console.log(failures === 0 ? "\nGATE 2: ALL CHECKS PASS — RLS holds in both directions" : `\nGATE 2: ${failures} FAILURES — RLS boundary broken, DO NOT proceed`);
process.exit(failures === 0 ? 0 : 1);
