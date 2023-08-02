import type { LoaderFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Link, useLoaderData, useNavigation, useOutletContext } from "@remix-run/react";
import { Spacer } from "~/components/Spacer";
import { getSessionData } from "~/utils/auth.utils.server";
import type { IncomeTrendReportResponse } from "~/modules/reports/reports.service";
import { getIncomeTrendReport } from "~/modules/reports/reports.service";
import {
  CHART_COLOR_MAP,
  EXPENSE_TYPE_COLORS,
  EXPENSE_TYPE_COLOR_MAP,
} from "~/utils/colors.utils";
import { useEffect, useState } from "react";
import PieChartCard from "~/components/PieChartCard";
import { Ripple } from "@rmwc/ripple";
import type { V2_MetaFunction } from "@remix-run/react/dist/routeModules";
import LineChartCard from "~/components/LineChartCard";
import { add, avg, calculate, max, sum } from "~/utils/number.utils";
import type { TrendingReportContext } from "../trend";
import { StatisticsCard } from "~/components/StatisticsCard";
import { logError } from "~/utils/logger.utils.server";

export const meta: V2_MetaFunction = ({ matches }) => {
  let rootModule = matches.find((match) => match.id === "root");
  return [...(rootModule?.meta ?? []), { title: "Trending report - Budgetsco" }];
};

export let loader: LoaderFunction = async ({ request }) => {
  try {
    const sessionData = await getSessionData(request);
    if (sessionData == null || sessionData.userId == null) {
      return redirect("/auth/login");
    }

    const { userId, timezone, isActiveSubscription } = sessionData;
    const urlParams = new URL(request.url).searchParams;
    const startMonth = urlParams.get("startMonth");
    const startYear = urlParams.get("startYear");
    const endMonth = urlParams.get("endMonth");
    const endYear = urlParams.get("endYear");

    const trendingReport = await getIncomeTrendReport(
      userId,
      timezone,
      isActiveSubscription,
      startMonth && startYear ? `${startYear}-${startMonth.padStart(2, "0")}` : undefined,
      endMonth && endYear ? `${endYear}-${endMonth.padStart(2, "0")}` : undefined
    );

    return json(trendingReport);
  } catch (error) {
    logError(error);
    throw error;
  }
};

export default function IncomeTrendReport() {
  const {
    targets,
    totalExpense,
    totalIncomeEarned,
    totalInvestmentDone,
    categoryIncomeByCategory: categoryIncomesByCategory,
  } = useLoaderData<IncomeTrendReportResponse>();

  const navigation = useNavigation();
  const trendingReportContext = useOutletContext<TrendingReportContext>();

  const incomeDistribution = Object.entries(categoryIncomesByCategory)
    .map(([category, categoryIncomes]) => {
      return {
        name: category.toString(),
        value: sum(categoryIncomes.map((c) => c.income)),
      };
    })
    .sort((a, b) => (calculate(b.value).minus(a.value).gt(0) ? 1 : -1));

  const moneyDistribution = [
    { name: "Expense", value: calculate(totalExpense).toFixed(2) },
    { name: "Investment", value: calculate(totalInvestmentDone).toFixed(2) },
    {
      name: "Not used",
      value: max(
        "0",
        calculate(totalIncomeEarned)
          .minus(totalExpense)
          .minus(totalInvestmentDone)
          .toFixed(2)
          .toString()
      ),
    },
  ];

  const categories = Object.keys(categoryIncomesByCategory).map((key) => ({
    label: key,
    value: key,
  }));

  const [categoryForCategoryIncomeTrend, setCategoryForCategoryIncomeTrend] = useState(
    categories[0]
  );

  useEffect(() => {
    trendingReportContext.setTransactionType("income");
  }, [trendingReportContext]);

  useEffect(() => {
    if (navigation.state === "loading") {
      setCategoryForCategoryIncomeTrend(categories[0]);
    }
  }, [navigation]);

  return (
    <>
      <div className="p-3 border border-primary rounded-md w-full lg:w-5/12">
        <PieChartCard
          title="Income sources"
          data={incomeDistribution}
          total={totalIncomeEarned}
          currency={trendingReportContext.userPreferredCurrency}
          locale={trendingReportContext.userPreferredLocale}
          colHeaders={["Category", "Income"]}
          colors={CHART_COLOR_MAP}
        />
      </div>
      {categoryIncomesByCategory != null && categoryForCategoryIncomeTrend != null ? (
        <div className="p-3 border border-primary rounded-md w-full lg:w-6/12">
          <LineChartCard
            title="Income trend for"
            locale={trendingReportContext.userPreferredLocale}
            currency={trendingReportContext.userPreferredCurrency}
            data={categoryIncomesByCategory[categoryForCategoryIncomeTrend.label]}
            xAxis={{ name: "Month", dataKey: "date" }}
            lines={[
              {
                name: "Income",
                dataKey: "income",
                color: "#0E7490",
              },
            ]}
            children={
              <>
                <Spacer size={1} />
                <select
                  name="Category"
                  className="form-select select w-full"
                  value={categoryForCategoryIncomeTrend.value}
                  onChange={(e) =>
                    setCategoryForCategoryIncomeTrend({
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
                <Spacer />
                <div className="flex flex-wrap gap-2">
                  <StatisticsCard
                    name="Total"
                    num={sum(
                      categoryIncomesByCategory[categoryForCategoryIncomeTrend.value].map(
                        (c) => c.income
                      )
                    )}
                    currency={trendingReportContext.userPreferredCurrency}
                    locale={trendingReportContext.userPreferredLocale}
                  />
                  <StatisticsCard
                    name="Max"
                    num={max(
                      ...categoryIncomesByCategory[
                        categoryForCategoryIncomeTrend.value
                      ].map((c) => c.income)
                    )}
                    currency={trendingReportContext.userPreferredCurrency}
                    locale={trendingReportContext.userPreferredLocale}
                  />
                  <StatisticsCard
                    name="Average"
                    num={avg(
                      categoryIncomesByCategory[categoryForCategoryIncomeTrend.value].map(
                        (c) => c.income
                      )
                    )}
                    currency={trendingReportContext.userPreferredCurrency}
                    locale={trendingReportContext.userPreferredLocale}
                  />
                </div>
              </>
            }
          />

          <Spacer />
          <div className="flex justify-end">
            <Ripple>
              <Link
                to={`/transaction/history?type=income&category=${encodeURIComponent(
                  categoryForCategoryIncomeTrend.label
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
        <div className="p-3 border border-primary rounded-md w-full lg:w-6/12">
          <LineChartCard
            title="Income vs Expense vs Investment"
            locale={trendingReportContext.userPreferredLocale}
            currency={trendingReportContext.userPreferredCurrency}
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

      <div className="p-3 border border-primary rounded-md w-full lg:w-5/12">
        <PieChartCard
          title="How did you use your money?"
          data={moneyDistribution}
          total={max(totalIncomeEarned, add(totalExpense, totalInvestmentDone))}
          currency={trendingReportContext.userPreferredCurrency}
          locale={trendingReportContext.userPreferredLocale}
          colors={EXPENSE_TYPE_COLOR_MAP}
          colHeaders={["Transaction type", "Amount"]}
        />
      </div>
    </>
  );
}
