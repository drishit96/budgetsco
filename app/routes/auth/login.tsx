import { Ripple } from "@rmwc/ripple";
import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { data, redirect } from "@remix-run/node";
import {
  Form,
  Link,
  useActionData,
  useNavigation,
  useOutletContext,
  useSubmit,
} from "@remix-run/react";
import { ErrorValidation } from "~/components/ErrorValidation";
import { Input } from "~/components/Input";
import { Spacer } from "~/components/Spacer";
import { useEffect, useState } from "react";
import {
  getFCMRegistrationToken,
  isNotificationSupported,
  signInUser,
  signInUserWithCustomToken,
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
} from "~/utils/category.utils";
import { SuccessText } from "~/components/SuccessText";
import { getUserPreferences } from "~/modules/settings/settings.service";
import { isNotNullAndEmpty } from "~/utils/text.utils";
import {
  saveNotificationToken,
  validateChallengeResponse,
} from "~/modules/user/user.service";
import type { MetaFunction } from "@remix-run/react/dist/routeModules";
import type { AppContext } from "~/root";
import type { Currency } from "~/utils/number.utils";
import type { AuthPageContext } from "../auth";
import Turnstile from "~/components/Turnstile";
import { trackEvent } from "~/utils/analytics.utils.server";
import { EventNames } from "~/lib/anaytics.contants";
import { UI_ENV } from "~/lib/ui.config";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { browserSupportsWebAuthn, startAuthentication } from "@simplewebauthn/browser";

