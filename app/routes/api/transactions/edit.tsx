import { ActionFunction } from "@remix-run/node";
import { EventNames } from "~/lib/anaytics.contants";
import { parseTransactionInput } from "~/modules/transaction/transaction.schema";
import {
  addNewCustomCategory,
  editTransaction,
} from "~/modules/transaction/transaction.service";
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

    const { userId, timezone } = sessionData;

    if (request.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    const body = await request.json();
    const { errors, transaction } = parseTransactionInput(body);

    if (errors) {
      return Response.json({ error: errors }, { status: 400 });
    }

    const existingTransactionId = body.transactionId ?? null;
    if (
      isNullOrEmpty(existingTransactionId) ||
      typeof existingTransactionId !== "string"
    ) {
      return { error: "Invalid transaction ID" };
    }

    const saveTransactionTask = editTransaction(
      userId,
      existingTransactionId,
      transaction,
      timezone
    );

    const isNewCustomCategory = body.isNewCustomCategory ?? false;
    const saveCustomCategoryTask = isNewCustomCategory
      ? addNewCustomCategory(userId, transaction.type, transaction.category)
      : Promise.resolve();

    const tasks = [saveTransactionTask, saveCustomCategoryTask];
    await Promise.allSettled(tasks);
    const { success: isTransactionSaved, transactionId } = await saveTransactionTask;

    if (isTransactionSaved) {
      trackEvent(request, EventNames.TRANSACTION_EDITED, {
        type: transaction.type,
        isRecurring: "no",
      });
    }
    return isTransactionSaved
      ? { success: transactionId }
      : { error: "Failed to edit transaction" };
  } catch (error) {
    logError(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
};
