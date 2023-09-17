import type { LoaderFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Link, useLoaderData, useNavigation, useOutletContext } from "@remix-run/react";
import { Spacer } from "~/components/Spacer";
import { getSessionData } from "~/utils/auth.utils.server";
import type { ExpenseTrendReportResponse } from "~/modules/reports/reports.service";
import { getExpenseTrendReport } from "~/modules/reports/reports.service";
import { CHART_COLOR_MAP } from "~/utils/colors.utils";
import { useEffect, useState } from "react";
import PieChartCard from "~/components/PieChartCard";
import { Ripple } from "@rmwc/ripple";
import type { V2_MetaFunction } from "@remix-run/react/dist/routeModules";
import LineChartCard from "~/components/LineChartCard";
import { calculate, max, median, sum } from "~/utils/number.utils";
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

    const trendingReport = await getExpenseTrendReport(
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

export default function ExpenseTrendReport() {
  const { targets, totalExpense, categoryExpensesByCategory, expensesByPaymentMode } =
    useLoaderData<ExpenseTrendReportResponse>();

  const navigation = useNavigation();
  const trendingReportContext = useOutletContext<TrendingReportContext>();

  const expenseDistribution = Object.entries(categoryExpensesByCategory)
    .map(([category, categoryExpenses]) => {
      return {
        name: category.toString(),
        value: sum(categoryExpenses.map((c) => c.expense)),
      };
    })
    .sort((a, b) => (calculate(b.value).minus(a.value).gt(0) ? 1 : -1));

  const categories = Object.keys(categoryExpensesByCategory).map((key) => ({
    label: key,
    value: key,
  }));

  const paymentModes = Object.keys(expensesByPaymentMode).map((key) => ({
    label: key,
    value: key,
  }));

  const [categoryForCategoryExpenseTrend, setCategoryForCategoryExpenseTrend] = useState(
    categories[0]
  );
  const [paymentModeExpenseTrendCategory, setPaymentModeExpenseTrendCategory] = useState(
    paymentModes[0]
  );

  useEffect(() => {
    trendingReportContext.setTransactionType("expense");
  }, [trendingReportContext]);

  useEffect(() => {
    if (navigation.state === "loading") {
      setCategoryForCategoryExpenseTrend(categories[0]);
      setPaymentModeExpenseTrendCategory(paymentModes[0]);
    }
  }, [navigation]);

  return (
    <>
      <div className="p-3 border border-primary rounded-md w-full lg:w-5/12">
        <PieChartCard
          title="Expense overview"
          data={expenseDistribution}
          total={totalExpense}
          currency={trendingReportContext.userPreferredCurrency}
          locale={trendingReportContext.userPreferredLocale}
          colHeaders={["Category", "Expense"]}
          colors={CHART_COLOR_MAP}
        />
      </div>

      {categoryExpensesByCategory != null && categoryForCategoryExpenseTrend != null ? (
        <div className="p-3 border border-primary rounded-md w-full lg:w-6/12">
          <LineChartCard
            title="Expense by category"
            locale={trendingReportContext.userPreferredLocale}
            currency={trendingReportContext.userPreferredCurrency}
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
                <Spacer />
                <div className="flex flex-wrap gap-2">
                  <StatisticsCard
                    name="Total"
                    num={sum(
                      categoryExpensesByCategory[
                        categoryForCategoryExpenseTrend.value
                      ].map((c) => c.expense)
                    )}
                    currency={trendingReportContext.userPreferredCurrency}
                    locale={trendingReportContext.userPreferredLocale}
                  />
                  <StatisticsCard
                    name="Max"
                    num={max(
                      ...categoryExpensesByCategory[
                        categoryForCategoryExpenseTrend.value
                      ].map((c) => c.expense)
                    )}
                    currency={trendingReportContext.userPreferredCurrency}
                    locale={trendingReportContext.userPreferredLocale}
                  />
                  <StatisticsCard
                    name="Median"
                    num={median(
                      categoryExpensesByCategory[
                        categoryForCategoryExpenseTrend.value
                      ].map((c) => c.expense)
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
        <div className="p-3 border border-primary rounded-md w-full lg:w-6/12">
          <LineChartCard
            title="Budget vs Expense"
            locale={trendingReportContext.userPreferredLocale}
            currency={trendingReportContext.userPreferredCurrency}
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

      {expensesByPaymentMode != null && paymentModeExpenseTrendCategory != null ? (
        <div className="p-3 border border-primary rounded-md w-full lg:w-5/12">
          <LineChartCard
            title="Expense by payment mode"
            locale={trendingReportContext.userPreferredLocale}
            currency={trendingReportContext.userPreferredCurrency}
            data={expensesByPaymentMode[paymentModeExpenseTrendCategory.label]}
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
                  value={paymentModeExpenseTrendCategory.value}
                  onChange={(e) =>
                    setPaymentModeExpenseTrendCategory({
                      label: e.target.value,
                      value: e.target.value,
                    })
                  }
                >
                  {paymentModes.map((paymentMode) => (
                    <option key={paymentMode.value} value={paymentMode.value}>
                      {paymentMode.label}
                    </option>
                  ))}
                </select>
                <Spacer />
                <div className="flex flex-wrap gap-2">
                  <StatisticsCard
                    name="Total"
                    num={sum(
                      expensesByPaymentMode[paymentModeExpenseTrendCategory.value].map(
                        (c) => c.expense
                      )
                    )}
                    currency={trendingReportContext.userPreferredCurrency}
                    locale={trendingReportContext.userPreferredLocale}
                  />
                  <StatisticsCard
                    name="Max"
                    num={max(
                      ...expensesByPaymentMode[paymentModeExpenseTrendCategory.value].map(
                        (c) => c.expense
                      )
                    )}
                    currency={trendingReportContext.userPreferredCurrency}
                    locale={trendingReportContext.userPreferredLocale}
                  />
                  <StatisticsCard
                    name="Median"
                    num={median(
                      expensesByPaymentMode[paymentModeExpenseTrendCategory.value].map(
                        (c) => c.expense
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
                to={`/transaction/history?type=expense&paymentMode=${encodeURIComponent(
                  paymentModeExpenseTrendCategory.label
                )}`}
                className="w-full md:w-max text-center btn-secondary-sm whitespace-nowrap"
              >
                View transactions
              </Link>
            </Ripple>
          </div>
        </div>
      ) : null}
    </>
  );
}
