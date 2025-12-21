import type { ActionFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { EventNames } from "~/lib/anaytics.contants";
import { getSessionData } from "~/utils/auth.utils.server";
import { getAIProviderConfig } from "~/utils/aiProvider.utils.server";
import { logError } from "~/utils/logger.utils.server";
import { recommendRecurringTransactionsWithAI } from "~/modules/recurring/recurring.service";
import { trackEvent } from "~/utils/analytics.utils.server";

export const action: ActionFunction = async ({ request }) => {
  try {
    const sessionData = await getSessionData(request);
    if (sessionData == null || sessionData.userId == null) {
      return redirect("/auth/login");
    }

    const { userId, timezone } = sessionData;

    const aiConfig = await getAIProviderConfig(request);
    if (!aiConfig) {
      return Response.json(
        { error: "AI configuration not found. Please configure AI settings first." },
        { status: 400 }
      );
    }

    const { recommendations, usage } = await recommendRecurringTransactionsWithAI(
      userId,
      timezone,
      aiConfig
    );

    await trackEvent(
      request,
      EventNames.AI_RECOMMEND_RECURRING_TRANSACTIONS,
      {
        inputTokens: usage.inputTokens.toString(),
        outputTokens: usage.outputTokens.toString(),
        totalTokens: usage.totalTokens.toString(),
        model: usage.model,
        recommendationCount: recommendations.length.toString(),
      },
      userId
    );

    return Response.json({ recommendations });
  } catch (error) {
    logError(error);

    if (
      error instanceof Error &&
      error.message.includes("No transaction history found")
    ) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    return Response.json(
      { error: "Failed to generate recommendations. Please try again." },
      { status: 500 }
    );
  }
};
