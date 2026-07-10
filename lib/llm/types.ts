import type { ZodType } from "zod";

// AI-LAYER architecture: deterministic skeleton, LLM joints. Every AI call
// in the app goes through this interface — never a model API directly from
// feature code (CLAUDE.md golden rule 6). Output is schema-validated INSIDE
// the boundary (rule 11): callers receive parsed, typed data or an error.

export type LlmProviderName = "stub" | "ollama" | "hosted";

export interface CompleteJsonOptions<T> {
  /** Optional system prompt framing the task. */
  system?: string;
  /** The user prompt. Must instruct the model to answer in JSON. */
  prompt: string;
  /** Zod schema the model's JSON output MUST satisfy. */
  schema: ZodType<T>;
}

export interface CompleteJsonResult<T> {
  data: T;
  /** Which provider produced this — UIs must label stub output (PRD 3.4). */
  provider: LlmProviderName;
}

export interface LlmProvider {
  readonly name: LlmProviderName;
  completeJson<T>(opts: CompleteJsonOptions<T>): Promise<CompleteJsonResult<T>>;
}

export class LlmOutputInvalidError extends Error {
  constructor(provider: LlmProviderName, detail: string) {
    super(`[${provider}] LLM output failed schema validation: ${detail}`);
    this.name = "LlmOutputInvalidError";
  }
}
