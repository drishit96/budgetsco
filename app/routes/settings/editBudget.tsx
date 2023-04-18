import type { AppContext } from "~/root";
import TargetSetter from "~/components/TargetSetter";
import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useActionData, useLoaderData, useOutletContext } from "@remix-run/react";
import {
  addNewCustomCategories,
  editMonthlyTarget,
  getBudgetPerCategoryThisMonth,
  getCurrentMonthTarget,
} from "~/modules/transaction/transaction.service";
import { getSessionData } from "~/utils/auth.utils.server";
import {
  parseMonthlyTargetInput,
  parseMonthlyCategoryWiseTargetInput,
} from "~/modules/transaction/transaction.schema";
import { useEffect } from "react";
import useConfirmOnBackPress from "~/lib/useConfirmOnBackPress.hook";
import type { V2_MetaFunction } from "@remix-run/react/dist/routeModules";
import { trackEvent } from "~/utils/analytics.utils.server";
import { EventNames } from "~/lib/anaytics.contants";
import { formatDate_MMM_YYYY, getFirstDateOfThisMonth } from "~/utils/date.utils";

export const meta: V2_MetaFunction = ({ matches }) => {
  let rootModule = matches.find((match) => match.id === "root");
  return [...(rootModule?.meta ?? []), { title: "Edit budget - Budgetsco" }];
};

export const loader: LoaderFunction = async ({ request }) => {
  const sessionData = await getSessionData(request);
  if (sessionData == null || sessionData.userId == null) {
    return redirect("/auth/login");
  }

  const { userId, timezone } = sessionData;
  const [currentMonthTarget, budgetPerCategoryThisMonth] = await Promise.all([
    getCurrentMonthTarget(userId, timezone),
    getBudgetPerCategoryThisMonth(userId, timezone),
  ]);

  if (currentMonthTarget == null) {
    return redirect("/settings/createBudget");
  }

  return budgetPerCategoryThisMonth;
};

export let action: ActionFunction = async ({ request }) => {
  try {
    const sessionData = await getSessionData(request);
    if (sessionData == null || sessionData.userId == null) {
      return redirect("/auth/login");
    }

    const { userId, timezone } = sessionData;
    const form = await request.formData();
    const budget = form.get("totalBudget")?.toString();
    const categoryBudget = form.get("categoryBudgetMap")?.toString();

    let categoryBudgetMap = new Map<string, string>();
    if (categoryBudget != null) {
      categoryBudgetMap = new Map(JSON.parse(categoryBudget));
    }

    const targetInput = { budget };

    let { errors, targetDetails: monthTargetDetails } =
      parseMonthlyTargetInput(targetInput);
    const { errors: categoryWiseErrors, categoryWiseTargetDetails } =
      parseMonthlyCategoryWiseTargetInput(categoryBudgetMap);

    if (monthTargetDetails != null && categoryWiseTargetDetails != null) {
      const tasks: Promise<boolean>[] = [];
      const editMonthlyTargetTask = editMonthlyTarget(
        userId,
        timezone,
        monthTargetDetails,
        categoryWiseTargetDetails
      );
      tasks.push(editMonthlyTargetTask);

      const customCategoriesString = form.get("customCategories")?.toString();
      if (customCategoriesString) {
        const customCategories: string[] = JSON.parse(customCategoriesString);
        if (customCategories.length) {
          tasks.push(addNewCustomCategories(userId, "expense", customCategories));
        }
      }

      const isTargetSaved = await editMonthlyTargetTask;
      if (isTargetSaved) {
        const month = formatDate_MMM_YYYY(getFirstDateOfThisMonth(timezone));
        trackEvent(request, EventNames.BUDGET_EDITED, {
          month,
          numberOfCategoriesModified: categoryBudgetMap.size.toString(),
        });
        return json({ data: { isBudgetSaved: true } });
      }
    } else {
      if (categoryWiseErrors != null) {
        if (errors == null) {
          errors = {};
        }
        errors = {
          ...errors,
          ...categoryWiseErrors,
        };
      }
      return json({ errors });
    }

    return json({ data: { isBudgetSaved: false } });
  } catch (error) {
    console.log(error);
    return json({ data: { isBudgetSaved: false } });
  }
};

export default function EditBudget() {
  const context = useOutletContext<AppContext>();
  const expensePerCategory = useLoaderData<
    {
      category: string;
      budget: string;
    }[]
  >();
  const actionData = useActionData<{
    errors?: { [key: string]: string };
    data?: { [key: string]: any };
  }>();

  useConfirmOnBackPress(context, {
    title: "Discard changes?",
    message: "Your changes won't be saved",
    positiveButton: "Discard",
    negativeButton: "Not now",
  });

  useEffect(() => {
    if (actionData?.data?.isBudgetSaved === true) {
      context.setSnackBarMsg("Budget saved");
      window.onpopstate = () => {};
      history.go(-2);
    }
  }, [actionData?.data?.isBudgetSaved]);

  return (
    <>
      <main className="pt-4 pb-12 pl-3 pr-3">
        <TargetSetter
          errors={actionData?.errors}
          context={context}
          mode="edit"
          defaultData={expensePerCategory}
        />
      </main>
    </>
  );
}
