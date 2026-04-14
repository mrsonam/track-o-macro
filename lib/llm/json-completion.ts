import type OpenAI from "openai";
import type { z } from "zod";
import { shouldUseJsonObjectResponseFormat } from "@/lib/llm/openai-compatible-client";

function extractJsonBlob(text: string): string {
  const t = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(t);
  if (fence) return fence[1]!.trim();
  return t;
}

/**
 * Chat completion with JSON object response, then Zod validation.
 * Compatible with OpenAI and many OpenAI-compatible providers (e.g. NVIDIA).
 */
function isLikelyUnsupportedJsonFormatError(e: unknown): boolean {
  if (e && typeof e === "object" && "status" in e) {
    const s = (e as { status?: number }).status;
    if (s === 400) return true;
  }
  const msg = e instanceof Error ? e.message : String(e);
  return /response_format|json_object/i.test(msg);
}

async function createChatCompletion(
  openai: OpenAI,
  params: {
    model: string;
    messages: OpenAI.ChatCompletionMessageParam[];
    sampling: {
      temperature: number;
      top_p: number;
      max_tokens: number;
      seed?: number;
    };
    responseJsonObject: boolean;
  },
) {
  const { model, messages, sampling, responseJsonObject } = params;
  return openai.chat.completions.create({
    model,
    messages,
    ...(responseJsonObject
      ? { response_format: { type: "json_object" as const } }
      : {}),
    temperature: sampling.temperature,
    top_p: sampling.top_p,
    max_tokens: sampling.max_tokens,
    ...(sampling.seed !== undefined ? { seed: sampling.seed } : {}),
  });
}

export async function chatJsonCompletion<T extends z.ZodTypeAny>(options: {
  openai: OpenAI;
  model: string;
  messages: OpenAI.ChatCompletionMessageParam[];
  schema: T;
  sampling: {
    temperature: number;
    top_p: number;
    max_tokens: number;
    seed?: number;
  };
}): Promise<z.infer<T>> {
  const { openai, model, messages, schema, sampling } = options;

  const useJsonFormat = shouldUseJsonObjectResponseFormat();
  let completion: OpenAI.Chat.ChatCompletion;

  try {
    completion = await createChatCompletion(openai, {
      model,
      messages,
      sampling,
      responseJsonObject: useJsonFormat,
    });
  } catch (e) {
    if (useJsonFormat && isLikelyUnsupportedJsonFormatError(e)) {
      completion = await createChatCompletion(openai, {
        model,
        messages,
        sampling,
        responseJsonObject: false,
      });
    } else {
      throw e;
    }
  }

  const content = completion.choices[0]?.message?.content;
  if (!content?.trim()) {
    throw new Error("LLM returned empty content");
  }

  let data: unknown;
  try {
    data = JSON.parse(extractJsonBlob(content));
  } catch {
    throw new Error("LLM returned non-JSON output");
  }

  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new Error(
      `LLM JSON did not match schema: ${parsed.error.message.slice(0, 500)}`,
    );
  }
  return parsed.data;
}
