import type {
  Decimal,
  MonthlyCategoryWiseTargetInput,
  MonthlyTargetInput,
  TransactionInput,
  TransactionType,
} from "./transaction.schema";
import { parseTransactionsResponse } from "./transaction.schema";

import prisma from "../../lib/prisma";
import {
  formatDate_YYYY_MM_DD,
  getCurrentLocalDateInUTC,
  getFirstDateOfMonth,
  getFirstDateOfThisMonth,
  parseDate,
} from "~/utils/date.utils";
import { isNotNullAndEmpty, isNullOrEmpty } from "~/utils/text.utils";
import { Prisma } from "@prisma/client";
import { add } from "date-fns";
import { logError } from "~/utils/logger.utils.server";

export async function getTransaction(transactionId: string, userId: string) {
  const transaction = await prisma.transaction.findFirst({
    where: { id: transactionId, userId },
  });
  return transaction;
}

export async function addNewTransaction(
  transaction: TransactionInput,
  userId: string,
  timezone: string
) {
  try {
    const date = getCurrentLocalDateInUTC(timezone);
    const tasks: Promise<boolean>[] = [
      createTransaction(userId, timezone, transaction),
      updateMonthlyTarget(
        userId,
        transaction.type,
        "add",
        transaction.amount,
        timezone,
        date
      ),
      updateCategoryAmount(
        userId,
        transaction.category,
        transaction.type,
        "add",
        transaction.amount,
        timezone,
        date
      ),
      updatePaymentModeAmount(
        userId,
        transaction.type,
        transaction.paymentMode,
        "add",
        transaction.amount,
        timezone,
        date
      ),
    ];

    if (isNotNullAndEmpty(transaction.category2)) {
      tasks.push(
        updateCategoryAmount(
          userId,
          transaction.category2,
          transaction.type,
          "add",
          transaction.amount,
          timezone,
          date
        )
      );
    }

    if (isNotNullAndEmpty(transaction.category3)) {
      tasks.push(
        updateCategoryAmount(
          userId,
          transaction.category3,
          transaction.type,
          "add",
          transaction.amount,
          timezone,
          date
        )
      );
    }

    await Promise.allSettled(tasks);
    return true;
  } catch (error) {
    logError(error);
    return false;
  }
}

