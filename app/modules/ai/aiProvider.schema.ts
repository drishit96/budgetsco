import { z } from "zod";
import { safeParseObjectToSchema } from "~/utils/schema.utils";

export function isSafePublicUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    if (url.protocol !== "https:") return false;
    let hostname = url.hostname.toLowerCase();
    if (hostname.startsWith("[") && hostname.endsWith("]")) {
      hostname = hostname.slice(1, -1);
    }
    if (hostname === "::" || hostname === "0.0.0.0") return false;

    if (hostname.startsWith("::ffff:")) {
      const rest = hostname.slice(7);
      if (rest.includes(".")) {
        hostname = rest;
      } else {
        const parts = rest.split(":");
        if (parts.length === 2) {
          const high = parseInt(parts[0], 16);
          const low = parseInt(parts[1], 16);
          if (!isNaN(high) && !isNaN(low)) {
            hostname = `${high >> 8}.${high & 0xff}.${low >> 8}.${low & 0xff}`;
          }
        }
      }
    }

    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.startsWith("127.") ||
      hostname === "::1" ||
      hostname === "0.0.0.0" ||
      hostname === "255.255.255.255" ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal") ||
      hostname.endsWith(".lan") ||
      hostname.endsWith(".home.arpa") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("192.168.") ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname) ||
      hostname.startsWith("169.254.") ||
      hostname.startsWith("fc") ||
      hostname.startsWith("fd") ||
      hostname.startsWith("fe80")
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

const aiProviderConfigInput = {
  apiKey: z.string().min(1, "API key is required"),
  baseUrl: z
    .url("Base URL must be a valid URL")
    .refine(isSafePublicUrl, {
      message: "Base URL must use HTTPS and point to a public endpoint",
    }),
  model: z.string().min(1, "Model is required"),
};

export const AIProviderConfigSchema = z.compile(z.object(aiProviderConfigInput));

export type AIProviderConfig = z.infer<typeof AIProviderConfigSchema>;

export function parseAIProviderConfig(config: unknown) {
  return safeParseObjectToSchema(config, AIProviderConfigSchema);
}
