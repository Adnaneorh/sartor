import type { LlmProvider, LlmProviderName } from "./types";
import { stubProvider } from "./stub";
import { ollamaProvider } from "./ollama";
import { hostedProvider } from "./hosted";

// SERVER-SIDE ONLY: providers read non-NEXT_PUBLIC env and (in Phase 5) a
// secret key. Never import from client components — LLM calls happen in API
// routes / server actions (AI-LAYER: app → AI → guards → data).

const PROVIDERS: Record<LlmProviderName, LlmProvider> = {
  stub: stubProvider,
  ollama: ollamaProvider,
  hosted: hostedProvider,
};

export function getLlmProvider(): LlmProvider {
  const mode = process.env.LLM_PROVIDER ?? "stub";
  const provider = PROVIDERS[mode as LlmProviderName];
  if (!provider) {
    throw new Error(
      `Unknown LLM_PROVIDER "${mode}" — expected stub | ollama | hosted`
    );
  }
  return provider;
}

export type { LlmProvider, CompleteJsonOptions, CompleteJsonResult } from "./types";
export { LlmOutputInvalidError } from "./types";
