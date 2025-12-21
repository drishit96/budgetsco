import { subMonths } from "date-fns";
import { z } from "zod";
import prisma from "~/lib/prisma";
import { formatDate_YYY_MM, getFirstDateOfThisMonth } from "~/utils/date.utils";
import {
  AIUsageData,
  generateStructuredObject,
} from "~/modules/ai/ai.service";
import { AIProviderConfig } from "~/modules/ai/aiProvider.schema";

export interface BudgetEstimate {
  category: string;
  budget: string;
  index: string;
}

const budgetEstimateSchema = z.object({
  budgets: z.array(
    z.object({
      category: z.string().describe("The exact category name from historical data"),
      budget: z
        .string()
        .describe("Estimated budget amount as a string with up to 2 decimal places"),
    })
  ),
});

export async function estimateBudgetWithAI(
  userId: string,
  timezone: string,
  aiConfig: AIProviderConfig
): Promise<{
  budgets: BudgetEstimate[];
  usage: AIUsageData;
}> {
  const currentMonthDate = getFirstDateOfThisMonth(timezone);

  const lastMonth = subMonths(currentMonthDate, 1);
  const twoMonthsAgo = subMonths(currentMonthDate, 2);
  const threeMonthsAgo = subMonths(currentMonthDate, 3);
  const previousYearSameMonth = subMonths(currentMonthDate, 12);

  const getLast3MonthsData = prisma.categoryAmount.findMany({
    where: {
      userId,
      type: "expense",
      date: {
        in: [lastMonth, twoMonthsAgo, threeMonthsAgo],
      },
      amount: { gt: 0 },
    },
    select: {
      category: true,
      amount: true,
      date: true,
    },
    orderBy: [{ date: "desc" }, { category: "asc" }],
  });

  const getPreviousYearData = prisma.categoryAmount.findMany({
    where: {
      userId,
      type: "expense",
      date: previousYearSameMonth,
      amount: { gt: 0 },
    },
    select: {
      category: true,
      amount: true,
    },
    orderBy: { category: "asc" },
  });

  const [last3MonthsData, previousYearData] = await Promise.all([
    getLast3MonthsData,
    getPreviousYearData,
  ]);

  if (last3MonthsData.length === 0 && previousYearData.length === 0) {
    throw new Error("No historical expense data found to generate estimates.");
  }

  const last3MonthsCSV =
    last3MonthsData.length > 0
      ? `category,amount,month\n${last3MonthsData
          .map(
            (item) => `${item.category},${item.amount},${formatDate_YYY_MM(item.date)}`
          )
          .join("\n")}`
      : "";

  const previousYearCSV =
    previousYearData.length > 0
      ? `category,amount,month\n${previousYearData
          .map(
            (item) =>
              `${item.category},${item.amount},${formatDate_YYY_MM(
                previousYearSameMonth
              )}`
          )
          .join("\n")}`
      : "";

  const prompt = `You are a financial advisor helping to estimate monthly budget allocations based on historical spending patterns.

Historical Data:
Last 3 Months Expenses by Category (CSV format):
${last3MonthsCSV}

${
  previousYearCSV
    ? `Previous Year Same Month Expenses (CSV format):\n${previousYearCSV}`
    : ""
}

Based on this historical data, estimate the budget for each category for the current month. Consider:
1. Recent spending trends from the last 3 months
2. Seasonal patterns from the previous year's same month (if available)
3. Any noticeable increasing or decreasing trends
4. Provide reasonable estimates that account for typical variations

Important:
- Use the exact category names from the historical data
- Round amounts to the nearest tenth, e.g., round 47 to 50
- If a category seems to be a one-time expense, do not include it in the budget`;

  const { object, usage } = await generateStructuredObject(
    aiConfig,
    budgetEstimateSchema,
    prompt,
    0.3
  );

  const formattedBudgets: BudgetEstimate[] = object.budgets.map((c) => {
    return { ...c, index: c.category };
  });

  return {
    budgets: formattedBudgets,
    usage,
  };
}
