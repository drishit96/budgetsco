import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateObject } from "ai";
import { z } from "zod";

export interface AIProviderConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface AIUsageData {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  model: string;
}

export interface GenerateObjectResult<T> {
  object: T;
  usage: AIUsageData;
}

export async function generateStructuredObject<T extends z.ZodTypeAny>(
  aiConfig: AIProviderConfig,
  schema: T,
  prompt: string,
  temperature: number = 0.3
): Promise<GenerateObjectResult<z.infer<T>>> {
  const openai = createOpenAICompatible({
    name: "customOpenai",
    baseURL: aiConfig.baseUrl,
    apiKey: aiConfig.apiKey,
    supportsStructuredOutputs: true,
    includeUsage: true,
  });

  const model = openai(aiConfig.model);

  const { object: generatedObject, usage } = await generateObject({
    model,
    schema,
    mode: "json",
    prompt,
    temperature,
  });

  return {
    object: generatedObject as z.infer<T>,
    usage: {
      inputTokens: usage?.inputTokens ?? 0,
      outputTokens: usage?.outputTokens ?? 0,
      totalTokens: usage?.totalTokens ?? 0,
      model: aiConfig.model,
    },
  };
}