export const meta: MetaFunction = ({ matches }) => {
  let rootModule = matches.find((match) => match.id === "root");
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

    if (!user.isPasskeyLogin) {
      const cfToken = form.get("cf-turnstile-response")?.toString();
      const isRequestFromHuman = await validateChallengeResponse(cfToken, "login");
      if (!isRequestFromHuman) return { apiError: "Invalid request" };
    }

    const userPreferences = await getUserPreferences(user.userId);
    if (userPreferences == null) {
      throw new Error(`userPreferences missing for userId: ${user.userId}`);
    }

    trackEvent(request, EventNames.PASSWORD_VALID, undefined, user.userId);

    if (!user.isPasskeyLogin && userPreferences.isMFAOn) {
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
    trackEvent(request, EventNames.LOGGED_IN, undefined, user.userId);

    return data(
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
    return { apiError: "Something went wrong, please try again" };
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

  return { apiError: "" };
};

export default function Login() {
  const context = useOutletContext<AppContext>();
  const navigation = useNavigation();
  const actionData = useActionData<{
    apiError?: string;
    customCategories: { [key: string]: string[] } | null;
    currency: Currency | null;
    locale: string;
    lastModified: number | null;
  }>();
  const [turnstileToken, setTurnstileToken] = useState("");
  const [error, setError] = useState("");
  const [showSuccessText, setShowSuccessText] = useState(false);
  const submit = useSubmit();

  const [emailId, setEmailId] = useState("");
  const [password, setPassword] = useState("");
  const [isLoginInProgress, setIsLoginInProgress] = useState(false);
  const [isPasskeyLoginInProgress, setIsPasskeyLoginInProgress] = useState(false);

  const [doesBrowserSupportsWebAuthn, setDoesBrowserSupportsWebAuthn] = useState(false);

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
      setIsPasskeyLoginInProgress(false);

      return history.replaceState(null, "", "/dashboard");
    }
  }, [actionData]);

  useEffect(() => {
    authPageContext.setActiveTab("login");
  }, [authPageContext]);

  useEffect(() => {
    setDoesBrowserSupportsWebAuthn(browserSupportsWebAuthn());
  }, []);

  async function handleLogin(
    e: React.FormEvent<HTMLFormElement>,
    email: string,
    password: string
  ) {
    e.preventDefault();

    const challengeResponse =
      (window.turnstile && window.turnstile.getResponse(window.turnstileWidgetId)) ?? "";
    if (UI_ENV !== "test" && !challengeResponse) {
      setError("Invalid request");
      return;
    }

    setIsLoginInProgress(true);
    const { idToken, error } = await signInUser(email, password);
    if (idToken) {
      const form = new FormData();
      form.set("idToken", idToken);
      form.set("browserTimezone", Intl.DateTimeFormat().resolvedOptions().timeZone);
      form.set("cf-turnstile-response", challengeResponse);

      const isNotificationsSupported = await isNotificationSupported();
      if (isNotificationsSupported && Notification.permission === "granted") {
        const { token: notificationToken } = await getFCMRegistrationToken();
        if (isNotNullAndEmpty(notificationToken)) {
          form.set("notificationToken", notificationToken);
        }
      }

      submit(form, { method: "POST", replace: true });
    }

    error && setError("Invalid e-mail / password");
    setIsLoginInProgress(false);
  }

  async function handlePasskeyLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (UI_ENV !== "test" && !turnstileToken) {
      setError("Invalid request");
      return;
    }

    setIsPasskeyLoginInProgress(true);

    const resp = await fetch("/api/getPasskeyAuthenticationOptions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ cfToken: turnstileToken }),
    });

    let authResponse: AuthenticationResponseJSON | null = null;
    try {
      const authenticationOptions = await resp.json();
      authResponse = await startAuthentication({ optionsJSON: authenticationOptions });
    } catch (error: any) {
      console.log(error);
      setIsPasskeyLoginInProgress(false);
      setError("Something went wrong. Please try again");
    }

    if (authResponse == null) {
      setIsPasskeyLoginInProgress(false);
      setError("Something went wrong. Please try again");
      return;
    }

    const verificationResp = await fetch("/api/verifyPasskey", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        authResponse,
      }),
    });

    const verificationResponse = await verificationResp.json();
    if (verificationResponse == null) {
      setIsPasskeyLoginInProgress(false);
      setError("Something went wrong. Please try again");
      return;
    }

    if (verificationResponse.isVerified) {
      const token = verificationResponse.token;
      if (token == null) {
        setIsPasskeyLoginInProgress(false);
        setError("Something went wrong. Please try again");
        return;
      }

      const { idToken, error } = await signInUserWithCustomToken(token);
      if (error) {
        setIsPasskeyLoginInProgress(false);
        setError("Something went wrong. Please try again");
        return;
      }

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
        submit(form, { method: "POST", replace: true });
      }
    } else {
      setIsPasskeyLoginInProgress(false);
      setError("Passkey verification failed. Please try again");
    }
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

          <div>
            <Form
              replace
              method="POST"
              onSubmit={(e) => handleLogin(e, emailId, password)}
            >
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

              <Link className="text-accent" to="/auth/forgotPassword">
                Forgot password?
              </Link>

              <input
                name="browserTimezone"
                type="hidden"
                value={Intl.DateTimeFormat().resolvedOptions().timeZone}
              />

              <Turnstile action="login" onNewToken={setTurnstileToken} />

              <Spacer />
              <Ripple>
                <button
                  type="submit"
                  className="btn-primary w-full"
                  disabled={
                    navigation.state === "submitting" ||
                    isLoginInProgress ||
                    isPasskeyLoginInProgress
                  }
                >
                  {isLoginInProgress ? "Logging in..." : "Log in"}
                </button>
              </Ripple>
            </Form>

            {doesBrowserSupportsWebAuthn && (
              <>
                <Spacer />
                <Form method="POST" replace onSubmit={handlePasskeyLogin}>
                  <Ripple>
                    <button
                      type="submit"
                      className="btn-secondary w-full"
                      disabled={isLoginInProgress || isPasskeyLoginInProgress}
                    >
                      {isPasskeyLoginInProgress
                        ? navigation.state === "submitting"
                          ? "Verifying passkey..."
                          : "Waiting for authenticator..."
                        : "Login with Passkey"}
                    </button>
                  </Ripple>
                </Form>
              </>
            )}

            <Spacer size={3} />
            <div className="flex flex-col items-center text-sm">
              <span className="text-center">
                By clicking 'Log in', you agree to our{" "}
                <Link
                  to="/terms-of-service"
                  className="text-accent underline underline-offset-2"
                >
                  terms of service
                </Link>{" "}
                and{" "}
                <Link
                  to="/privacy-policy"
                  className="text-accent underline underline-offset-2"
                >
                  privacy policy
                </Link>
              </span>

              <Spacer />
              <span>
                Don't have an account?{" "}
                <Link
                  className="text-accent underline underline-offset-2"
                  to="/auth/register"
                >
                  Register
                </Link>
              </span>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
