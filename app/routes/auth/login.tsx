import { Ripple } from "@rmwc/ripple";
import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import {
  Form,
  Link,
  useActionData,
  useOutletContext,
  useSubmit,
  useTransition,
} from "@remix-run/react";
import { ErrorValidation } from "~/components/ErrorValidation";
import { Input } from "~/components/Input";
import { Spacer } from "~/components/Spacer";
import { useEffect, useState } from "react";
import {
  getFCMRegistrationToken,
  isNotificationSupported,
  signInUser,
} from "~/utils/firebase.utils";
import {
  getUserDataFromIdToken,
  getSessionCookie,
  getSessionData,
  getPartialSessionCookie,
  getPartialSessionData,
} from "~/utils/auth.utils.server";
import { getCustomCategories } from "~/modules/transaction/transaction.service";
import {
  saveCustomCategoriesToLocalStorage,
  saveLastModifiedToLocalStorage,
  saveBrowserPreferencesToLocalStorage,
  getBooleanFromLocalStorage,
} from "~/utils/category.utils";
import { SuccessText } from "~/components/SuccessText";
import { getUserPreferences } from "~/modules/settings/settings.service";
import { isNotNullAndEmpty } from "~/utils/text.utils";
import { saveNotificationToken } from "~/modules/user/user.service";
import type { V2_MetaFunction } from "@remix-run/react/dist/routeModules";
import type { AppContext } from "~/root";
import type { Currency } from "~/utils/number.utils";
import type { AuthPageContext } from "../auth";
import { isMobileDevice } from "~/utils/browser.utils";

export const meta: V2_MetaFunction = ({ matches }) => {
  let rootModule = matches.find((match) => match.route.id === "root");
  return [...(rootModule?.meta ?? []), { title: "Login - Budgetsco" }];
};

export const action: ActionFunction = async ({ request }) => {
  try {
    const form = await request.formData();
    const idToken = form.get("idToken")?.toString();

    if (request.method === "GET" || idToken == null) {
      return redirect("/auth/login");
    }

    const user = await getUserDataFromIdToken(idToken, true);
    if (user == null || user.emailId == null) {
      return redirect("/auth/login");
    }

    const userPreferences = await getUserPreferences(user.userId);
    if (userPreferences == null) {
      throw new Error(`userPreferences missing for userId: ${user.userId}`);
    }

    if (userPreferences.isMFAOn) {
      return redirect("/verifyMFA", {
        headers: {
          "Set-Cookie": await getPartialSessionCookie(user.userId, idToken),
        },
      });
    }

    const tasks = [];
    const getCustomCategoriesTask = getCustomCategories(user.userId);
    tasks.push(getCustomCategoriesTask);

    const notificationToken = form.get("notificationToken")?.toString();
    if (isNotNullAndEmpty(notificationToken)) {
      tasks.push(saveNotificationToken(user.userId, notificationToken));
    }

    await Promise.allSettled(tasks);

    return json(
      {
        idToken,
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
  } catch (error) {
    console.log(error);
    return json({ apiError: "Something went wrong, please try again" });
  }
};

export let loader: LoaderFunction = async ({ request }) => {
  const session = await getSessionData(request);

  if (session != null && session?.userId) {
    return redirect("/dashboard");
  }

  const partialSessionData = await getPartialSessionData(request);
  if (partialSessionData) {
    return redirect("/verifyMFA");
  }

  return json({ apiError: "" });
};

export default function Login() {
  const context = useOutletContext<AppContext>();
  const transition = useTransition();
  const actionData = useActionData<{
    apiError?: string;
    idToken: string;
    customCategories: { [key: string]: string[] } | null;
    currency: Currency | null;
    locale: string;
    lastModified: number | null;
  }>();
  const [error, setError] = useState("");
  const [showSuccessText, setShowSuccessText] = useState(false);
  const submit = useSubmit();

  const [emailId, setEmailId] = useState("");
  const [password, setPassword] = useState("");
  const [isLoginInProgress, setIsLoginInProgress] = useState(false);

  const authPageContext = useOutletContext<AuthPageContext>();

  useEffect(() => {
    if (actionData && actionData.apiError == null) {
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
      setIsLoginInProgress(false);

      return history.replaceState(null, "", "/dashboard");
    }
  }, [actionData]);

  useEffect(() => {
    authPageContext.setActiveTab("login");
    if (isMobileDevice() && getBooleanFromLocalStorage("showIntro", true)) {
      location.replace("/intro");
    }
  }, [authPageContext]);

  async function handleLogin(
    e: React.FormEvent<HTMLFormElement>,
    email: string,
    password: string
  ) {
    e.preventDefault();

    setIsLoginInProgress(true);
    const { idToken, error } = await signInUser(email, password);
    if (idToken) {
      const form = new FormData();
      form.set("idToken", idToken);
      form.set("browserTimezone", Intl.DateTimeFormat().resolvedOptions().timeZone);

      const isNotificationsSupported = await isNotificationSupported();
      if (isNotificationsSupported && Notification.permission === "granted") {
        const { token: notificationToken } = await getFCMRegistrationToken();
        if (isNotNullAndEmpty(notificationToken)) {
          form.set("notificationToken", notificationToken);
        }
      }

      submit(form, { method: "post", replace: true });
    }

    error && setError("Invalid e-mail / password");
    setIsLoginInProgress(false);
  }

  return (
    <>
      <main className="pt-7 w-full md:w-3/4 lg:w-1/3">
        <h1 className="text-3xl text-center pb-7">Login</h1>

        <div className="flex flex-col items-center justify-center">
          <div className="w-full text-center">
            <ErrorValidation error={actionData?.apiError || error} />
            {showSuccessText && <SuccessText text="Log in successfull, redirecting..." />}
          </div>
          <Spacer />

          <Form replace method="post" onSubmit={(e) => handleLogin(e, emailId, password)}>
            <Input
              name="emailId"
              type="email"
              label="E-mail Id"
              value={emailId}
              autoComplete="email"
              autoFocus={true}
              required
              onChangeHandler={(e) => setEmailId(e.target.value)}
            />
            <Spacer />

            <Input
              name="password"
              type="password"
              label="Password"
              value={password}
              autoComplete="current-password"
              required
              onChangeHandler={(e) => setPassword(e.target.value)}
            />
            <Spacer />

            <Link className="text-emerald-900" to="/auth/forgotPassword">
              Forgot password?
            </Link>

            <input
              name="browserTimezone"
              type="hidden"
              value={Intl.DateTimeFormat().resolvedOptions().timeZone}
            />

            <Spacer />
            <Ripple>
              <button
                type="submit"
                className="btn-primary w-full"
                disabled={transition.state === "submitting" || isLoginInProgress}
              >
                {transition.state === "submitting" || isLoginInProgress
                  ? "Logging in..."
                  : "Log in"}
              </button>
            </Ripple>

            <Spacer size={3} />
            <div className="flex flex-col items-center text-sm">
              <span className="text-center">
                By clicking 'Log in', you agree to our{" "}
                <Link
                  to="/terms-of-service"
                  className="text-emerald-900 underline underline-offset-2"
                >
                  terms of service
                </Link>{" "}
                and{" "}
                <Link
                  to="/privacy-policy"
                  className="text-emerald-900 underline underline-offset-2"
                >
                  privacy policy
                </Link>
              </span>

              <Spacer />
              <span>
                Don't have an account?{" "}
                <Link
                  className="text-emerald-900 underline underline-offset-2"
                  to="/auth/register"
                >
                  Register
                </Link>
              </span>
            </div>
          </Form>
        </div>
      </main>
    </>
  );
}
