import type { CompleteJsonOptions, CompleteJsonResult, LlmProvider } from "./types";
import { LlmOutputInvalidError } from "./types";

// Local Ollama provider (free, offline dev). JSON mode via format:"json" —
// the model is constrained to emit valid JSON; the Zod schema then decides
// whether that JSON is the RIGHT shape (rule 11: validate at the boundary).
// No key needed: OLLAMA_BASE_URL + OLLAMA_MODEL from env (.env.example).

const BASE_URL = () => process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const MODEL = () => process.env.OLLAMA_MODEL ?? "qwen2.5:7b";

export const ollamaProvider: LlmProvider = {
  name: "ollama",
  async completeJson<T>(
    opts: CompleteJsonOptions<T>
  ): Promise<CompleteJsonResult<T>> {
    const res = await fetch(`${BASE_URL()}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
