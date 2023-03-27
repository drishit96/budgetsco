import type { LoaderFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useOutletContext } from "@remix-run/react";
import { getSessionData } from "~/utils/auth.utils.server";
import { Spacer } from "~/components/Spacer";
import type { ComparisonReportResponse } from "~/modules/reports/reports.service";
import { getComparisonReports } from "~/modules/reports/reports.service";
import { StatisticsCard } from "~/components/StatisticsCard";
import { format_MMMM_YYYY, format_MMM_YYYY } from "~/utils/date.utils";
import { useEffect } from "react";
import type { ReportsPageContext } from "../reports";
import MonthYearSelector from "~/components/MonthYearSelector";
import { abs, calculate, formatToCurrency } from "~/utils/number.utils";
import Bar from "~/components/Bar";
import type { V2_MetaFunction } from "@remix-run/react/dist/routeModules";

export const meta: V2_MetaFunction = ({ matches }) => {
  let rootModule = matches.find((match) => match.route.id === "root");
  return [...(rootModule?.meta ?? []), { title: "Compare reports - Budgetsco" }];
};

export let loader: LoaderFunction = async ({ request }) => {
  try {
    const sessionData = await getSessionData(request);
    if (sessionData == null || sessionData.userId == null) {
      return redirect("/auth/login");
    }

    const { userId, timezone } = sessionData;
    const urlParams = new URL(request.url).searchParams;
    const month = urlParams.get("startMonth");
    const year = urlParams.get("startYear");
    const compareToMonth = urlParams.get("endMonth");
    const compareToYear = urlParams.get("endYear");

    const reportsData = await getComparisonReports(
      userId,
      timezone,
      month && year ? `${year}-${month.padStart(2, "0")}` : undefined,
      compareToMonth && compareToYear
        ? `${compareToYear}-${compareToMonth.padStart(2, "0")}`
        : undefined
    );

    return json(reportsData, {
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

export default function CompareReport() {
  const {
    month,
    year,
    budgetForMonth,
    totalExpenseForMonth,
    remainingBudgetForMonth,
    compareToMonth,
    compareToYear,
    budgetForCompareToMonth,
    totalExpenseForCompareToMonth,
    remainingBudgetForCompareToMonth,
    categoryExpenses,
    maxExpense,
  } = useLoaderData<ComparisonReportResponse>();
  const reportsPageContext = useOutletContext<ReportsPageContext>();

  useEffect(() => {
    reportsPageContext.setActiveTab("compare");
  }, [reportsPageContext]);

  return (
    <div>
      <Spacer size={3} />
      <MonthYearSelector
        startMonth={month}
        startYear={year}
        endMonth={compareToMonth}
        endYear={compareToYear}
        submitButtonName="Compare"
        submitAction="/reports/compare"
      />

      <Spacer />

      <div className="flex flex-wrap gap-1">
        <StatisticsCard
          name="Budget"
          num={budgetForMonth}
          color="green"
          positiveIsBetter={true}
          perc={calculate(budgetForMonth)
            .minus(budgetForCompareToMonth)
            .dividedBy(abs(budgetForCompareToMonth))
            .mul(100)
            .toNumber()}
          currency={reportsPageContext.userPreferredCurrency}
          locale={reportsPageContext.userPreferredLocale}
        />

        <StatisticsCard
          name="Expense"
          num={totalExpenseForMonth}
          color="red"
          positiveIsBetter={false}
          perc={calculate(totalExpenseForMonth)
            .minus(totalExpenseForCompareToMonth)
            .dividedBy(abs(totalExpenseForCompareToMonth))
            .mul(100)
            .toNumber()}
          currency={reportsPageContext.userPreferredCurrency}
          locale={reportsPageContext.userPreferredLocale}
        />

        <StatisticsCard
          name="Savings"
          num={remainingBudgetForMonth}
          color="blue"
          positiveIsBetter={true}
          perc={calculate(remainingBudgetForMonth)
            .minus(remainingBudgetForCompareToMonth)
            .dividedBy(abs(remainingBudgetForCompareToMonth))
            .mul(100)
            .toNumber()}
          currency={reportsPageContext.userPreferredCurrency}
          locale={reportsPageContext.userPreferredLocale}
        />
      </div>

      <br />

      <div className="flex flex-wrap gap-2 justify-center">
        {categoryExpenses?.length && (
          <div className="p-3 border border-gray-200 rounded-md w-full">
            <p className="text-xl font-bold text-gray-700">Expense per category</p>
            <Spacer />
            {categoryExpenses.map((categoryExpense) => {
              return (
                <div key={categoryExpense.category}>
                  <p className="font-bold text-gray-700">{categoryExpense.category}</p>

                  <div className="flex">
                    <p className="text-gray-700">{format_MMM_YYYY(month - 1, year)}</p>
                    <span className="flex-grow"></span>
                    <p className="text-gray-700">
                      {formatToCurrency(
                        categoryExpense.amount,
                        "en-US",
                        reportsPageContext.userPreferredCurrency
                      )}
                    </p>
                  </div>
                  <Spacer size={0.5} />
                  <Bar
                    percentage={calculate(categoryExpense.amount)
                      .dividedBy(maxExpense)
                      .mul(100)
                      .toNumber()}
                    color="bg-cyan-700"
                  />
                  <Spacer size={0.5} />
                  <Bar
                    percentage={calculate(categoryExpense.amountForCompareToMonth)
                      .dividedBy(maxExpense)
                      .mul(100)
                      .toNumber()}
                    color="bg-yellow-700"
                  />
                  <Spacer size={0.5} />
                  <div className="flex">
                    <p className="text-gray-700">
                      {format_MMMM_YYYY(compareToMonth - 1, compareToYear)}
                    </p>
                    <span className="flex-grow"></span>
                    <p className="text-gray-700">
                      {formatToCurrency(
                        categoryExpense.amountForCompareToMonth,
                        "en-US",
                        reportsPageContext.userPreferredCurrency
                      )}
                    </p>
                  </div>
                  <Spacer />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
