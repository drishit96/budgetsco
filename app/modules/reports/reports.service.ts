import { groupBy } from "~/utils/array.utils";
import prisma from "../../lib/prisma";
import {
  formatDate_MMM_YYYY,
  formatDate_YYY_MM,
  getFirstDateOfThisMonth,
  getFirstDateOfXMonthsBefore,
  getFirstDateOfXMonthsBeforeFormatted,
  parseDate,
} from "~/utils/date.utils";
import type { Prisma } from "@prisma/client";
import Decimal from "decimal.js";

export type ThisMonthReportResponse = {
  budget: Prisma.Decimal;
  expense: Prisma.Decimal;
  categoryWiseTargetExpense: {
    category: string;
    budget: Prisma.Decimal;
    expense: Prisma.Decimal;
  }[];
  incomeEarned: Prisma.Decimal;
  investmentDone: Prisma.Decimal;
  paymentModeExpense: {
    name: string;
    value: Prisma.Decimal;
  }[];
  categoryWiseTargetInvestment: {
    category: string;
    budget: Prisma.Decimal;
    investment: Prisma.Decimal;
  }[];
};

export type ComparisonReportResponse = {
  month: number;
  year: number;
  budgetForMonth: Prisma.Decimal;
  totalExpenseForMonth: Prisma.Decimal;
  remainingBudgetForMonth: Prisma.Decimal;
  compareToMonth: number;
  compareToYear: number;
  budgetForCompareToMonth: Prisma.Decimal;
  totalExpenseForCompareToMonth: Prisma.Decimal;
  remainingBudgetForCompareToMonth: Prisma.Decimal;
  categoryExpenses: CompareCategoryExpenses[];
  maxExpense: Prisma.Decimal;
};

export type TrendingReportResponse = {
  startMonth: number;
  startYear: number;
  endMonth: number;
  endYear: number;
  targets: {
    date: string;
    budget: Prisma.Decimal;
    expense: Prisma.Decimal;
    income: Prisma.Decimal;
    incomeEarned: Prisma.Decimal;
    investment: Prisma.Decimal;
    investmentDone: Prisma.Decimal;
  }[];
  totalExpense: Prisma.Decimal;
  totalIncomeEarned: Prisma.Decimal;
  totalInvestmentDone: Prisma.Decimal;
  categoryExpensesByCategory: { [key: string]: CategoryExpenseDate[] };
};

export async function getThisMonthReport(
  userId: string,
  timezone: string
): Promise<ThisMonthReportResponse> {
  const month = parseDate(getFirstDateOfXMonthsBeforeFormatted(0, timezone));
  const overallTargetExpensePromise = prisma.monthlyTarget.findFirst({
    select: {
      date: true,
      budget: true,
      expense: true,
      income: true,
      incomeEarned: true,
      investment: true,
      investmentDone: true,
    },
    where: {
      userId,
      date: { equals: month },
    },
  });

  const categoryWiseTargetExpensePromise = prisma.categoryAmount.findMany({
    select: {
      category: true,
      budget: true,
      amount: true,
    },
    where: {
      userId,
      type: { equals: "expense" },
      date: { equals: month },
      OR: [{ budget: { gt: 0 } }, { amount: { gt: 0 } }],
    },
    orderBy: [{ amount: "desc" }, { category: "asc" }],
  });

  const categoryWiseTargetInvestmentPromise = prisma.categoryAmount.findMany({
    select: {
      category: true,
      budget: true,
      amount: true,
    },
    where: {
      userId,
      type: { equals: "investment" },
      date: { equals: month },
      OR: [{ amount: { gt: 0 } }],
    },
    orderBy: [{ amount: "desc" }, { category: "asc" }],
  });

  const paymentModeExpensePromise = prisma.paymentModeAmount.findMany({
    select: {
      paymentMode: true,
      amount: true,
    },
    where: {
      userId,
      date: { equals: month },
      transactionType: { equals: "expense" },
      amount: { gt: 0 },
    },
  });

  await Promise.allSettled([
    overallTargetExpensePromise,
    categoryWiseTargetExpensePromise,
    paymentModeExpensePromise,
  ]);
  const overallTargetExpense = await overallTargetExpensePromise;
  const categoryWiseTargetExpense = await categoryWiseTargetExpensePromise;
  const categoryWiseTargetInvestment = await categoryWiseTargetInvestmentPromise;
  const paymentModeExpense = await paymentModeExpensePromise;

  return {
    budget: overallTargetExpense?.budget ?? new Decimal(0),
    expense: overallTargetExpense?.expense ?? new Decimal(0),
    categoryWiseTargetExpense: categoryWiseTargetExpense.map((c) => {
      return {
        category: c.category,
        budget: c.budget ?? new Decimal(0),
        expense: c.amount,
      };
    }),
    categoryWiseTargetInvestment: categoryWiseTargetInvestment.map((c) => {
      return {
        category: c.category,
        budget: c.budget ?? new Decimal(0),
        investment: c.amount,
      };
    }),
    incomeEarned: overallTargetExpense?.incomeEarned ?? new Decimal(0),
    investmentDone: overallTargetExpense?.investmentDone ?? new Decimal(0),
    paymentModeExpense: paymentModeExpense.map((p) => {
      return { name: p.paymentMode, value: p.amount };
    }),
  };
}