async function createTransaction(
  userId: string,
  timezone: string,
  transaction: TransactionInput
) {
  try {
    await prisma.transaction.create({
      data: {
        ...transaction,
        createdAtLocal: getCurrentLocalDateInUTC(timezone),
        user: {
          connect: { id: userId },
        },
      },
    });
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
}

export async function editTransaction(
  userId: string,
  transactionId: string,
  newTransaction: TransactionInput,
  timezone: string
) {
  try {
    const tasks: Promise<any>[] = [];
    const oldTransaction = await prisma.transaction.findFirst({
      where: { id: transactionId, userId },
    });

    if (oldTransaction == null) return false;

    tasks.push(
      prisma.transaction.update({
        where: { id: transactionId },
        data: newTransaction,
      })
    );

    if (newTransaction.type !== oldTransaction.type) {
      tasks.push(
        updateMonthlyTarget(
          userId,
          oldTransaction.type as TransactionType,
          "subtract",
          oldTransaction.amount,
          timezone,
          oldTransaction.createdAt
        )
      );

      tasks.push(
        updateMonthlyTarget(
          userId,
          newTransaction.type as TransactionType,
          "add",
          newTransaction.amount,
          timezone,
          oldTransaction.createdAt
        )
      );

      tasks.push(
        updatePaymentModeAmount(
          userId,
          oldTransaction.type as TransactionType,
          oldTransaction.paymentMode,
          "subtract",
          oldTransaction.amount,
          timezone,
          oldTransaction.createdAt
        )
      );

      tasks.push(
        updatePaymentModeAmount(
          userId,
          newTransaction.type as TransactionType,
          newTransaction.paymentMode,
          "add",
          newTransaction.amount,
          timezone,
          oldTransaction.createdAt
        )
      );
    } else {
      const amountDiff = newTransaction.amount.minus(oldTransaction.amount);
      amountDiff.abs().gt(0) &&
        tasks.push(
          updateMonthlyTarget(
            userId,
            newTransaction.type as TransactionType,
            amountDiff.gt(0) ? "add" : "subtract",
            amountDiff.abs(),
            timezone,
            oldTransaction.createdAt
          )
        );

      if (newTransaction.paymentMode !== oldTransaction.paymentMode) {
        tasks.push(
          updatePaymentModeAmount(
            userId,
            oldTransaction.type as TransactionType,
            oldTransaction.paymentMode,
            "subtract",
            oldTransaction.amount,
            timezone,
            oldTransaction.createdAt
          )
        );

        tasks.push(
          updatePaymentModeAmount(
            userId,
            newTransaction.type as TransactionType,
            newTransaction.paymentMode,
            "add",
            newTransaction.amount,
            timezone,
            oldTransaction.createdAt
          )
        );
      } else {
        amountDiff.abs().gt(0) &&
          tasks.push(
            updatePaymentModeAmount(
              userId,
              newTransaction.type as TransactionType,
              newTransaction.paymentMode,
              amountDiff.gt(0) ? "add" : "subtract",
              amountDiff.abs(),
              timezone,
              oldTransaction.createdAt
            )
          );
      }
    }

    const categoriesToCreate = [];
    const categoriesToUpdate = [];
    const categoriesToDelete = [];

    if (newTransaction.type !== oldTransaction.type) {
      categoriesToDelete.push(
        ...[oldTransaction.category, oldTransaction.category2, oldTransaction.category3]
      );

      categoriesToCreate.push(
        ...[newTransaction.category, newTransaction.category2, newTransaction.category3]
      );
    } else {
      const oldCategories = [
        oldTransaction.category,
        oldTransaction.category2,
        oldTransaction.category3,
      ];
      const newCategories = [
        newTransaction.category,
        newTransaction.category2,
        newTransaction.category3,
      ];

      for (const newCategory of newCategories) {
        if (isNullOrEmpty(newCategory)) continue;
        if (oldCategories.includes(newCategory)) {
          categoriesToUpdate.push(newCategory);
        } else {
          categoriesToCreate.push(newCategory);
        }
      }

      for (const oldCategory of oldCategories) {
        if (isNullOrEmpty(oldCategory)) continue;
        if (!newCategories.includes(oldCategory)) {
          categoriesToDelete.push(oldCategory);
        }
      }
    }

    categoriesToCreate.forEach((c) => {
      if (isNotNullAndEmpty(c)) {
        tasks.push(
          updateCategoryAmount(
            userId,
            c,
            newTransaction.type as TransactionType,
            "add",
            newTransaction.amount,
            timezone,
            oldTransaction.createdAt
          )
        );
      }
    });

    categoriesToUpdate.forEach((category) => {
      const amountDiff = newTransaction.amount.minus(oldTransaction.amount);
      tasks.push(
        updateCategoryAmount(
          userId,
          category,
          newTransaction.type as TransactionType,
          amountDiff.gt(0) ? "add" : "subtract",
          amountDiff.abs(),
          timezone,
          oldTransaction.createdAt
        )
      );
    });

    categoriesToDelete.forEach((c) => {
      if (isNotNullAndEmpty(c)) {
        tasks.push(
          updateCategoryAmount(
            userId,
            c,
            oldTransaction.type as TransactionType,
            "subtract",
            oldTransaction.amount,
            timezone,
            oldTransaction.createdAt
          )
        );
      }
    });

    await Promise.all(tasks);
    return true;
  } catch (error) {
    logError(error);
    throw error;
  }
}

async function updateMonthlyTarget(
  userId: string,
  type: TransactionType,
  operationType: "add" | "subtract",
  amount: Decimal,
  timezone: string,
  date?: Date
) {
  amount = operationType === "add" ? amount : amount.negated();
  let data = {};
  switch (type) {
    case "expense":
      data = { expense: { increment: amount } };
      break;
    case "income":
      data = { incomeEarned: { increment: amount } };
      break;
    case "investment":
      data = { investmentDone: { increment: amount } };
      break;
  }

  date = date != null ? getFirstDateOfMonth(date) : getFirstDateOfThisMonth(timezone);

  await prisma.monthlyTarget.upsert({
    create: {
      userId,
      date,
      budget: 0,
      expense: type === "expense" && amount.gt(0) ? amount : 0,
      income: 0,
      incomeEarned: type === "income" && amount.gt(0) ? amount : 0,
      investment: 0,
      investmentDone: type === "investment" && amount.gt(0) ? amount : 0,
    },
    update: data,
    where: {
      userId_date: {
        userId,
        date,
      },
    },
  });
  return true;
}

async function updateCategoryAmount(
  userId: string,
  category: string,
  type: TransactionType,
  operationType: "add" | "subtract",
  amount: Decimal,
  timezone: string,
  date?: Date
) {
  await prisma.categoryAmount.upsert({
    create: {
      category: category,
      amount,
      userId,
      date: date != null ? getFirstDateOfMonth(date) : getFirstDateOfThisMonth(timezone),
      type,
    },
    update: {
      amount: {
        increment: operationType === "add" ? amount : amount.negated(),
      },
    },
    where: {
      userId_date_type_category: {
        userId,
        date:
          date != null ? getFirstDateOfMonth(date) : getFirstDateOfThisMonth(timezone),
        type,
        category,
      },
    },
  });
  return true;
}

async function updatePaymentModeAmount(
  userId: string,
  transactionType: TransactionType,
  paymentMode: string,
  operationType: "add" | "subtract",
  amount: Decimal,
  timezone: string,
  date?: Date
) {
  await prisma.paymentModeAmount.upsert({
    create: {
      paymentMode,
      amount,
      userId,
      date: date != null ? getFirstDateOfMonth(date) : getFirstDateOfThisMonth(timezone),
      transactionType,
    },
    update: {
      amount: {
        increment: operationType === "add" ? amount : amount.negated(),
      },
    },
    where: {
      userId_date_transactionType_paymentMode: {
        userId,
        date:
          date != null ? getFirstDateOfMonth(date) : getFirstDateOfThisMonth(timezone),
        transactionType,
        paymentMode,
      },
    },
  });
  return true;
}

export async function getTransactions(
  userId: string,
  timezone: string,
  month?: string,
  filter?: {
    types?: string[];
    categories?: string[];
    paymentModes?: string[];
  }
) {
  const currentMonth = month ? parseDate(month) : getFirstDateOfThisMonth(timezone);
  const nextMonth = add(currentMonth, { months: 1 });
  try {
    const where: any = {
      userId,
      createdAtLocal: {
        gte: currentMonth,
        lt: nextMonth,
      },
    };

    if (filter) {
      where.AND = [];
      if (filter.types) {
        const typeFilter = [];
        for (const type of filter.types) {
          if (isNullOrEmpty(type)) continue;
          typeFilter.push({ type });
        }
        typeFilter.length && where.AND.push({ OR: typeFilter });
      }
      if (filter.categories) {
        const categoryFilter = [];
        for (const category of filter.categories) {
          if (isNullOrEmpty(category)) continue;
          categoryFilter.push({ category });
        }
        categoryFilter.length && where.AND.push({ OR: categoryFilter });
      }
      if (filter.paymentModes) {
        const paymentModeFilter = [];
        for (const paymentMode of filter.paymentModes) {
          if (isNullOrEmpty(paymentMode)) continue;
          paymentModeFilter.push({ paymentMode });
        }
        paymentModeFilter.length && where.AND.push({ OR: paymentModeFilter });
      }
    }

    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { createdAtLocal: "desc" },
    });
    const parsedTransactions = parseTransactionsResponse(transactions);
    return parsedTransactions;
  } catch (error) {
    logError(error);
    return [];
  }
}

