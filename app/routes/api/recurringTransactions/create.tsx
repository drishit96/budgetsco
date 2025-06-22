import { ActionFunction } from "@remix-run/node";
import { EventNames } from "~/lib/anaytics.contants";
import { parseRecurringTransactionInput } from "~/modules/recurring/recurring.schema";
import { createNewRecurringTransaction } from "~/modules/recurring/recurring.service";
import { addNewCustomCategory } from "~/modules/transaction/transaction.service";
import { trackEvent } from "~/utils/analytics.utils.server";
import { getSessionData } from "~/utils/auth.utils.server";
import { logError } from "~/utils/logger.utils.server";

export let action: ActionFunction = async ({ request }) => {
  try {
    const sessionData = await getSessionData(request);
    if (sessionData == null || sessionData.userId == null) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId, timezone } = sessionData;

    if (request.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    const body = await request.json();
    const { errors, transaction } = parseRecurringTransactionInput(body);

    if (errors) {
      return Response.json({ error: errors }, { status: 400 });
    }

    const createRecurringTransactionTask = createNewRecurringTransaction(
      userId,
      timezone,
      transaction
    );

    const isNewCustomCategory = body.isNewCustomCategory ?? false;
    const saveCustomCategoryTask = isNewCustomCategory
      ? addNewCustomCategory(userId, transaction.type, transaction.category)
      : Promise.resolve();

    await Promise.allSettled([createRecurringTransactionTask, saveCustomCategoryTask]);

    const { success: isDataSaved, transactionId } = await createRecurringTransactionTask;
    if (isDataSaved) {
      trackEvent(request, EventNames.RECURRING_TRANSACTION_CREATED, {
        type: transaction.type,
        occurrence: transaction.occurrence,
        interval: transaction.interval.toString(),
      });
    }

    return isDataSaved
      ? { transactionId }
      : { error: "Failed to create recurring transaction" };
  } catch (error) {
    logError(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
};
