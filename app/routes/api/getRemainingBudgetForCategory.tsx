import type { LoaderFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { getBudgetForCategory } from "~/modules/reports/reports.service";
import { getSessionData } from "~/utils/auth.utils.server";
import { isNullOrEmpty } from "~/utils/text.utils";

export let loader: LoaderFunction = async ({ request }): Promise<any> => {
  const sessionData = await getSessionData(request);
  if (sessionData == null || sessionData.userId == null) {
    return redirect("/auth/login");
  }

  const { userId, timezone } = sessionData;
  const urlParams = new URL(request.url).searchParams;
  const category = urlParams.get("category");

  if (isNullOrEmpty(category)) return new Response("Bad request", { status: 400 });

  const categoryBudget = await getBudgetForCategory(userId, timezone, category);
  if (categoryBudget == null || categoryBudget.budget == null) {
    return { [category]: null };
  }

  return {
    [category]: categoryBudget.budget.minus(categoryBudget.amount).toString(),
  };
};
