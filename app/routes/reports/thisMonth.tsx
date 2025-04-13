import type { LoaderFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { Link, useLoaderData, useOutletContext, useRouteError } from "@remix-run/react";
import { getSessionData } from "~/utils/auth.utils.server";
import { Spacer } from "~/components/Spacer";
import type { ThisMonthReportResponse } from "~/modules/reports/reports.service";
import { getThisMonthReport } from "~/modules/reports/reports.service";
import { StatisticsCard } from "~/components/StatisticsCard";
import GenericError from "~/components/GenericError";
import { useEffect } from "react";
import type { ReportsPageContext } from "../reports";
import PieChartCard from "~/components/PieChartCard";
import {
  CHART_COLOR_MAP,
  EXPENSE_TYPE_COLOR_MAP,
  INVESTMENT_CHART_COLORS_MAP,
} from "~/utils/colors.utils";
import type { Currency } from "~/utils/number.utils";
import { calculate, max, subtract, formatToCurrency, sum } from "~/utils/number.utils";
import { ErrorText } from "~/components/ErrorText";
import { SuccessText } from "~/components/SuccessText";
import { Ripple } from "@rmwc/ripple";
import type {
  ErrorBoundaryComponent,
  MetaFunction,
} from "@remix-run/react/dist/routeModules";

export const meta: MetaFunction = ({ matches }) => {
  let rootModule = matches.find((match) => match.id === "root");
  return [...(rootModule?.meta ?? []), { title: "This month's report - Budgetsco" }];
};

export const ErrorBoundary: ErrorBoundaryComponent = () => {
  let error = useRouteError();
  console.log(error);
  return <GenericError />;
};

export let loader: LoaderFunction = async ({ request }) => {
  try {
    const sessionData = await getSessionData(request);
    if (sessionData == null || sessionData.userId == null) {
      return redirect("/auth/login");
    }

    const { userId, timezone } = sessionData;
    const reportsData = await getThisMonthReport(userId, timezone);

    return Response.json(reportsData, {
      status: 200,
      headers: {
        "Cache-Control": `private, max-age=${5}`,
        Vary: "cookie",
      },
    });
  } catch (error) {
    console.log(error);
    throw error;
  }
};

function getBudgetUsedPercent(budget: string, expense: string) {
  if ((budget === "0" && calculate(expense).gt(0)) || calculate(expense).gt(budget)) {
    return 100;
  }
  return calculate(budget).gt(0)
    ? calculate(expense).dividedBy(budget).mul(100).toString()
    : 0;
}

function getBudgetText(
  budget: string,
  nonPlannedExpenseCount: number,
  currency: Currency
) {
  if (budget === "0") {
    return nonPlannedExpenseCount === 1
      ? `${nonPlannedExpenseCount} category`
      : `${nonPlannedExpenseCount} categories`;
  }
  return `Budget: ${formatToCurrency(budget, "en-US", currency)}`;
}

function getBudgetLeftText(budget: string, expense: string, currency: Currency) {
  if (budget === "0") {
    return `${formatToCurrency(expense, "en-US", currency)} overspent`;
  } else if (expense === budget) {
    return "On the edge";
  } else if (calculate(expense).lessThan(budget)) {
    return `${formatToCurrency(subtract(budget, expense), "en-US", currency)} left`;
  } else {
    return `${formatToCurrency(subtract(expense, budget), "en-US", currency)} overspent`;
  }
}

function getCategoryFilter(categories: string[]) {
  const filter = [];
  for (let category of categories) {
    filter.push(`category=${encodeURIComponent(category)}`);
  }
  return filter.join("&");
}

export default function ThisMonthReport() {
  const {
    budget,
    expense,
    categoryWiseTargetExpense,
    incomeEarned,
    investmentDone,
    paymentModeExpense,
    categoryWiseTargetInvestment,
  } = useLoaderData<ThisMonthReportResponse>();
  const reportsPageContext = useOutletContext<ReportsPageContext>();

  const moneyDistribution = [
    { name: "Expense", value: expense },
    { name: "Investment", value: investmentDone },
    {
      name: "Not used",
      value: max(
        "0",
        calculate(incomeEarned).minus(expense).minus(investmentDone).toString()
      ),
    },
  ];

  const expenseDistribution = categoryWiseTargetExpense?.map((categoryExpense) => {
    return {
      name: categoryExpense.category,
      value: categoryExpense.expense,
    };
  });

  const investmentDistribution = categoryWiseTargetInvestment?.map(
    (categoryInvestment) => {
      return {
        name: categoryInvestment.category,
        value: categoryInvestment.investment,
      };
    }
  );

  const categoryBudgetExpenses = categoryWiseTargetExpense.filter((e) => e.budget != "0");
  const nonPlannedCategories = categoryWiseTargetExpense.filter((e) => e.budget == "0");

  if (nonPlannedCategories.length) {
    categoryBudgetExpenses.push({
      category: "Not planned",
      budget: "0",
      expense: sum(nonPlannedCategories.map((n) => n.expense)),
    });
  }

  useEffect(() => {
    reportsPageContext.setActiveTab("thisMonth");
  }, [reportsPageContext]);

  return (
    <div>
      <Spacer size={3} />
      <div className="flex flex-wrap gap-1 bg-elevated-10 p-3 rounded-lg">
        <StatisticsCard
          name="Budget"
          num={budget}
          color="green"
          currency={reportsPageContext.userPreferredCurrency}
          locale={reportsPageContext.userPreferredLocale}
        />
        <StatisticsCard
          name="Expense"
          num={expense}
          color="red"
          currency={reportsPageContext.userPreferredCurrency}
          locale={reportsPageContext.userPreferredLocale}
        />
        <StatisticsCard
          name="Savings"
          num={subtract(budget, expense)}
          color="blue"
          currency={reportsPageContext.userPreferredCurrency}
          locale={reportsPageContext.userPreferredLocale}
        />
      </div>

      {incomeEarned !== "0" && calculate(expense).gt(incomeEarned) && (
        <>
          <Spacer />
          <ErrorText error="You have already spent more than you have earned" showIcon />
        </>
      )}

      {calculate(investmentDone).gt(expense) && (
        <>
          <Spacer />
          <SuccessText text="🎉 Congrats on investing more than you spent" />
        </>
      )}
      <Spacer />

      <div className="grid grid-cols-[repeat(auto-fill,minmax(theme(width.72),1fr))] p-3 gap-2 justify-center bg-elevated-10 rounded-lg">
        {categoryWiseTargetExpense?.length > 0 && (
          <div className="p-3 border border-primary rounded-md w-full bg-background">
            <p className="text-xl font-bold">Budget vs Expense</p>
            <Spacer />
            {categoryBudgetExpenses.map((categoryExpense) => {
              const percentage = getBudgetUsedPercent(
                categoryExpense.budget,
                categoryExpense.expense
              );
              return (
                <Link
                  to={`/transaction/history?type=expense&${getCategoryFilter(
                    categoryExpense.budget == "0"
                      ? nonPlannedCategories.map((c) => c.category)
                      : [categoryExpense.category]
                  )}`}
                  key={categoryExpense.category}
                >
                  <Ripple>
                    <div className="p-1 rounded-md">
                      <label className="font-bold">
                        {categoryExpense.category}
                        <meter
                          className="h-4 w-full rounded-full print-color-adjust"
                          id="remainingBudget"
                          min="0"
                          max="100"
                          low={75}
                          high={90}
                          value={percentage}
                          title="percent"
                        />
                      </label>

                      <div className="flex">
                        <p className="text-primary">
                          {getBudgetText(
                            categoryExpense.budget,
                            nonPlannedCategories.length,
                            reportsPageContext.userPreferredCurrency
                          )}
                        </p>
                        <span className="grow"></span>
                        <p className="text-primary">
                          {getBudgetLeftText(
                            categoryExpense.budget,
                            categoryExpense.expense,
                            reportsPageContext.userPreferredCurrency
                          )}
                        </p>
                      </div>
                      <Spacer />
                    </div>
                  </Ripple>
                </Link>
              );
            })}
          </div>
        )}

        <div className="p-3 border border-primary rounded-md w-full bg-background">
          <PieChartCard
            title="Expense breakdown"
            data={expenseDistribution}
            total={expense}
            currency={reportsPageContext.userPreferredCurrency}
            locale={reportsPageContext.userPreferredLocale}
            colHeaders={["Category", "Expense"]}
            colors={CHART_COLOR_MAP}
          />
        </div>

        <div className="p-3 border border-primary rounded-md w-full bg-background">
          <PieChartCard
            title="How did you use your money?"
            data={moneyDistribution}
            total={max(incomeEarned, calculate(expense).plus(investmentDone).toString())}
            currency={reportsPageContext.userPreferredCurrency}
            locale={reportsPageContext.userPreferredLocale}
            colors={EXPENSE_TYPE_COLOR_MAP}
            zeroTotalInfoMsg="Add this month's income to see the chart"
            colHeaders={["Transaction type", "Amount"]}
          />
        </div>

        <div className="p-3 border border-primary rounded-md w-full bg-background">
          <PieChartCard
            title="What did you use to pay?"
            data={paymentModeExpense}
            total={expense}
            currency={reportsPageContext.userPreferredCurrency}
            locale={reportsPageContext.userPreferredLocale}
            colHeaders={["Payment mode", "Amount"]}
            colors={CHART_COLOR_MAP}
          />
        </div>

        {calculate(investmentDone).gt(0) && (
          <div className="p-3 border border-primary rounded-md w-full bg-background">
            <PieChartCard
              title="Investment breakdown"
              data={investmentDistribution}
              total={investmentDone}
              currency={reportsPageContext.userPreferredCurrency}
              locale={reportsPageContext.userPreferredLocale}
              colHeaders={["Category", "Investment"]}
              colors={INVESTMENT_CHART_COLORS_MAP}
            />
          </div>
        )}
      </div>
    </div>
  );
}
