import type { ActionFunction } from "@remix-run/node";
import { EventNames } from "~/lib/anaytics.contants";
import { removeTransaction } from "~/modules/transaction/transaction.service";
import { getSessionData } from "~/utils/auth.utils.server";
import { trackEvent } from "~/utils/analytics.utils.server";
import { isNullOrEmpty } from "~/utils/text.utils";
import { logError } from "~/utils/logger.utils.server";

export const action: ActionFunction = async ({ request }) => {
  try {
    const sessionData = await getSessionData(request);
    if (sessionData == null || sessionData.userId == null) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId, timezone } = sessionData;

    if (request.method !== "DELETE") {
      return Response.json(
        { success: false, error: "Invalid request method" },
        { status: 405 }
      );
    }

    const urlSearchParams = new URL(request.url).searchParams;
    const transactionId = urlSearchParams.get("transactionId");

    if (isNullOrEmpty(transactionId) || typeof transactionId !== "string") {
      return Response.json({ error: "Transaction ID is required" }, { status: 400 });
    }

    const isDeleted = await removeTransaction(transactionId, userId, timezone);
    if (isDeleted) {
      trackEvent(request, EventNames.TRANSACTION_DELETED);
    } else {
      return Response.json(
        { success: false, error: "Failed to delete transaction" },
        { status: 400 }
      );
    }

    return { success: isDeleted };
  } catch (error) {
    logError(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
};
