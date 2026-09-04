import { z } from "zod";
import { safeParseObjectToSchema } from "~/utils/schema.utils";

const aiProviderConfigInput = {
  apiKey: z.string().min(1, "API key is required"),
  baseUrl: z.url("Base URL must be a valid URL"),
  model: z.string().min(1, "Model is required"),
};

export const AIProviderConfigSchema = z.compile(z.object(aiProviderConfigInput));

export type AIProviderConfig = z.infer<typeof AIProviderConfigSchema>;

export function parseAIProviderConfig(config: unknown) {
  return safeParseObjectToSchema(config, AIProviderConfigSchema);
}
