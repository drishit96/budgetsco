import type { ActionFunction, LoaderFunction, V2_MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { Form, useActionData, useOutletContext, useTransition } from "@remix-run/react";
import { useEffect, useState } from "react";
import { Input } from "~/components/Input";
import { Spacer } from "~/components/Spacer";
import { SuccessText } from "~/components/SuccessText";
import { verify2FAToken } from "~/modules/settings/security/mfa.service";
import { getUserPreferences } from "~/modules/settings/settings.service";
import { getCustomCategories } from "~/modules/transaction/transaction.service";
import type { AppContext } from "~/root";
import {
  getPartialSessionData,
  getSessionData,
  getSessionCookie,
} from "~/utils/auth.utils.server";
import {
  saveCustomCategoriesToLocalStorage,
  saveBrowserPreferencesToLocalStorage,
  saveLastModifiedToLocalStorage,
} from "~/utils/category.utils";
import { logError } from "~/utils/logger.utils.server";
import type { Currency } from "~/utils/number.utils";

export const meta: V2_MetaFunction = ({ matches }) => {
  let rootModule = matches.find((match) => match.route.id === "root");
  return [...(rootModule?.meta ?? []), { title: "2FA - Budgetsco" }];
};

export const action: ActionFunction = async ({ request }) => {
  const sessionData = await getSessionData(request);
  if (sessionData != null) {
    return redirect("/dashboard");
  }

  const partialSessionData = await getPartialSessionData(request);
  if (partialSessionData == null) {
    return redirect("auth/login");
  }

  const form = await request.formData();
  const otp = form.get("otp")?.toString();
  if (otp == null) return json({ error: "Invalid code" });

  const { userId, idToken } = partialSessionData;
  const isValidToken = await verify2FAToken(userId, otp);
  if (isValidToken == false) return json({ error: "Invalid code" });

  const tasks = [];
  const getUserPreferencesTask = getUserPreferences(userId);
  const getCustomCategoriesTask = getCustomCategories(userId);
  tasks.push(getUserPreferencesTask, getCustomCategoriesTask);
  await Promise.allSettled(tasks);

  const userPreferences = await getUserPreferencesTask;
  if (userPreferences == null) {
    logError(`userPreferences missing for userId: ${userId}`);
    throw new Error(`userPreferences missing for userId: ${userId}`);
  }

  return json(
    {
      customCategories: await getCustomCategoriesTask,
      currency: userPreferences?.currency,
      locale: userPreferences?.locale,
      lastModified: userPreferences?.lastModified,
    },
    {
      headers: {
        "Set-Cookie": await getSessionCookie(idToken, userPreferences),
      },
    }
  );
};

export const loader: LoaderFunction = async ({ request }) => {
  const sessionData = await getSessionData(request);
  if (sessionData != null) {
    return redirect("/dashboard");
  }

  const partialSessionData = await getPartialSessionData(request);
  if (partialSessionData == null) {
    return redirect("/auth/login");
  }
  return null;
};

export default function VerifyMFA() {
  const context = useOutletContext<AppContext>();
  const transition = useTransition();
  const actionData = useActionData<{
    error?: string;
    customCategories: { [key: string]: string[] } | null;
    currency: Currency | null;
    locale: string;
    lastModified: number | null;
  }>();
  const [showSuccessText, setShowSuccessText] = useState(false);

  useEffect(() => {
    if (actionData && actionData.error == null) {
      if (actionData.customCategories != null) {
        saveCustomCategoriesToLocalStorage(actionData.customCategories);
      }
      if (actionData.currency) {
        saveBrowserPreferencesToLocalStorage(actionData.currency, actionData.locale);
      }
      saveLastModifiedToLocalStorage(actionData?.lastModified ?? new Date().getTime());
      actionData.currency && context.setUserPreferredCurrency(actionData.currency);
      actionData.locale && context.setUserPreferredLocale(actionData.locale);

      setShowSuccessText(true);
      return history.replaceState(null, "", "/dashboard");
    }
  }, [actionData, context]);

  return (
    <>
      <main className="pt-4 pb-28">
        <h1 className="text-3xl text-center">Enter verification code</h1>
        <div className="flex flex-col items-center">
          {showSuccessText && <SuccessText text="Log in successfull, redirecting..." />}
          <div className="flex justify-center w-full md:w-3/4 lg:w-2/3 xl:w-1/2">
            <Form method="post">
              <fieldset disabled={transition.state === "submitting"}>
                <Input
                  name="otp"
                  error={actionData?.error}
                  autoFocus
                  autoComplete="one-time-code"
                />
                <Spacer size={1} />
                <button className="btn-primary w-full">
                  {transition.state === "submitting" ? "Verifying code..." : "Continue"}
                </button>
              </fieldset>
            </Form>
          </div>
        </div>
      </main>
    </>
  );
}
