import { createCookie } from "@remix-run/node";
import type { AIProviderConfig } from "~/modules/ai/aiProvider.schema";

export function getAIProviderCookieBuilder() {
  const cookieOptions: any = {
    expires: new Date(Date.now() + 31_536_000_000), // 1 year
    httpOnly: true,
    maxAge: 31_536_000,
    path: "/",
    sameSite: "strict",
    secrets: [process.env.COOKIE_SECRET!],
    secure: true,
  };

  // Temp fix for webkit based browsers not able to set cookie
  // with sameSite: "strict" and secure: true options in localhost
  if (process.env.NODE_ENV !== "production") {
    delete cookieOptions.sameSite;
    delete cookieOptions.secure;
  }

  return createCookie("aiProvider", cookieOptions);
}

export async function getAIProviderConfig(
  request: Request
): Promise<AIProviderConfig | null> {
  try {
    const config: AIProviderConfig = await getAIProviderCookieBuilder().parse(
      request.headers.get("Cookie")
    );
    return config;
  } catch (error) {
    return null;
  }
}

export async function setAIProviderConfig(config: AIProviderConfig): Promise<string> {
  return getAIProviderCookieBuilder().serialize(config);
}

export async function clearAIProviderConfig(): Promise<string> {
  return getAIProviderCookieBuilder().serialize("", {
    expires: new Date("1970-01-01"),
  });
}