export async function getThisMonthTarget(userId: string, timezone: string) {
  try {
    const thisMonth = getFirstDateOfXMonthsBeforeFormatted(0, timezone);
    const prevMonth = getFirstDateOfXMonthsBeforeFormatted(1, timezone);
    const targetAchievementData = await getTargetsForComparison(
      userId,
      thisMonth,
      prevMonth
    );

    if (targetAchievementData == null) return null;

    const thisMonthData = targetAchievementData[thisMonth];
    const prevMonthData = targetAchievementData[prevMonth];

    return {
      thisMonth: thisMonthData,
      prevMonth: prevMonthData,
    };
  } catch (error) {
    console.log(error);
    return null;
  }
}

export async function getComparisonReports(
  userId: string,
  timezone: string,
  month?: string,
  compareToMonth?: string
): Promise<ComparisonReportResponse | null> {
  month = month ?? getFirstDateOfXMonthsBeforeFormatted(0, timezone);
  compareToMonth = compareToMonth ?? getFirstDateOfXMonthsBeforeFormatted(1, timezone);

  const [targetAchievementData, categoryExpenses] = await Promise.all([
    getTargetsForComparison(userId, month, compareToMonth),
    getExpensePerCategoryForComparison(userId, month, compareToMonth),
  ]);

  if (targetAchievementData == null) return null;

  const monthData = targetAchievementData[month];
  const compareToMonthData = targetAchievementData[compareToMonth];

  const data = {
    month: monthData.date.getMonth() + 1,
    year: monthData.date.getFullYear(),
    budgetForMonth: monthData.budget,
    totalExpenseForMonth: monthData?.expense,
    remainingBudgetForMonth: monthData.budget.minus(monthData.expense),
    compareToMonth: compareToMonthData.date.getMonth() + 1,
    compareToYear: compareToMonthData.date.getFullYear(),
    budgetForCompareToMonth: compareToMonthData.budget,
    totalExpenseForCompareToMonth: compareToMonthData.expense,
    remainingBudgetForCompareToMonth: compareToMonthData.budget.minus(
      compareToMonthData.expense
    ),
    categoryExpenses,
    maxExpense:
      categoryExpenses.length > 0
        ? Decimal.max(
            Decimal.max(...categoryExpenses.map((e) => e.amount)),
            Decimal.max(...categoryExpenses.map((e) => e.amountForCompareToMonth))
          )
        : new Decimal(0),
  };

  return data;
}

export async function getTrendingReport(
  userId: string,
  timezone: string,
  isActiveSubscription: boolean,
  startMonth?: string,
  endMonth?: string
): Promise<TrendingReportResponse> {
  if (!isActiveSubscription) {
    startMonth = getFirstDateOfXMonthsBeforeFormatted(2, timezone);
    endMonth = getFirstDateOfXMonthsBeforeFormatted(0, timezone);
  } else {
    startMonth = startMonth ?? getFirstDateOfXMonthsBeforeFormatted(5, timezone);
    endMonth = endMonth ?? getFirstDateOfXMonthsBeforeFormatted(0, timezone);
  }

  let startDate = parseDate(startMonth);
  let endDate = parseDate(endMonth);

  if (endDate < startDate) {
    [startDate, endDate] = [endDate, startDate];
  }

  const [targets, categoryExpenses] = await Promise.all([
    getTargets(userId, startDate, endDate),
    getExpensePerCategoryForTimeRange(userId, startDate, endDate),
  ]);

  const totalExpense =
    targets.length > 0 ? Decimal.sum(...targets.map((t) => t.expense)) : new Decimal(0);
  const totalIncomeEarned =
    targets.length > 0
      ? Decimal.sum(...targets.map((t) => t.incomeEarned))
      : new Decimal(0);
  const totalInvestmentDone =
    targets.length > 0
      ? Decimal.sum(...targets.map((t) => t.investmentDone))
      : new Decimal(0);

  return {
    startMonth: startDate.getMonth() + 1,
    startYear: startDate.getFullYear(),
    endMonth: endDate.getMonth() + 1,
    endYear: endDate.getFullYear(),
    targets,
    totalExpense,
    totalIncomeEarned,
    totalInvestmentDone,
    categoryExpensesByCategory: Object.fromEntries(groupBy(categoryExpenses, "category")),
  };
}

export async function getPreviousMonthBudgetPerCategory(
  userId: string,
  timezone: string
) {
  return await prisma.categoryAmount.findMany({
    select: {
      category: true,
      budget: true,
      amount: true,
    },
    where: {
      userId,
      date: { equals: getFirstDateOfXMonthsBefore(1, timezone) },
      type: { equals: "expense" },
      budget: { gt: 0 },
    },
  });
}

