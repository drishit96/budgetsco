import { Ripple } from "@rmwc/ripple";
import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import {
  Form,
  Link,
  useActionData,
  useLoaderData,
  useNavigation,
  useOutletContext,
  useSubmit,
} from "@remix-run/react";
import { ErrorValidation } from "~/components/ErrorValidation";
import { Input } from "~/components/Input";
import { Spacer } from "~/components/Spacer";
import { useEffect, useState } from "react";
import {
  createFirebaseUser,
  getFCMRegistrationToken,
  isNotificationSupported,
} from "~/utils/firebase.utils";
import {
  getSessionCookie,
  getSessionData,
  getUserDataFromIdToken,
} from "~/utils/auth.utils.server";
import {
  createUser,
  saveNotificationToken,
  validateChallengeResponse,
} from "~/modules/user/user.service";
import {
  saveBrowserPreferences,
  getUserPreferences,
} from "~/modules/settings/settings.service";
import { isNotNullAndEmpty, isNullOrEmpty } from "~/utils/text.utils";
import type { MetaFunction } from "@remix-run/react/dist/routeModules";
import type { AuthPageContext } from "../auth";
import Turnstile from "~/components/Turnstile";
import { trackEvent, trackUserProfileUpdate } from "~/utils/analytics.utils.server";
import { EventNames } from "~/lib/anaytics.contants";

export const meta: MetaFunction = ({ matches }) => {
  let rootModule = matches.find((match) => match.id === "root");
  return [...(rootModule?.meta ?? []), { title: "Register - Budgetsco" }];
};

export const action: ActionFunction = async ({ request }) => {
  try {
    const form = await request.formData();
    const cfToken = form.get("cf-turnstile-response")?.toString();
    const isRequestFromHuman = await validateChallengeResponse(cfToken, "register");
    if (!isRequestFromHuman) return json({ apiError: "Invalid request" });

    const idToken = form.get("idToken")?.toString();

    if (request.method === "GET" || idToken == null) return redirect("/register");

    const user = await getUserDataFromIdToken(idToken);
    if (user == null || user.emailId == null) return redirect("/register");

    const { error } = await createUser(user.userId, user.emailId);
    if (error) return json({ errors: {}, error });

    const browserTimezone = form.get("browserTimezone")?.toString() ?? "Etc/GMT";
    const browserLocale = form.get("browserLocale")?.toString() ?? "en-US";
    await saveBrowserPreferences(user.userId, browserTimezone, browserLocale);
    trackUserProfileUpdate({
      request,
      updateType: "set",
      data: { timezone: browserTimezone, locale: browserLocale },
    });

    const userPreferences = await getUserPreferences(user.userId);
    if (userPreferences == null) {
      return json({ error: "Error saving necessary data, please try again" });
    }
    const sessionCookie = await getSessionCookie(idToken, userPreferences);

    // Login succeeded, send them to the home page.
    const notificationToken = form.get("notificationToken")?.toString();
    if (isNotNullAndEmpty(notificationToken)) {
      saveNotificationToken(user.userId, notificationToken);
    }

    trackEvent(request, EventNames.REGISTERED, undefined, user.userId);
    return redirect("/dashboard", {
      headers: {
        "Set-Cookie": sessionCookie,
      },
    });
  } catch (error) {
    return json({ error: "Something went wrong, please try again" });
  }
};

export let loader: LoaderFunction = async ({ request }) => {
  const session = await getSessionData(request);

  if (session != null && session?.userId) {
    return redirect("/dashboard");
  }

  return json({ error: "" });
};

