import { ActionFunction } from "@remix-run/node";
import { EventNames } from "~/lib/anaytics.contants";
import { parseRecurringTransactionInput } from "~/modules/recurring/recurring.schema";
import { editRecurringTransaction } from "~/modules/recurring/recurring.service";
import { addNewCustomCategory } from "~/modules/transaction/transaction.service";
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
    const { errors, transaction } = parseRecurringTransactionInput(body);

    if (errors) {
      return Response.json({ error: errors }, { status: 400 });
    }

    const existingTransactionId = body.transactionId ?? null;
    if (
      isNullOrEmpty(existingTransactionId) ||
      typeof existingTransactionId !== "string"
    ) {
      return Response.json({ error: "Transaction ID is required" }, { status: 400 });
    }

    const editRecurringTransactionTask = editRecurringTransaction(
      userId,
      existingTransactionId,
      transaction
    );

    const isNewCustomCategory = body.isNewCustomCategory ?? false;
    const saveCustomCategoryTask = isNewCustomCategory
      ? addNewCustomCategory(userId, transaction.type, transaction.category)
      : Promise.resolve();

    await Promise.allSettled([editRecurringTransactionTask, saveCustomCategoryTask]);

    const { success: isDataSaved, transactionId } = await editRecurringTransactionTask;
    if (isDataSaved) {
      trackEvent(request, EventNames.RECURRING_TRANSACTION_EDITED, {
        type: transaction.type,
      });
    }

    return isDataSaved ? { transactionId } : { error: "Failed to edit transaction" };
  } catch (error) {
    logError(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
};