export async function getBudgetForCategory(
  userId: string,
  timezone: string,
  category: string
) {
  return await prisma.categoryAmount.findFirst({
    select: {
      category: true,
      budget: true,
      amount: true,
    },
    where: {
      userId,
      date: { equals: getFirstDateOfThisMonth(timezone) },
      type: { equals: "expense" },
      category: { equals: category },
    },
  });
}

export async function getTargetsForComparison(
  userId: string,
  month: string,
  compareToMonth: string
) {
  try {
    const parsedMonth = parseDate(month);
    const parsedCompareToMonth = parseDate(compareToMonth);

    const targetAchievementData = await prisma.monthlyTarget.findMany({
      select: {
        date: true,
        budget: true,
        expense: true,
      },
      where: {
        userId,
        OR: [
          { date: { equals: parsedMonth } },
          { date: { equals: parsedCompareToMonth } },
        ],
      },
    });

    let monthData = targetAchievementData.find(
      (d) => formatDate_YYY_MM(d.date) === month
    );
    monthData = monthData ?? {
      date: parseDate(month),
      budget: new Decimal(0),
      expense: new Decimal(0),
    };

    let compareToMonthData = targetAchievementData.find(
      (d) => formatDate_YYY_MM(d.date) === compareToMonth
    );
    compareToMonthData = compareToMonthData ?? {
      date: parseDate(compareToMonth),
      budget: new Decimal(0),
      expense: new Decimal(0),
    };

    return {
      [month]: monthData,
      [compareToMonth]: compareToMonthData,
    };
  } catch (error) {
    console.log(error);
    return null;
  }
}

//#region Private methods

export type CompareCategoryExpenses = {
  category: string;
  amount: Prisma.Decimal;
  amountForCompareToMonth: Prisma.Decimal;
};

async function getExpensePerCategoryForComparison(
  userId: string,
  month: string,
  compareToMonth: string
): Promise<CompareCategoryExpenses[]> {
  try {
    const parsedMonth = parseDate(month);
    const parsedCompareToMonth = parseDate(compareToMonth);

    const categoryExpenses = await prisma.categoryAmount.findMany({
      where: {
        userId,
        OR: [
          { date: { equals: parsedMonth } },
          { date: { equals: parsedCompareToMonth } },
        ],
        type: "expense",
        amount: { gt: 0 },
      },
      select: {
        date: true,
        category: true,
        amount: true,
      },
      orderBy: [{ date: "desc" }, { amount: "desc" }],
    });

    const expenses = categoryExpenses.map((categoryExpense) => {
      return {
        ...categoryExpense,
        date: formatDate_YYY_MM(categoryExpense.date),
      };
    });
    const map = groupBy(expenses, "category");

    const expensePerCategory: CompareCategoryExpenses[] = [];
    for (const category of map.keys()) {
      const expenseForMonth = map.get(category)?.find((x) => x.date === month);
      const expenseForCompareToMonth = map
        .get(category)
        ?.find((x) => x.date === compareToMonth);

      if (expenseForMonth == null && expenseForCompareToMonth != null) {
        expensePerCategory.push({
          category,
          amount: new Decimal(0),
          amountForCompareToMonth: expenseForCompareToMonth.amount,
        });
      } else if (expenseForMonth != null && expenseForCompareToMonth == null) {
        expensePerCategory.push({
          category: expenseForMonth.category,
          amount: expenseForMonth.amount,
          amountForCompareToMonth: new Decimal(0),
        });
      } else if (expenseForMonth != null && expenseForCompareToMonth != null) {
        expensePerCategory.push({
          category: expenseForMonth.category,
          amount: expenseForMonth.amount,
          amountForCompareToMonth: expenseForCompareToMonth.amount,
        });
      }
    }
    return expensePerCategory;
  } catch (error) {
    console.log(error);
    return [];
  }
}

export type CategoryExpense = {
  category: string;
  expense: Prisma.Decimal;
};

export type CategoryExpenseDate = {
  category: string;
  expense: Prisma.Decimal;
  date: string;
};

async function getExpensePerCategoryForTimeRange(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<CategoryExpenseDate[]> {
  try {
    const categoryExpenses = await prisma.categoryAmount.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
        type: "expense",
        amount: { gt: 0 },
      },
      select: {
        category: true,
        amount: true,
        date: true,
      },
      orderBy: { date: "asc" },
    });

    return categoryExpenses.map((categoryExpense) => ({
      category: categoryExpense.category,
      expense: categoryExpense.amount,
      date: formatDate_MMM_YYYY(categoryExpense.date),
    }));
  } catch (error) {
    console.log(error);
    return [];
  }
}

async function getTargets(userId: string, startDate: Date, endDate: Date) {
  const targets = await prisma.monthlyTarget.findMany({
    select: {
      date: true,
      budget: true,
      expense: true,
      income: true,
      incomeEarned: true,
      investment: true,
      investmentDone: true,
    },
    where: {
      userId,
      date: { gte: startDate, lte: endDate },
    },
    orderBy: { date: "asc" },
  });

  return targets.map((target) => {
    return {
      ...target,
      date: formatDate_MMM_YYYY(target.date),
    };
  });
}

//#endregion
