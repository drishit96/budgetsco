import { ActionFunction } from "@remix-run/node";
import { EventNames } from "~/lib/anaytics.contants";
import { skipRecurringTransaction } from "~/modules/recurring/recurring.service";
import { trackEvent } from "~/utils/analytics.utils.server";
import { getSessionData } from "~/utils/auth.utils.server";
import { logError } from "~/utils/logger.utils.server";
import { isNullOrEmpty } from "~/utils/text.utils";

export let action: ActionFunction = async ({ request }) => {
  try {
    const sessionData = await getSessionData(request);
    if (sessionData == null || sessionData.userId == null) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = sessionData;

    if (request.method !== "POST") {
      return Response.json(
        { success: false, error: "Invalid request method" },
        { status: 405 }
      );
    }

    const body = await request.json();
    const transactionId = body.transactionId;

    if (isNullOrEmpty(transactionId) || typeof transactionId !== "string") {
      return Response.json({ error: "Transaction ID is required" }, { status: 400 });
    }

    const success = await skipRecurringTransaction(userId, transactionId);
    if (!success) {
      return Response.json({ error: "Failed to skip transaction" }, { status: 400 });
    }

    trackEvent(request, EventNames.RECURRING_TRANSACTION_SKIPPED);

    return Response.json({ success: true });
  } catch (error) {
    logError(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
};
