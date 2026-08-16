import { add, subMonths } from "date-fns";
import {
  getCurrentLocalDateInUTC,
  getNextExecutionDate,
  parseDate,
  getFirstDateOfThisMonth,
  formatDate_YYYY_MM_DD,
} from "~/utils/date.utils";
import prisma from "../../lib/prisma";
import type { TransactionType } from "../transaction/transaction.schema";
import { addNewTransaction } from "../transaction/transaction.service";
import type {
  RecurringTransactionFilter,
  RecurringTransactionInput,
} from "./recurring.schema";
import {
  parseRecurringTransactionInput,
  parseRecurringTransactionResponse,
  parseRecurringTransactionsResponse,
} from "./recurring.schema";
import { logError } from "~/utils/logger.utils.server";
import { AIUsageData, generateStructuredObject } from "~/modules/ai/ai.service";
import {
  RecurringRecommendationsResponseSchema,
  type RecurringRecommendation,
} from "./recurringRecommendation.schema";
import { AIProviderConfig } from "../ai/aiProvider.schema";
import { Prisma } from "~/generated/prisma/client";

export async function getAllRecurringTransactions(userId: string) {
  try {
    const transactions = await prisma.recurringTransaction.findMany({
      where: {
        userId,
      },
    });
    const recurringTransactions = parseRecurringTransactionsResponse(transactions);

    if (recurringTransactions.errors) {
      console.log(JSON.stringify(recurringTransactions.errors));
      return [];
    }

    return recurringTransactions.transactions;
  } catch (error) {
    logError(error);
    return [];
  }
}

export async function getRecurringTransaction(transactionId: string, userId: string) {
  try {
    const recurringTransaction = await prisma.recurringTransaction.findFirst({
      where: { id: transactionId, userId },
    });
    const { transaction } = parseRecurringTransactionResponse(recurringTransaction);
    return transaction;
  } catch (error) {
    logError(error);
    return null;
  }
}

export async function getDueTransactionCountPerUser(startDate: Date, endDate: Date) {
  try {
    const transactions = await prisma.recurringTransaction.groupBy({
      by: ["userId"],
      where: {
        executionDate: {
          gt: startDate,
          lte: endDate,
        },
        isNotified: false,
      },
      _count: { userId: true },
    });
    return transactions;
  } catch (error) {
    logError(error);
    return [];
  }
}

export async function getOverDueTransactions(userId: string, timezone: string) {
  try {
    const currentDate = getCurrentLocalDateInUTC(timezone);
    const transactions = await prisma.recurringTransaction.findMany({
      where: {
        userId,
        executionDate: {
          lt: currentDate,
        },
      },
    });
    const overDueTransactions = parseRecurringTransactionsResponse(transactions);

    if (overDueTransactions.errors) {
      console.log(JSON.stringify(overDueTransactions.errors));
      return [];
    }

    return overDueTransactions.transactions;
  } catch (error) {
    logError(error);
    return [];
  }
}

export async function getUpcomingTransactions(userId: string, timezone: string) {
  try {
    const currentDate = getCurrentLocalDateInUTC(timezone);
    const next3DaysDate = add(currentDate, { days: 3 });
    const transactions = await prisma.recurringTransaction.findMany({
      where: {
        userId,
        executionDate: {
          gte: currentDate,
          lt: next3DaysDate,
        },
      },
    });
    const upcomingTransactions = parseRecurringTransactionsResponse(transactions);

    if (upcomingTransactions.errors) {
      console.log(JSON.stringify(upcomingTransactions.errors));
      return [];
    }

    return upcomingTransactions.transactions;
  } catch (error) {
    logError(error);
    return [];
  }
}