export async function getRecentTransactions(userId: string, timezone: string) {
  try {
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
      },
      orderBy: { createdAtLocal: "desc" },
      take: 5,
    });
    const parsedTransactions = parseTransactionsResponse(transactions);
    return parsedTransactions;
  } catch (error) {
    logError(error);
    return [];
  }
}

export async function getCurrentMonthTarget(userId: string, timezone: string) {
  try {
    const targetAchievementData = await prisma.monthlyTarget.findUnique({
      select: {
        budget: true,
        expense: true,
      },
      where: {
        userId_date: {
          userId,
          date: getFirstDateOfThisMonth(timezone),
        },
      },
    });

    return targetAchievementData;
  } catch (error) {
    console.log(error);
    return null;
  }
}

export async function getMonthlyTarget(userId: string, date: Date) {
  try {
    const targetAchievementData = await prisma.monthlyTarget.findUnique({
      select: {
        budget: true,
        expense: true,
      },
      where: {
        userId_date: {
          userId,
          date: getFirstDateOfMonth(date),
        },
      },
    });

    return targetAchievementData;
  } catch (error) {
    console.log(error);
    return null;
  }
}

export async function createMonthlyTarget(
  userId: string,
  timezone: string,
  targetDetails: MonthlyTargetInput,
  categoryWiseTargetDetails: MonthlyCategoryWiseTargetInput
) {
  const date = getFirstDateOfThisMonth(timezone);
  const createMonthTarget = prisma.monthlyTarget.create({
    data: {
      date,
      budget: targetDetails.budget,
      expense: 0,
      income: 0,
      incomeEarned: 0,
      investment: 0,
      investmentDone: 0,
      userId,
    },
  });

  const categoryAmounts: Prisma.CategoryAmountCreateManyInput[] = [];

  for (const targetData of categoryWiseTargetDetails) {
    categoryAmounts.push({
      date,
      type: "expense",
      category: targetData[0],
      amount: 0,
      budget: targetData[1],
      userId,
    });
  }

  const createCategoryWiseTargets = prisma.categoryAmount.createMany({
    data: categoryAmounts,
  });

  await Promise.allSettled([createMonthTarget, createCategoryWiseTargets]);
  return true;
}

