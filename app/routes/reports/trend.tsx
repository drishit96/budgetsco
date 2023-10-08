import type { LoaderFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import {
  Link,
  Outlet,
  useLoaderData,
  useLocation,
  useOutletContext,
} from "@remix-run/react";
import { Spacer } from "~/components/Spacer";
import { getSessionData } from "~/utils/auth.utils.server";
import type { ReportsPageContext } from "../reports";
import { useEffect, useState } from "react";
import MonthYearSelector from "~/components/MonthYearSelector";
import type { V2_MetaFunction } from "@remix-run/react/dist/routeModules";
import type { TransactionType } from "~/modules/transaction/transaction.schema";
import { getFirstDateOfXMonthsBeforeFormatted, parseDate } from "~/utils/date.utils";
import { Ripple } from "@rmwc/ripple";
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

    const url = new URL(request.url);
    if (url.pathname.endsWith("trend") || url.pathname.endsWith("trend/")) {
      return redirect("/reports/trend/expense");
    }

    const { timezone } = sessionData;
    const urlParams = url.searchParams;
    let startMonth = urlParams.get("startMonth");
    let startYear = urlParams.get("startYear");
    let endMonth = urlParams.get("endMonth");
    let endYear = urlParams.get("endYear");

    startMonth =
      startMonth && startYear ? `${startYear}-${startMonth.padStart(2, "0")}` : null;
    endMonth = endMonth && endYear ? `${endYear}-${endMonth.padStart(2, "0")}` : null;

    startMonth = startMonth ?? getFirstDateOfXMonthsBeforeFormatted(5, timezone);
    endMonth = endMonth ?? getFirstDateOfXMonthsBeforeFormatted(0, timezone);

    const startDate = parseDate(startMonth);
    const endDate = parseDate(endMonth);

    return json({
      startMonth: startDate.getMonth() + 1,
      startYear: startDate.getFullYear(),
      endMonth: endDate.getMonth() + 1,
      endYear: endDate.getFullYear(),
    });
  } catch (error) {
    logError(error);
    throw error;
  }
};

export type TrendingReportContext = {
  setTransactionType: React.Dispatch<React.SetStateAction<TransactionType>>;
} & ReportsPageContext;

export default function TrendReport() {
  const { startMonth, startYear, endMonth, endYear } = useLoaderData<{
    startMonth: number;
    startYear: number;
    endMonth: number;
    endYear: number;
  }>();

  const location = useLocation();
  const [transactionType, setTransactionType] = useState<TransactionType>("expense");
  const reportsPageContext = useOutletContext<ReportsPageContext>();
  const trendingReportContext: TrendingReportContext = {
    setTransactionType,
    ...reportsPageContext,
  };

  useEffect(() => {
    reportsPageContext.setActiveTab("trend");
  }, [reportsPageContext]);

  return (
    <div>
      <Spacer size={3} />
      <MonthYearSelector
        startMonth={startMonth}
        startYear={startYear}
        endMonth={endMonth}
        endYear={endYear}
        submitButtonName="Check Trend"
        submitAction={`/reports/trend/${transactionType}`}
        isSubscriptionRequired={!reportsPageContext.isActiveSubscription}
        context={reportsPageContext}
      />

      <Spacer size={3} />

      <div className="flex justify-center">
        <div className="flex grow max-w-md">
          <Link
            className="w-1/3"
            to={"/reports/trend/expense" + (location?.search ?? "")}
            replace
          >
            <Ripple>
              <p
                className={`pt-1 pb-1 text-sm font-bold sm:text-base sm:font-normal text-center border-l border-t border-b border-emerald-700 rounded-l-full focus-ring ${
                  transactionType === "expense"
                    ? "bg-emerald-700 text-white"
                    : "text-accent"
                }`}
              >
                Expense
              </p>
            </Ripple>
          </Link>
          <Link
            className="w-1/3"
            to={`/reports/trend/investment` + (location?.search ?? "")}
            replace
          >
            <Ripple>
              <p
                className={`pt-1 pb-1 text-sm font-bold sm:text-base sm:font-normal text-center border border-emerald-700 ${
                  transactionType === "investment"
                    ? "bg-emerald-700 text-white"
                    : "text-accent"
                }`}
              >
                Investment
              </p>
            </Ripple>
          </Link>
          <Link
            className="w-1/3"
            to={`/reports/trend/income` + (location?.search ?? "")}
            replace
          >
            <Ripple>
              <p
                className={`pt-1 pb-1 text-sm font-bold sm:text-base sm:font-normal text-center border-r border-t border-b border-emerald-700 rounded-r-full ${
                  transactionType === "income"
                    ? "bg-emerald-700 text-white"
                    : "text-accent"
                }`}
              >
                Income
              </p>
            </Ripple>
          </Link>
        </div>
      </div>

      <Spacer size={3} />

      <div className="flex flex-wrap gap-2 justify-center">
        <Outlet context={trendingReportContext} />
      </div>
    </div>
  );
}
