import type { LoaderFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Link, useLoaderData, useOutletContext, useTransition } from "@remix-run/react";
import { Spacer } from "~/components/Spacer";
import { getSessionData } from "~/utils/auth.utils.server";
import type { TrendingReportResponse } from "~/modules/reports/reports.service";
import { getTrendingReport } from "~/modules/reports/reports.service";
import {
  CHART_COLOR_MAP,
  EXPENSE_TYPE_COLORS,
  EXPENSE_TYPE_COLOR_MAP,
} from "~/utils/colors.utils";
import type { ReportsPageContext } from "../reports";
import { useEffect, useState } from "react";
import PieChartCard from "~/components/PieChartCard";
import MonthYearSelector from "~/components/MonthYearSelector";
import { sumOf } from "~/utils/array.utils";
import { ErrorText } from "~/components/ErrorText";
import { SuccessText } from "~/components/SuccessText";
import { Ripple } from "@rmwc/ripple";
import type { V2_MetaFunction } from "@remix-run/react/dist/routeModules";
import LineChartCard from "~/components/LineChartCard";

export const meta: V2_MetaFunction = ({ matches }) => {
  let rootModule = matches.find((match) => match.route.id === "root");
  return [...(rootModule?.meta ?? []), { title: "Trending report - Budgetsco" }];
};

export let loader: LoaderFunction = async ({ request }) => {
  try {
    const sessionData = await getSessionData(request);
    if (sessionData == null || sessionData.userId == null) {
      return redirect("/auth/login");
    }

    const { userId, timezone } = sessionData;
    const urlParams = new URL(request.url).searchParams;
    const startMonth = urlParams.get("startMonth");
    const startYear = urlParams.get("startYear");
    const endMonth = urlParams.get("endMonth");
    const endYear = urlParams.get("endYear");

    const trendingReport = await getTrendingReport(
      userId,
      timezone,
      startMonth && startYear ? `${startYear}-${startMonth.padStart(2, "0")}` : undefined,
      endMonth && endYear ? `${endYear}-${endMonth.padStart(2, "0")}` : undefined
    );

    return json(trendingReport);
  } catch (error) {
    console.log(error);
    throw error;
  }
};

