import type { CompleteJsonResult, LlmProvider } from "./types";

// Hosted frontier-model provider — lands in Phase 5 (needs ANTHROPIC_API_KEY,
// set in the Vercel/Railway dashboards per the secrets protocol). The mode
// exists now so LLM_PROVIDER's contract is complete; using it early fails
// loudly instead of inventing a key (CLAUDE.md "Secrets & API keys").

export const hostedProvider: LlmProvider = {
  name: "hosted",
  async completeJson<T>(): Promise<CompleteJsonResult<T>> {
    throw new Error(
      "LLM_PROVIDER=hosted is a Phase 5 deliverable: requires ANTHROPIC_API_KEY " +
        "in the deployment env. Use stub or ollama for local development."
    );
  },
};
