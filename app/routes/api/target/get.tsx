import { LoaderFunction } from "@remix-run/node";
import { parseBudgetFilterInput } from "~/modules/settings/settings.schema";
import {
  getBudgetPerCategoryByMonth,
  getExpenseTargets,
} from "~/modules/transaction/transaction.service";
import { getSessionData } from "~/utils/auth.utils.server";
import { logError } from "~/utils/logger.utils.server";

export let loader: LoaderFunction = async ({ request }) => {
  try {
    if (request.method !== "GET") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    const sessionData = await getSessionData(request);
    if (sessionData == null || sessionData.userId == null) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = sessionData;
    const urlSearchParams = new URL(request.url).searchParams;
    const startMonth = urlSearchParams.get("startMonth");
    const endMonth = urlSearchParams.get("endMonth");
    const breakDownByCategory = urlSearchParams.get("breakDownByCategory") === "true";

    const { errors, data: budgetFilter } = parseBudgetFilterInput({
      startMonth,
      endMonth,
      breakDownByCategory,
    });

    if (errors) {
      return Response.json({ errors }, { status: 400 });
    }

    if (budgetFilter.breakDownByCategory) {
      const categoryWiseBudget = await getBudgetPerCategoryByMonth(
        userId,
        budgetFilter.startMonth,
        budgetFilter.endMonth
      );
      if (categoryWiseBudget == null) {
        return Response.json({ error: "No budget found" }, { status: 200 });
      }
      return Response.json(categoryWiseBudget);
    } else {
      const budget = await getExpenseTargets(
        userId,
        budgetFilter.startMonth,
        budgetFilter.endMonth
      );
      if (budget == null) {
        return Response.json({ error: "No budget found" }, { status: 200 });
      }
      return Response.json(budget);
    }
  } catch (error) {
    logError(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
};