export async function getRecurringTransactions(
  userId: string,
  filter: RecurringTransactionFilter
) {
  try {
    let executionDateFilter: Prisma.DateTimeFilter | undefined = undefined;
    if (filter.startDate && filter.endDate) {
      executionDateFilter = {
        gte: parseDate(filter.startDate),
        lte: parseDate(filter.endDate),
      };
    } else if (filter.startDate) {
      executionDateFilter = { gte: parseDate(filter.startDate) };
    } else if (filter.endDate) {
      executionDateFilter = { lte: parseDate(filter.endDate) };
    }

    const transactions = await prisma.recurringTransaction.findMany({
      where: {
        userId,
        executionDate: executionDateFilter,
      },
      select: {
        id: true,
        amount: true,
        category: true,
        paymentMode: true,
        description: true,
        type: true,
        occurrence: true,
        interval: true,
        executionDate: true,
      },
      orderBy: { executionDate: "asc" },
    });

    const recurringTransactions = parseRecurringTransactionsResponse(transactions);

    if (recurringTransactions.errors) {
      logError(JSON.stringify(recurringTransactions.errors));
      return [];
    }

    return recurringTransactions.transactions;
  } catch (error) {
    logError(error);
    return [];
  }
}

export async function createNewRecurringTransaction(
  userId: string,
  timezone: string,
  recurringTransactionInput: RecurringTransactionInput
) {
  try {
    let executionDate = recurringTransactionInput.startDate;
    delete recurringTransactionInput.startDate;

    if (executionDate == null) {
      executionDate = getNextExecutionDate(
        recurringTransactionInput.occurrence,
        recurringTransactionInput.interval
      ).toISOString();
    }

    const createdTransaction = await prisma.recurringTransaction.create({
      data: { ...recurringTransactionInput, executionDate, userId },
    });

    return { success: true, transactionId: createdTransaction.id, executionDate };
  } catch (error) {
    logError(error);
    return { success: false, transactionId: null };
  }
}

export type BulkCreateResult = {
  created: Array<{
    index: number;
    transactionId: string;
    category: string;
    transaction: RecurringTransactionInput;
  }>;
  failed: Array<{
    index: number;
    category: string;
    errors: Record<string, string>;
  }>;
};

export async function createMultipleRecurringTransactions(
  userId: string,
  timezone: string,
  transactions: Array<{ index: number; input: RecurringTransactionInput }>
): Promise<BulkCreateResult> {
  const result: BulkCreateResult = {
    created: [],
    failed: [],
  };

  if (transactions.length === 0) {
    return result;
  }

  try {
    const preparedTransactions = transactions.map(({ index, input }) => {
      let executionDate = input.startDate;
      const inputCopy = { ...input };
      delete inputCopy.startDate;

      if (executionDate == null) {
        executionDate = getNextExecutionDate(
          inputCopy.occurrence,
          inputCopy.interval
        ).toISOString();
      }

      return {
        index,
        category: input.category,
        transaction: inputCopy,
        data: {
          ...inputCopy,
          executionDate,
          userId,
        },
      };
    });

    const createdRecords = await prisma.$transaction(
      preparedTransactions.map((item) =>
        prisma.recurringTransaction.create({
          data: item.data,
          select: { id: true },
        })
      )
    );

    preparedTransactions.forEach((item, idx) => {
      result.created.push({
        index: item.index,
        transactionId: createdRecords[idx].id,
        category: item.category,
        transaction: transactions[idx].input,
      });
    });

    return result;
  } catch (error) {
    logError(error);
    transactions.forEach(({ index, input }) => {
      result.failed.push({
        index,
        category: input.category,
        errors: { general: "Batch insert failed" },
      });
    });
    return result;
  }
}

export async function editRecurringTransaction(
  userId: string,
  transactionId: string,
  recurringTransactionInput: RecurringTransactionInput
) {
  try {
    const executionDate = recurringTransactionInput.startDate;
    delete recurringTransactionInput.startDate;

    await prisma.recurringTransaction.update({
      where: { id: transactionId, userId },
      data: {
        ...recurringTransactionInput,
        executionDate,
      },
    });

    return { success: true, transactionId, executionDate };
  } catch (error) {
    logError(error);
    return { success: false, transactionId: null };
  }
}

