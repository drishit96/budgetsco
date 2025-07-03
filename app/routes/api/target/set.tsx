import { ActionFunction, redirect } from "@remix-run/node";
import { EventNames } from "~/lib/anaytics.contants";
import { parseBudgetInput } from "~/modules/settings/settings.schema";
import {
  editMonthlyTarget,
  addNewCustomCategories,
} from "~/modules/transaction/transaction.service";
import { trackEvent } from "~/utils/analytics.utils.server";
import { getSessionData } from "~/utils/auth.utils.server";
import { getCategoriesByTransactionType } from "~/utils/category.utils";
import { formatDate_YYY_MM, getFirstDateOfThisMonth } from "~/utils/date.utils";
import { logError } from "~/utils/logger.utils.server";

export let action: ActionFunction = async ({ request }) => {
  try {
    const sessionData = await getSessionData(request);
    if (sessionData == null || sessionData.userId == null) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId, timezone } = sessionData;

    if (request.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    const body = await request.json();
    const breakdown = body.breakdown;

    const { errors, data: parsedBudget } = parseBudgetInput({
      breakdown,
    });

    if (errors) {
      return Response.json({ error: errors }, { status: 400 });
    }

    const tasks: Promise<boolean>[] = [];
    const editMonthlyTargetTask = editMonthlyTarget(
      userId,
      timezone,
      { budget: parsedBudget.total },
      new Map(Object.entries(parsedBudget.breakdown))
    );
    tasks.push(editMonthlyTargetTask);

    const presetCategories = new Set(getCategoriesByTransactionType("expense"));
    const customCategories: string[] = [];
    Object.keys(parsedBudget.breakdown).forEach((category) => {
      if (!presetCategories.has(category.trim())) {
        customCategories.push(category);
      }
    });

    if (customCategories.length > 0) {
      tasks.push(addNewCustomCategories(userId, "expense", customCategories));
    }

    const isTargetSaved = await editMonthlyTargetTask;
    if (isTargetSaved) {
      trackEvent(request, EventNames.BUDGET_EDITED, {
        month: formatDate_YYY_MM(getFirstDateOfThisMonth(timezone)),
        numberOfCategoriesModified: Object.keys(parsedBudget.breakdown).length.toString(),
      });
      return Response.json({ success: true });
    }

    return Response.json({ success: false }, { status: 500 });
  } catch (error) {
    logError(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
};
