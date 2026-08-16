import type { ActionFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import {
  parseRecurringTransactionInput,
  type RecurringTransactionInput,
} from "~/modules/recurring/recurring.schema";
import { createMultipleRecurringTransactions } from "~/modules/recurring/recurring.service";
import { getSessionData } from "~/utils/auth.utils.server";
import { trackEvent } from "~/utils/analytics.utils.server";
import { EventNames } from "~/lib/anaytics.contants";
import { logError, logWarn } from "~/utils/logger.utils.server";

const MAX_BULK_TRANSACTIONS = 10;

export let action: ActionFunction = async ({ request }) => {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const sessionData = await getSessionData(request);
  if (sessionData == null || sessionData.userId == null) {
    return redirect("/auth/login");
  }

  const { userId, timezone } = sessionData;

  try {
    const formData = await request.formData();
    const transactionsJson = formData.get("transactions")?.toString();

    if (!transactionsJson) {
      return Response.json(
        { error: "Invalid request: transactions data is required" },
        { status: 400 }
      );
    }

    let transactions;
    try {
      transactions = JSON.parse(transactionsJson);
    } catch (e) {
      return Response.json(
        { error: "Invalid JSON format in transactions data" },
        { status: 400 }
      );
    }

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return Response.json(
        { error: "Invalid request: transactions array is required" },
        { status: 400 }
      );
    }

    if (transactions.length > MAX_BULK_TRANSACTIONS) {
      return Response.json(
        { error: `Maximum ${MAX_BULK_TRANSACTIONS} transactions allowed per request` },
        { status: 400 }
      );
    }

    const validTransactions: Array<{
      index: number;
      input: RecurringTransactionInput;
    }> = [];
    const validationErrors: Array<{
      index: number;
      category: string;
      errors: Record<string, string>;
    }> = [];

    transactions.forEach((transaction, index) => {
      const recurringTransactionInput = {
        occurrence: transaction.occurrence,
        interval: Number(transaction.interval),
        description: transaction.description,
        amount: transaction.amount?.toString(),
        type: transaction.type,
        category: transaction.category?.toString().trim(),
        category2: transaction.category2?.toString().trim(),
        category3: transaction.category3?.toString().trim(),
        paymentMode: transaction.paymentMode,
        startDate: transaction.startDate?.toString().trim(),
      };

      const parsedTransaction = parseRecurringTransactionInput(recurringTransactionInput);

      if (parsedTransaction.errors) {
        validationErrors.push({
          index,
          category: transaction.category || "unknown",
          errors: parsedTransaction.errors,
        });
      } else {
        validTransactions.push({
          index,
          input: parsedTransaction.transaction,
        });
      }
    });

    const batchResult = await createMultipleRecurringTransactions(
      userId,
      timezone,
      validTransactions
    );

    batchResult.created.forEach(({ transaction }) => {
      trackEvent(request, EventNames.RECURRING_TRANSACTION_CREATED, {
        type: transaction.type,
        occurrence: transaction.occurrence,
        interval: transaction.interval.toString(),
        source: "ai_bulk",
      });
    });

    const errors = [...validationErrors, ...batchResult.failed];

    if (errors.length) {
      logWarn(`Bulk recurring transaction fail: ${JSON.stringify(errors)}`);
    }

    return Response.json({
      success: errors.length === 0,
      created: batchResult.created.length,
      failed: errors.length,
      errors,
    });
  } catch (error) {
    logError(error);
    return Response.json(
      { error: "Failed to process bulk transaction creation" },
      { status: 500 }
    );
  }
};
