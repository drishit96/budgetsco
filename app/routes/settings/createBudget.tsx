import type { AppContext } from "~/root";
import TargetSetter from "~/components/TargetSetter";
import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useActionData, useOutletContext } from "@remix-run/react";
import {
  addNewCustomCategories,
  createMonthlyTarget,
} from "~/modules/transaction/transaction.service";
import { getSessionData } from "~/utils/auth.utils.server";
import {
  parseMonthlyTargetInput,
  parseMonthlyCategoryWiseTargetInput,
} from "~/modules/transaction/transaction.schema";
import { useEffect } from "react";
import type { V2_MetaFunction } from "@remix-run/react/dist/routeModules";
import Decimal from "decimal.js";

export const meta: V2_MetaFunction = ({ matches }) => {
  let rootModule = matches.find((match) => match.id === "root");
  return [...(rootModule?.meta ?? []), { title: "Set budget - Budgetsco" }];
};

export const loader: LoaderFunction = async ({ request }) => {
  const sessionData = await getSessionData(request);
  if (sessionData == null || sessionData.userId == null) {
    return redirect("/auth/login");
  }

  const { isActiveSubscription } = sessionData;

  if (!isActiveSubscription) {
    return redirect("/subscriptions/gpb");
  }

  return json({});
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

    const map = new Map<string, string>();
    let prevCategory = "";
    for (let item of form.entries()) {
      const key = item[0];
      const value = item[1].toString();
      if (key !== "totalBudget") {
        if (key.startsWith("category")) {
          prevCategory = value.toString();
          map.set(value.toString(), "0");
        } else {
          map.set(prevCategory, value);
        }
      }
    }

    const targetInput = { budget };
    let { errors, targetDetails: monthTargetDetails } =
      parseMonthlyTargetInput(targetInput);
    const { errors: categoryWiseErrors, categoryWiseTargetDetails } =
      parseMonthlyCategoryWiseTargetInput(map);

    if (monthTargetDetails != null && categoryWiseTargetDetails != null) {
      const categoryTotal = Decimal.sum(...categoryWiseTargetDetails.values());
      if (monthTargetDetails.budget.lessThan(categoryTotal)) {
        return json({
          errors: {
            totalBudget:
              "Total budget must be greater than or equal to the sum of all category budgets",
          },
        });
      }

      const tasks: Promise<boolean>[] = [];
      const createMonthlyTargetTask = createMonthlyTarget(
        userId,
        timezone,
        monthTargetDetails,
        categoryWiseTargetDetails
      );
      tasks.push(createMonthlyTargetTask);

      const customCategoriesString = form.get("customCategories")?.toString();
      if (customCategoriesString) {
        const customCategories: string[] = JSON.parse(customCategoriesString);
        if (customCategories.length) {
          tasks.push(addNewCustomCategories(userId, "expense", customCategories));
        }
      }

      const isTargetSaved = await createMonthlyTargetTask;
      if (isTargetSaved) {
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

export default function CreateBudget() {
  const context = useOutletContext<AppContext>();
  const actionData = useActionData<{
    errors?: { [key: string]: string };
    data?: { [key: string]: any };
  }>();

  useEffect(() => {
    context.showBackButton(true);
  }, []);

  useEffect(() => {
    if (actionData?.data?.isBudgetSaved === true) {
      context.setSnackBarMsg("Budget saved");
      history.back();
    }
  }, [actionData?.data?.isBudgetSaved]);

  return (
    <>
      <main className="pt-7 pb-12 pl-3 pr-3">
        <TargetSetter errors={actionData?.errors} context={context} mode="create" />
      </main>
    </>
  );
}
