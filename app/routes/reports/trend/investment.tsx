import type { LoaderFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Link, useLoaderData, useNavigation, useOutletContext } from "@remix-run/react";
import { Spacer } from "~/components/Spacer";
import { getSessionData } from "~/utils/auth.utils.server";
import type { InvestmentTrendReportResponse } from "~/modules/reports/reports.service";
import { getInvestmentTrendReport } from "~/modules/reports/reports.service";
import { INVESTMENT_CHART_COLORS_MAP } from "~/utils/colors.utils";
import { useEffect, useState } from "react";
import PieChartCard from "~/components/PieChartCard";
import { Ripple } from "@rmwc/ripple";
import type { V2_MetaFunction } from "@remix-run/react/dist/routeModules";
import LineChartCard from "~/components/LineChartCard";
import { avg, calculate, max, sum } from "~/utils/number.utils";
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

    const trendingReport = await getInvestmentTrendReport(
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

export default function InvestmentTrendReport() {
  const { totalInvestmentDone, categoryInvestmentsByCategory } =
    useLoaderData<InvestmentTrendReportResponse>();

  const navigation = useNavigation();
  const trendingReportContext = useOutletContext<TrendingReportContext>();

  const investmentDistribution = Object.entries(categoryInvestmentsByCategory)
    .map(([category, categoryInvestments]) => {
      return {
        name: category.toString(),
        value: sum(categoryInvestments.map((c) => c.investment)),
      };
    })
    .sort((a, b) => (calculate(b.value).minus(a.value).gt(0) ? 1 : -1));

  const categories = Object.keys(categoryInvestmentsByCategory).map((key) => ({
    label: key,
    value: key,
  }));

  const [categoryForCategoryInvestmentTrend, setCategoryForCategoryInvestmentTrend] =
    useState(categories[0]);

  useEffect(() => {
    trendingReportContext.setTransactionType("investment");
  }, [trendingReportContext]);

  useEffect(() => {
    if (navigation.state === "loading") {
      setCategoryForCategoryInvestmentTrend(categories[0]);
    }
  }, [navigation]);

  return (
    <>
      <div className="p-3 border border-primary rounded-md w-full lg:w-5/12">
        <PieChartCard
          title="Investment breakdown"
          data={investmentDistribution}
          total={totalInvestmentDone}
          currency={trendingReportContext.userPreferredCurrency}
          locale={trendingReportContext.userPreferredLocale}
          colHeaders={["Category", "Investment"]}
          colors={INVESTMENT_CHART_COLORS_MAP}
        />
      </div>

      {categoryInvestmentsByCategory != null &&
      categoryForCategoryInvestmentTrend != null ? (
        <div className="p-3 border border-primary rounded-md w-full lg:w-6/12">
          <LineChartCard
            title="Investment trend for"
            locale={trendingReportContext.userPreferredLocale}
            currency={trendingReportContext.userPreferredCurrency}
            data={categoryInvestmentsByCategory[categoryForCategoryInvestmentTrend.label]}
            xAxis={{ name: "Month", dataKey: "date" }}
            lines={[
              {
                name: "Investment",
                dataKey: "investment",
                color: "#0E7490",
              },
            ]}
            children={
              <>
                <Spacer size={1} />
                <select
                  name="Category"
                  className="form-select select w-full"
                  value={categoryForCategoryInvestmentTrend.value}
                  onChange={(e) =>
                    setCategoryForCategoryInvestmentTrend({
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
                      categoryInvestmentsByCategory[
                        categoryForCategoryInvestmentTrend.value
                      ].map((c) => c.investment)
                    )}
                    currency={trendingReportContext.userPreferredCurrency}
                    locale={trendingReportContext.userPreferredLocale}
                  />
                  <StatisticsCard
                    name="Max"
                    num={max(
                      ...categoryInvestmentsByCategory[
                        categoryForCategoryInvestmentTrend.value
                      ].map((c) => c.investment)
                    )}
                    currency={trendingReportContext.userPreferredCurrency}
                    locale={trendingReportContext.userPreferredLocale}
                  />
                  <StatisticsCard
                    name="Average"
                    num={avg(
                      categoryInvestmentsByCategory[
                        categoryForCategoryInvestmentTrend.value
                      ].map((c) => c.investment)
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
                to={`/transaction/history?type=investment&category=${encodeURIComponent(
                  categoryForCategoryInvestmentTrend.label
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