export async function markTransactionAsDone(
  userId: string,
  timezone: string,
  transactionId: string
): Promise<
  | { isTransactionMarkedAsDone: false; type: null }
  | { isTransactionMarkedAsDone: true; type: string }
> {
  try {
    const recurringTransaction = await prisma.recurringTransaction.findFirst({
      where: { id: transactionId, userId },
    });

    if (recurringTransaction == null) {
      return { isTransactionMarkedAsDone: false, type: null };
    }

    const executionDate = getNextExecutionDate(
      recurringTransaction.occurrence,
      recurringTransaction.interval,
      recurringTransaction.executionDate
    );

    await Promise.allSettled([
      addNewTransaction(
        {
          amount: recurringTransaction.amount,
          category: recurringTransaction.category,
          category2: recurringTransaction.category2,
          category3: recurringTransaction.category3,
          paymentMode: recurringTransaction.paymentMode,
          description: recurringTransaction.description,
          type: recurringTransaction.type as TransactionType,
        },
        userId,
        timezone
      ),
      prisma.recurringTransaction.update({
        where: { id: transactionId },
        data: { executionDate, isNotified: false },
      }),
    ]);

    return {
      isTransactionMarkedAsDone: true,
      type: recurringTransaction.type.toString(),
    };
  } catch (error) {
    logError(error);
    return { isTransactionMarkedAsDone: false, type: null };
  }
}

export async function markAsNotified(userIds: string[], startDate: Date, endDate: Date) {
  try {
    const result = await prisma.recurringTransaction.updateMany({
      where: {
        userId: { in: userIds },
        executionDate: { gt: startDate, lte: endDate },
        isNotified: false,
      },
      data: { isNotified: true },
    });
    return result.count > 0;
  } catch (error) {
    logError(error);
    return false;
  }
}

export async function deleteRecurringTransaction(userId: string, transactionId: string) {
  const { count } = await prisma.recurringTransaction.deleteMany({
    where: { id: transactionId, userId },
  });
  return count > 0;
}

export async function skipRecurringTransaction(
  userId: string,
  transactionId: string
): Promise<boolean> {
  try {
    const transaction = await prisma.recurringTransaction.findFirst({
      where: {
        id: transactionId,
        userId,
      },
    });

    if (!transaction) {
      return false;
    }

    // Update the next execution date to skip this occurrence
    const nextDate = getNextExecutionDate(
      transaction.occurrence,
      transaction.interval,
      transaction.executionDate,
      false
    );

    await prisma.recurringTransaction.update({
      where: {
        id: transactionId,
      },
      data: {
        executionDate: nextDate,
        isNotified: false,
      },
    });

    return true;
  } catch (error) {
    logError(error);
    return false;
  }
}

