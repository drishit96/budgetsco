import { add } from "date-fns";
import {
  formatDate_DD_MMMM_YYYY_hh_mm,
  getCurrentLocalDateInUTC,
  getNextExecutionDate,
} from "~/utils/date.utils";
import prisma from "../../lib/prisma";
import type { TransactionType } from "../transaction/transaction.schema";
import { addNewTransaction } from "../transaction/transaction.service";
import type { RecurringTransactionInput } from "./recurring.schema";
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
      );
    }

    await prisma.recurringTransaction.create({
      data: { ...recurringTransactionInput, executionDate, userId },
    });

    return true;
  } catch (error) {
    console.log(error);
    return false;
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

    return true;
  } catch (error) {
    console.log(error);
    logError(error);
    return false;
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
    return { isTransactionMarkedAsDone: false, type: null };
  }
}

export async function markAsNotified(userIds: string[], startDate: Date, endDate: Date) {
  try {
    //Used raw query due to issue: https://github.com/prisma/prisma/issues/5043
    const result = await prisma.$executeRaw(
      Prisma.sql`UPDATE RecurringTransaction SET isNotified = 1 WHERE userId IN (${Prisma.join(
        userIds
      )}) AND executionDate > ${formatDate_DD_MMMM_YYYY_hh_mm(
        startDate
      )} AND executionDate <= ${formatDate_DD_MMMM_YYYY_hh_mm(
        endDate
      )} AND isNotified = 0`
    );
    return result > 0;
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
