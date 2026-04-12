import OpenAI from "openai";

/**
 * OpenAI SDK client — works with OpenAI or compatible APIs (e.g. NVIDIA Integrate).
 * Set `OPENAI_BASE_URL` (e.g. https://integrate.api.nvidia.com/v1) and `OPENAI_API_KEY`.
 */
export function createOpenAICompatibleClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  const baseURL = process.env.OPENAI_BASE_URL?.trim();
  return new OpenAI({
    apiKey,
    ...(baseURL ? { baseURL } : {}),
  });
}

export function getMealLlmModel(): string {
  const fromEnv = process.env.OPENAI_MEAL_MODEL?.trim();
  if (fromEnv) return fromEnv;
  const base = process.env.OPENAI_BASE_URL?.trim() ?? "";
  if (base.includes("nvidia.com")) {
    return "mistralai/devstral-2-123b-instruct-2512";
  }
  return "gpt-4o-mini";
}

/**
 * OpenAI supports `response_format: { type: "json_object" }` natively.
 * Many compatible APIs (e.g. NVIDIA) return 400 if this field is sent — omit unless opted in.
 */
export function shouldUseJsonObjectResponseFormat(): boolean {
  if (process.env.OPENAI_RESPONSE_JSON_OBJECT === "true") return true;
  if (process.env.OPENAI_RESPONSE_JSON_OBJECT === "false") return false;
  return !process.env.OPENAI_BASE_URL?.trim();
}

export function getLlmSamplingParams(): {
  temperature: number;
  top_p: number;
  max_tokens: number;
  seed?: number;
} {
  const temperature = Number(process.env.OPENAI_TEMPERATURE ?? 0.15);
  const top_p = Number(process.env.OPENAI_TOP_P ?? 0.95);
  const max_tokens = Number(process.env.OPENAI_MAX_TOKENS ?? 8192);
  const seedRaw = process.env.OPENAI_SEED?.trim();
  const seed =
    seedRaw !== undefined && seedRaw !== "" && Number.isFinite(Number(seedRaw))
      ? Number(seedRaw)
      : undefined;
  return {
    temperature: Number.isFinite(temperature) ? temperature : 0.15,
    top_p: Number.isFinite(top_p) ? top_p : 0.95,
    max_tokens: Number.isFinite(max_tokens) ? max_tokens : 8192,
    ...(seed !== undefined ? { seed } : {}),
  };
}