export default function Register() {
  const navigation = useNavigation();
  const { error }: { error: string } = useLoaderData();
  const actionData = useActionData();
  const [errors, setErrors] = useState<{
    emailId?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const submit = useSubmit();

  const [turnstileToken, setTurnstileToken] = useState("");
  const [emailId, setEmailId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const authPageContext = useOutletContext<AuthPageContext>();

  useEffect(() => {
    authPageContext.setActiveTab("register");
  }, [authPageContext]);

  async function handleRegister(
    e: React.FormEvent<HTMLFormElement>,
    email: string,
    password: string
  ) {
    e.preventDefault();

    if (isNullOrEmpty(password)) {
      setErrors((prev) => ({
        ...prev,
        password: "Please enter a password",
      }));
    }

    if (password !== confirmPassword) {
      setErrors((prev) => ({
        ...prev,
        confirmPassword: "Passwords don't match",
      }));
      return;
    }

    if (!turnstileToken) {
      setErrors((prev) => ({
        ...prev,
        confirmPassword: "Invalid request",
      }));
      return;
    }

    const { idToken, error } = await createFirebaseUser(email, password);
    if (idToken) {
      const form = new FormData();
      form.set("idToken", idToken);
      form.set("browserTimezone", Intl.DateTimeFormat().resolvedOptions().timeZone);
      form.set("browserLocale", navigator.language);
      form.set("cf-turnstile-response", turnstileToken);

      const isNotificationsSupported = await isNotificationSupported();
      if (isNotificationsSupported && Notification.permission === "granted") {
        const { token: notificationToken } = await getFCMRegistrationToken();
        if (isNotNullAndEmpty(notificationToken)) {
          form.set("notificationToken", notificationToken);
        }
      }

      submit(form, { method: "POST", replace: true });
    }

    if (error) {
      if (error == "auth/email-already-in-use") {
        setErrors((prev) => ({
          ...prev,
          emailId: "E-mail id is already registered",
        }));
      } else if (error == "auth/invalid-email" || error == "auth/missing-email") {
        setErrors((prev) => ({
          ...prev,
          emailId: "Please enter a valid e-mail",
        }));
      } else {
        console.log(error);
      }
    }
  }

  return (
    <>
      <main className="pt-7 w-full md:w-3/4 lg:w-1/3">
        <h1 className="text-3xl text-center pb-7">Register</h1>

        <div className="flex flex-col items-center justify-center">
          <Form
            replace
            method="POST"
            onSubmit={(e) => handleRegister(e, emailId, password)}
          >
            <Input
              name="emailId"
              type="email"
              label="E-mail Id"
              autoFocus={true}
              value={emailId}
              autoComplete="email"
              required
              onChangeHandler={(e) => {
                setEmailId(e.target.value);
                setErrors((prev) => ({ ...prev, emailId: undefined }));
              }}
              error={actionData?.errors.emailId || errors.emailId}
            />
            <Spacer />

            <Input
              name="password"
              type="password"
              label="Password"
              value={password}
              autoComplete="new-password"
              required
              minLength={8}
              onChangeHandler={(e) => setPassword(e.target.value)}
              error={actionData?.errors.password || errors.password}
            />
            <Spacer />

            <Input
              name="confirmPassword"
              type="password"
              label="Confirm password"
              autoComplete="new-password"
              required
              minLength={8}
              onChangeHandler={(e) => setConfirmPassword(e.target.value)}
              error={actionData?.errors.confirmPassword || errors.confirmPassword}
            />
            <Spacer />

            <input
              name="browserTimezone"
              type="hidden"
              value={Intl.DateTimeFormat().resolvedOptions().timeZone}
            />

            <Turnstile action="register" onNewToken={setTurnstileToken} />

            <Spacer />
            <Ripple>
              <button type="submit" className="btn-primary w-full">
                {navigation.state === "submitting" ? "Registering..." : "Register"}
              </button>
            </Ripple>

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
                Have an account?{" "}
                <Link
                  className="text-accent underline underline-offset-2"
                  to="/auth/login"
                >
                  Log in
                </Link>
              </span>
            </div>
          </Form>
        </div>
        <ErrorValidation error={error} />
        <Spacer />
      </main>
    </>
  );
}
