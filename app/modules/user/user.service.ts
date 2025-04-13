import { DBErrorDescriptions, DBErrors } from "~/lib/error.constant";
import { logError } from "~/utils/logger.utils.server";
import prisma from "../../lib/prisma";
import { isNullOrEmpty } from "~/utils/text.utils";

export async function createUser(id: string, emailId: string) {
  try {
    await prisma.user.create({
      data: {
        id,
        emailId,
      },
    });
    return { success: true };
  } catch (error: any) {
    logError(error);
    if (error.code === DBErrors.P2002) {
      return {
        success: false,
        error: DBErrorDescriptions.P2002_DUPLICATE_EMAIL,
      };
    }
    return { success: false, error: DBErrorDescriptions.UNKNOWN };
  }
}

export async function saveNotificationToken(userId: string, notificationToken: string) {
  try {
    await prisma.notificationToken.create({
      data: {
        userId,
        token: notificationToken,
      },
    });
    return true;
  } catch (error) {
    return false;
  }
}

export async function getNotificationTokens(userIds: string[]) {
  try {
    if (userIds == null || userIds.length == 0) return [];
    const notificationTokens = await prisma.notificationToken.findMany({
      where: { userId: { in: userIds } },
    });
    return notificationTokens;
  } catch (error) {
    logError(error);
    return [];
  }
}

export async function deleteInvalidTokens(tokens: string[]) {
  try {
    const { count: deletedCount } = await prisma.notificationToken.deleteMany({
      where: { token: { in: tokens } },
    });
    return deletedCount;
  } catch (error) {
    logError(error);
    return 0;
  }
}

export type ChallengeAction = "login" | "register";
type TurnstileResponse = {
  success: boolean;
  challenge_ts: string;
  hostname: string;
  "error-codes": [
    | "missing-input-secret"
    | "invalid-input-secret"
    | "missing-input-response"
    | "invalid-input-response"
    | "bad-request"
    | "timeout-or-duplicate"
    | "internal-error"
  ];
  action: ChallengeAction;
  cdata: string;
};

export async function validateChallengeResponse(
  token: string | undefined,
  action: ChallengeAction
) {
  try {
    if (process.env.NODE_ENV !== "production") return true;

    if (isNullOrEmpty(token)) return false;

    let formData = new FormData();
    formData.append("secret", process.env.TURNSTILE_SECRET_KEY!);
    formData.append("response", token);

    const url = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
    const result = await fetch(url, {
      body: formData,
      method: "POST",
    });

    const outcome: TurnstileResponse = await result.json();
    if (outcome.success) {
      if (outcome.action === action) return true;
      throw new Error("Turnstile action mismatch for: " + JSON.stringify(outcome));
    }
    if (outcome.success === false && outcome["error-codes"][0] === "internal-error") {
      throw new Error("Turnstile validation error for: " + JSON.stringify(outcome));
    }
    return outcome.success;
  } catch (error) {
    logError(error);
    return false;
  }
}