export async function editMonthlyTarget(
  userId: string,
  timezone: string,
  targetDetails: MonthlyTargetInput,
  categoryWiseTargetDetails: MonthlyCategoryWiseTargetInput
) {
  try {
    const tasks = [];
    const date = getFirstDateOfThisMonth(timezone);
    const monthlyTargetUpdate = prisma.monthlyTarget.update({
      where: { userId_date: { userId, date } },
      data: {
        budget: targetDetails.budget,
      },
    });
    tasks.push(monthlyTargetUpdate);

    if (categoryWiseTargetDetails.size == 0) {
      await Promise.all(tasks);
      return true;
    }

    const valuesArr: Prisma.Sql[] = [];
    for (const item of categoryWiseTargetDetails) {
      const category = item[0];
      const budget = item[1];
      valuesArr.push(
        Prisma.sql`(${Prisma.join([
          userId,
          formatDate_YYYY_MM_DD(date),
          "expense",
          category,
          0,
          budget,
        ])})`
      );
    }

    const categoryBudgetUpdate = prisma.$executeRaw(
      Prisma.sql`INSERT INTO CategoryAmount (userId, date, type, category, amount, budget) VALUES ${Prisma.join(
        valuesArr
      )} ON DUPLICATE KEY UPDATE budget = VALUES(budget)`
    );
    tasks.push(categoryBudgetUpdate);

    await Promise.all(tasks);
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
}

export async function removeTransaction(
  transactionId: string,
  userId: string,
  timezone: string
) {
  const transaction = await getTransaction(transactionId, userId);
  if (transaction == null) return false;

  const tasks = [
    deleteTransaction(transactionId, userId),
    updateMonthlyTarget(
      userId,
      transaction.type as TransactionType,
      "subtract",
      transaction.amount,
      timezone
    ),
    updateCategoryAmount(
      userId,
      transaction.category,
      transaction.type as TransactionType,
      "subtract",
      transaction.amount,
      timezone
    ),
    updatePaymentModeAmount(
      userId,
      transaction.type as TransactionType,
      transaction.paymentMode,
      "subtract",
      transaction.amount,
      timezone
    ),
  ];

  if (isNotNullAndEmpty(transaction.category2)) {
    tasks.push(
      updateCategoryAmount(
        userId,
        transaction.category2,
        transaction.type as TransactionType,
        "subtract",
        transaction.amount,
        timezone
      )
    );
  }

  if (isNotNullAndEmpty(transaction.category3)) {
    tasks.push(
      updateCategoryAmount(
        userId,
        transaction.category3,
        transaction.type as TransactionType,
        "subtract",
        transaction.amount,
        timezone
      )
    );
  }

  await Promise.allSettled(tasks);
  return true;
}

async function deleteTransaction(transactionId: string, userId: string) {
  const { count } = await prisma.transaction.deleteMany({
    where: { id: transactionId, userId },
  });
  return count;
}

export async function getBudgetPerCategoryThisMonth(userId: string, timezone: string) {
  const categoryBudgets = await prisma.categoryAmount.findMany({
    where: {
      userId,
      date: { gte: getFirstDateOfThisMonth(timezone) },
      type: "expense",
      budget: { gt: 0 },
    },
    select: {
      category: true,
      budget: true,
    },
  });

  return categoryBudgets;
}

export async function addNewCustomCategory(
  userId: string,
  type: TransactionType,
  category: string
) {
  try {
    await Promise.allSettled([
      prisma.customCategory.upsert({
        where: { userId_type_value: { userId, type, value: category } },
        create: { userId, type, value: category },
        update: {},
      }),
      prisma.userPreference.update({
        data: { lastModified: new Date().getTime() },
        where: { userId },
      }),
    ]);
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
}

export async function addNewCustomCategories(
  userId: string,
  type: TransactionType,
  categories: string[]
) {
  try {
    const customCategoryRows = categories.map((category) => ({
      userId,
      type,
      value: category,
    }));

    await Promise.allSettled([
      prisma.customCategory.createMany({
        data: customCategoryRows,
        skipDuplicates: true,
      }),
      prisma.userPreference.update({
        data: { lastModified: new Date().getTime() },
        where: { userId },
      }),
    ]);
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
}

export async function getCustomCategories(userId: string) {
  const customCategories = await prisma.customCategory.findMany({
    where: { userId },
  });
  if (customCategories.length == 0) return null;
  const map: { [key: string]: string[] } = {};
  for (const category of customCategories) {
    if (map[category.type] == null) {
      map[category.type] = [category.value];
    } else {
      map[category.type].push(category.value);
    }
  }

  return map;
}

export async function aggregateTransactionsIntoCategoryAmount(userId: string) {
  try {
    await prisma.$executeRaw(
      Prisma.sql`INSERT INTO CategoryAmount (userId, date, category, type, amount) (SELECT userId, ANY_VALUE(CONCAT(YEAR(createdAtLocal), '-', MONTH(createdAtLocal), '-01')) AS date, category, type, SUM(amount) AS amount FROM Transaction WHERE userId = ${userId} GROUP BY YEAR(createdAtLocal), MONTH(createdAtLocal), type, category) ON DUPLICATE KEY update amount = VALUES(amount);`
    );
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
}
