import { add } from "date-fns";
import {
  getCurrentLocalDateInUTC,
  getNextExecutionDate,
  parseDate,
} from "~/utils/date.utils";
import prisma from "../../lib/prisma";
import type { TransactionType } from "../transaction/transaction.schema";
import { addNewTransaction } from "../transaction/transaction.service";
import type {
  RecurringTransactionFilter,
  RecurringTransactionInput,
} from "./recurring.schema";
import {
  parseRecurringTransactionResponse,
  parseRecurringTransactionsResponse,
} from "./recurring.schema";
import { Prisma } from "@prisma/client";
import { logError } from "~/utils/logger.utils.server";

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

export async function editRecurringTransaction(
  userId: string,
  transactionId: string,
  recurringTransactionInput: RecurringTransactionInput
) {
  try {
    const executionDate = recurringTransactionInput.startDate;
    delete recurringTransactionInput.startDate;

    await prisma.recurringTransaction.update({
      where: { id: transactionId },
      data: {
        ...recurringTransactionInput,
        executionDate,
        userId,
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
