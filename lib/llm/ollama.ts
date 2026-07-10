import type { CompleteJsonOptions, CompleteJsonResult, LlmProvider } from "./types";
import { LlmOutputInvalidError } from "./types";

// Local Ollama provider (free, offline dev). JSON mode via format:"json" —
// the model is constrained to emit valid JSON; the Zod schema then decides
// whether that JSON is the RIGHT shape (rule 11: validate at the boundary).
// No key needed: OLLAMA_BASE_URL + OLLAMA_MODEL from env (.env.example).

const BASE_URL = () => process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const MODEL = () => process.env.OLLAMA_MODEL ?? "qwen2.5:7b";
// A hung Ollama must fail loudly, never block a pipeline (audit #3 finding 4).
// 120s covers cold model load + generation on the 7b with headroom.
const TIMEOUT_MS = 120_000;

export const ollamaProvider: LlmProvider = {
  name: "ollama",
  async completeJson<T>(
    opts: CompleteJsonOptions<T>
  ): Promise<CompleteJsonResult<T>> {
    let res: Response;
    try {
      res = await fetch(`${BASE_URL()}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
        body: JSON.stringify({
          model: MODEL(),
          format: "json",
          stream: false,
          messages: [
            ...(opts.system ? [{ role: "system", content: opts.system }] : []),
            { role: "user", content: opts.prompt },
          ],
        }),
      });
    } catch (e) {
      if (e instanceof DOMException && e.name === "TimeoutError") {
        throw new Error(
          `Ollama did not respond within ${TIMEOUT_MS / 1000}s (model ${MODEL()} at ${BASE_URL()}) — is the server hung?`
        );
      }
      throw e;
    }
    if (!res.ok) {
      throw new Error(`Ollama request failed: ${res.status} ${await res.text()}`);
    }
    const body = (await res.json()) as { message?: { content?: string } };
    const content = body.message?.content;
    if (!content) {
      throw new LlmOutputInvalidError("ollama", "empty completion");
    }
    let raw: unknown;
    try {
      raw = JSON.parse(content);
    } catch {
      throw new LlmOutputInvalidError("ollama", "completion is not valid JSON");
    }
    const parsed = opts.schema.safeParse(raw);
    if (!parsed.success) {
      throw new LlmOutputInvalidError("ollama", parsed.error.message);
    }
    return { data: parsed.data, provider: "ollama" };
  },
};