export default function TrendReport() {
  const {
    startMonth,
    startYear,
    endMonth,
    endYear,
    targets,
    totalExpense,
    totalIncomeEarned,
    totalInvestmentDone,
    categoryExpensesByCategory,
  } = useLoaderData<TrendingReportResponse>();

  const transition = useTransition();
  const reportsPageContext = useOutletContext<ReportsPageContext>();

  const moneyDistribution = [
    { name: "Expense", value: Number(totalExpense.toFixed(2)) },
    { name: "Investment", value: Number(totalInvestmentDone.toFixed(2)) },
    {
      name: "Not used",
      value: Math.max(
        0,
        Number((totalIncomeEarned - totalExpense - totalInvestmentDone).toFixed(2))
      ),
    },
  ];

  const expenseDistribution = Object.entries(categoryExpensesByCategory)
    .map(([category, categoryExpenses]) => {
      return {
        name: category.toString(),
        value: sumOf(categoryExpenses, "expense"),
      };
    })
    .sort((a, b) => b.value - a.value);

  const categories = Object.keys(categoryExpensesByCategory).map((key) => ({
    label: key,
    value: key,
  }));

  const [categoryForCategoryExpenseTrend, setCategoryForCategoryExpenseTrend] = useState(
    categories[0]
  );

  useEffect(() => {
    reportsPageContext.setActiveTab("trend");
  }, [reportsPageContext]);

  useEffect(() => {
    if (transition.type === "loaderSubmission") {
      setCategoryForCategoryExpenseTrend(categories[0]);
    }
  }, [transition]);

  return (
    <div>
      <Spacer size={3} />
      <MonthYearSelector
        startMonth={startMonth}
        startYear={startYear}
        endMonth={endMonth}
        endYear={endYear}
        submitButtonName="Check Trend"
        submitAction="/reports/trend"
      />

      <Spacer />

      {totalIncomeEarned != 0 && totalExpense > totalIncomeEarned && (
        <ErrorText error="You have already spent more than you have earned" showIcon />
      )}

      {totalInvestmentDone > totalExpense && (
        <SuccessText text="???? Congrats on investing more than you spent" />
      )}

      <Spacer />

      <div className="flex flex-wrap gap-2 justify-center">
        {targets?.length ? (
          <div className="p-3 border border-gray-200 rounded-md w-full lg:w-6/12">
            <LineChartCard
              title="Budget vs Expense"
              locale={reportsPageContext.userPreferredLocale}
              currency={reportsPageContext.userPreferredCurrency}
              data={targets}
              xAxis={{ name: "Month", dataKey: "date" }}
              lines={[
                {
                  name: "Budget",
                  dataKey: "budget",
                  color: "#A16207",
                },
                {
                  name: "Expense",
                  dataKey: "expense",
                  color: "#0E7490",
                },
              ]}
            />
          </div>
        ) : null}

        <div className="p-3 border border-gray-200 rounded-md w-full lg:w-5/12">
          <PieChartCard
            title="Expense breakdown"
            data={expenseDistribution}
            total={totalExpense}
            currency={reportsPageContext.userPreferredCurrency}
            locale={reportsPageContext.userPreferredLocale}
            colHeaders={["Category", "Expense"]}
            colors={CHART_COLOR_MAP}
          />
        </div>

        {categoryExpensesByCategory != null && categoryForCategoryExpenseTrend != null ? (
          <div className="p-3 border border-gray-200 rounded-md w-full lg:w-11/12">
            <LineChartCard
              title="Expense trend for"
              locale={reportsPageContext.userPreferredLocale}
              currency={reportsPageContext.userPreferredCurrency}
              data={categoryExpensesByCategory[categoryForCategoryExpenseTrend.label]}
              xAxis={{ name: "Month", dataKey: "date" }}
              lines={[
                {
                  name: "Expense",
                  dataKey: "expense",
                  color: "#0E7490",
                },
              ]}
              children={
                <>
                  <Spacer size={1} />
                  <select
                    name="Category"
                    className="form-select select w-full"
                    value={categoryForCategoryExpenseTrend.value}
                    onChange={(e) =>
                      setCategoryForCategoryExpenseTrend({
                        label: e.target.value,
                        value: e.target.value,
                      })
                    }
                  >
                    {categories.map((category) => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </>
              }
            />

            <Spacer />
            <div className="flex justify-end">
              <Ripple>
                <Link
                  to={`/transaction/history?type=expense&category=${encodeURIComponent(
                    categoryForCategoryExpenseTrend.label
                  )}`}
                  className="w-full md:w-max text-center btn-secondary-sm whitespace-nowrap"
                >
                  View transactions
                </Link>
              </Ripple>
            </div>
          </div>
        ) : null}

        {targets?.length ? (
          <div className="p-3 border border-gray-200 rounded-md w-full lg:w-6/12">
            <LineChartCard
              title="Income vs Expense vs Investment"
              locale={reportsPageContext.userPreferredLocale}
              currency={reportsPageContext.userPreferredCurrency}
              data={targets}
              xAxis={{ name: "Month", dataKey: "date" }}
              lines={[
                {
                  name: "Income",
                  dataKey: "incomeEarned",
                  color: EXPENSE_TYPE_COLORS[2],
                },
                {
                  name: "Expense",
                  dataKey: "expense",
                  color: EXPENSE_TYPE_COLORS[0],
                },
                {
                  name: "Investment",
                  dataKey: "investmentDone",
                  color: EXPENSE_TYPE_COLORS[1],
                },
              ]}
            />
          </div>
        ) : null}

        <div className="p-3 border border-gray-200 rounded-md w-full lg:w-5/12">
          <PieChartCard
            title="How did you use your money?"
            data={moneyDistribution}
            total={Math.max(totalIncomeEarned, totalExpense + totalInvestmentDone)}
            currency={reportsPageContext.userPreferredCurrency}
            locale={reportsPageContext.userPreferredLocale}
            colors={EXPENSE_TYPE_COLOR_MAP}
            colHeaders={["Transaction type", "Amount"]}
          />
        </div>
      </div>
    </div>
  );
}
