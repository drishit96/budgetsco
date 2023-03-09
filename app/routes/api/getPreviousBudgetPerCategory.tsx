import type { LoaderFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { getPreviousMonthBudgetPerCategory } from "~/modules/reports/reports.service";
import { getSessionData } from "~/utils/auth.utils.server";

export let loader: LoaderFunction = async ({ request }): Promise<any> => {
  const sessionData = await getSessionData(request);
  if (sessionData == null || sessionData.userId == null) {
    return redirect("/auth/login");
  }

  const { userId, timezone } = sessionData;
  const budgetPerCategoryList = await getPreviousMonthBudgetPerCategory(
    userId,
    timezone
  );
  return json(
    budgetPerCategoryList.map((c) => {
      return { ...c, index: c.category };
    })
  );
};
