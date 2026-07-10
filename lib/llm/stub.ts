import type { CompleteJsonOptions, CompleteJsonResult, LlmProvider } from "./types";
import { LlmOutputInvalidError } from "./types";

// Fixture provider: no network, no key. Powers local dev and automated
// tests; its output is labeled so the UI can show the stub badge (PRD 3.4).
// Fixtures are keyed by a marker in the prompt; unknown prompts get an
// empty-object attempt so schema validation still exercises the boundary.

const FIXTURES: Record<string, unknown> = {
  "smoke-test": { answer: 42, source: "stub-fixture" },
};

export const stubProvider: LlmProvider = {
  name: "stub",
  async completeJson<T>(
    opts: CompleteJsonOptions<T>
  ): Promise<CompleteJsonResult<T>> {
    const key = Object.keys(FIXTURES).find((k) => opts.prompt.includes(k));
    const raw = key !== undefined ? FIXTURES[key] : {};
    const parsed = opts.schema.safeParse(raw);
    if (!parsed.success) {
      throw new LlmOutputInvalidError("stub", parsed.error.message);
    }
    return { data: parsed.data, provider: "stub" };
  },
};
