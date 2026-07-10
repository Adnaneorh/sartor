// Smoke test for the LLM provider interface (ROADMAP 0.4 / Phase 0 DoD:
// "Ollama answers a JSON-mode call through the provider interface").
// Run: npx tsx scripts/smoke-llm.mts
//
// Probe 1 — stub: fixture flows through the boundary, schema-validated,
//   labeled provider:"stub".
// Probe 2 — ollama: real qwen2.5 JSON-mode completion through the SAME
//   interface, Zod-validated. Exit 0 only if both behave exactly as designed.
import { readFileSync } from "node:fs";
import { z } from "zod";
import { getLlmProvider } from "../lib/llm";

// scripts run outside Next.js, so load .env.local manually (never committed)
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const i = line.indexOf("=");
  if (i > 0 && !line.startsWith("#")) process.env[line.slice(0, i)] ??= line.slice(i + 1);
}

let failed = false;

// Probe 1: stub
process.env.LLM_PROVIDER = "stub";
const stubSchema = z.object({ answer: z.number(), source: z.string() });
try {
  const r = await getLlmProvider().completeJson({
    prompt: "smoke-test fixture please",
    schema: stubSchema,
  });
  if (r.provider === "stub" && r.data.answer === 42) {
    console.log("SMOKE PASS 1/2: stub fixture through the interface, labeled provider=stub");
  } else {
    console.error("SMOKE FAIL (stub): unexpected result", r);
    failed = true;
  }
} catch (e) {
  console.error("SMOKE FAIL (stub):", e);
  failed = true;
}

// Probe 2: ollama JSON mode
process.env.LLM_PROVIDER = "ollama";
const mathSchema = z.object({
  sum: z.number(),
  even: z.boolean(),
});
try {
  const r = await getLlmProvider().completeJson({
    system: "You are a precise calculator. Reply ONLY with JSON.",
    prompt:
      'Compute 17 + 25. Reply with JSON exactly of the form {"sum": <number>, "even": <true|false>} where "even" says whether the sum is even.',
    schema: mathSchema,
  });
  if (r.provider === "ollama" && r.data.sum === 42 && r.data.even === true) {
    console.log("SMOKE PASS 2/2: ollama (qwen2.5) JSON-mode answer, schema-valid:", JSON.stringify(r.data));
  } else {
    console.error("SMOKE FAIL (ollama): schema-valid but wrong content:", JSON.stringify(r.data));
    failed = true;
  }
} catch (e) {
  console.error("SMOKE FAIL (ollama):", e);
  failed = true;
}

process.exit(failed ? 1 : 0);