export async function recommendRecurringTransactionsWithAI(
  userId: string,
  timezone: string,
  aiConfig: AIProviderConfig
): Promise<{
  recommendations: RecurringRecommendation[];
  usage: AIUsageData;
}> {
  const currentMonthDate = getFirstDateOfThisMonth(timezone);
  const sixMonthsAgo = subMonths(currentMonthDate, 6);

  const existingRecurringTransactions = await prisma.recurringTransaction.findMany({
    where: { userId },
    select: {
      description: true,
      amount: true,
      category: true,
      paymentMode: true,
      type: true,
    },
  });

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      createdAtLocal: {
        gte: sixMonthsAgo,
        lt: currentMonthDate,
      },
    },
    select: {
      description: true,
      amount: true,
      type: true,
      category: true,
      paymentMode: true,
      createdAtLocal: true,
    },
    orderBy: { createdAtLocal: "asc" },
    take: 500,
  });

  if (transactions.length === 0) {
    throw new Error("No transaction history found");
  }

  const transactionsCSV = `description,amount,type,category,paymentMode,date
${transactions
  .map(
    (t) =>
      `"${t.description || ""}",${t.amount},${t.type},${t.category},${
        t.paymentMode
      },${formatDate_YYYY_MM_DD(t.createdAtLocal)}`
  )
  .join("\n")}`;

  const existingRecurringInfo =
    existingRecurringTransactions.length > 0
      ? `\n\nExisting Recurring Transactions (DO NOT recommend these):\n${existingRecurringTransactions
          .map((r) => `- ${r.category}, ${r.amount}, ${r.paymentMode}, ${r.type}`)
          .join("\n")}`
      : "";

  const prompt = `You are a financial assistant helping to identify recurring transaction patterns from historical data.

Historical Transaction Data (CSV format, past 6 months):
${transactionsCSV}${existingRecurringInfo}

Analyze this transaction history and identify patterns that suggest recurring transactions. Look for:
1. Similar amounts that appear at regular intervals (daily, monthly, yearly)
2. Same category and payment mode combinations that repeat
3. Similar descriptions that occur regularly

For each pattern you identify, provide:
- A simple description (e.g., "Netflix", "Rent", "Salary"). Keep it brief and avoid including category, payment mode, or interval information as these have separate fields. The description can be empty if no specific name is identifiable.
- The recommended amount (use the most common amount)
- The transaction type (income, expense, or investment)
- The category
- The payment mode
- The occurrence period: MUST be exactly one of these three values: "day", "month", or "year" (NOT "week" or "weekly")
- The interval: a positive integer representing how often it recurs
  * For weekly patterns: use occurrence="day" with interval=7
  * For bi-weekly patterns: use occurrence="day" with interval=14
  * For monthly patterns: use occurrence="month" with interval=1
  * For bi-monthly patterns: use occurrence="month" with interval=2
  * For yearly patterns: use occurrence="year" with interval=1
- A start date in ISO format (YYYY-MM-DDTHH:MM:SS.sssZ) representing when this recurring transaction should start. This should be the next expected occurrence based on the pattern. For example, if a monthly bill typically occurs on the 1st, set the start date to the 1st of the next month.
- Your confidence level (high, medium, or low)
- A brief reasoning explaining why you think this is a recurring pattern

Important:
- DO NOT recommend any transactions that match the existing recurring transactions listed above
- Only suggest patterns that appear at least 3 times in the data
- Be conservative - only recommend patterns you're confident about
- Round amounts to reasonable values
- Limit to maximum 10 recommendations, prioritizing the most confident ones
- CRITICAL: The occurrence field MUST be exactly "day", "month", or "year" - no other values are allowed
- If no clear patterns are found, return an empty recommendations array`;

  const { object, usage } = await generateStructuredObject(
    aiConfig,
    RecurringRecommendationsResponseSchema,
    prompt,
    1
  );

  if (existingRecurringTransactions.length === 0) {
    return {
      recommendations: object.recommendations,
      usage,
    };
  }

  const deduplicatedRecommendations = object.recommendations.filter((rec) => {
    const isDuplicate = existingRecurringTransactions.some((existing) => {
      const categoryMatch = existing.category === rec.category;
      const paymentModeMatch = existing.paymentMode === rec.paymentMode;
      const typeMatch = existing.type === rec.type;

      const existingAmount = Number(existing.amount);
      const recAmount = rec.amount;
      const amountDiff = Math.abs(existingAmount - recAmount);
      const amountMatch = amountDiff <= existingAmount * 0.1;

      return categoryMatch && paymentModeMatch && typeMatch && amountMatch;
    });

    return !isDuplicate;
  });

  if (deduplicatedRecommendations.length === 0) {
    return {
      recommendations: [],
      usage,
    };
  }

  const validRecommendations = deduplicatedRecommendations.filter((rec) => {
    const parsed = parseRecurringTransactionInput(rec);
    return !parsed.errors;
  });

  return {
    recommendations: validRecommendations,
    usage,
  };
}
