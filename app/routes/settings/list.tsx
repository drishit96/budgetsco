import { Ripple } from "@rmwc/ripple";
import { useEffect, useState } from "react";
import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useLoaderData, useOutletContext, useSubmit } from "@remix-run/react";
import type { AppContext } from "~/root";
import {
  getSessionCookieBuilder,
  getSessionData,
  getUserIdFromSession,
} from "~/utils/auth.utils.server";
import { Spacer } from "~/components/Spacer";
import type { MetaFunction } from "@remix-run/react/dist/routeModules";
import { getCurrentAppTheme } from "~/utils/setting.utils";
import { trackEvent } from "~/utils/analytics.utils.server";
import { EventNames } from "~/lib/anaytics.contants";

export const meta: MetaFunction = ({ matches }) => {
  let rootModule = matches.find((match) => match.id === "root");
  return [...(rootModule?.meta ?? []), { title: "Settings - Budgetsco" }];
};

export let action: ActionFunction = async ({ request }) => {
  const userId = await getUserIdFromSession(request);
  if (userId == null) return redirect("/auth/login");

  const form = await request.formData();
  const formName = form.get("formName");

  if (formName === "LOGOUT_FORM") {
    trackEvent(request, EventNames.LOGOUT);
    return redirect("/auth/login", {
      headers: {
        "Set-Cookie": await getSessionCookieBuilder().serialize("", {
          expires: new Date("1970-01-01"),
        }),
      },
    });
  }

  return json({});
};

export const loader: LoaderFunction = async ({ request }) => {
  const sessionData = await getSessionData(request);
  if (sessionData == null || sessionData.userId == null) {
    return redirect("/auth/login");
  }

  const { emailId } = sessionData;
  return json({ emailId });
};

export default function Settings() {
  const submit = useSubmit();
  const context = useOutletContext<AppContext>();
  const { emailId } = useLoaderData<{ emailId?: string }>();
  const [theme, setTheme] = useState("system");

  useEffect(() => {
    context.setShowLoader(false);
    setTheme(getCurrentAppTheme());
  }, []);

  useEffect(() => {
    context.showBackButton(true);
  }, [context]);

  function handleLogoutFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller?.postMessage({
        type: "CLEAR_ALL_CACHE",
      });
    }
    if ("localStorage" in window) {
      localStorage.clear();
    }
    submit(e.currentTarget, { method: "POST", replace: true });
  }

  return (
    <>
      <main className="pt-7 pl-4 pr-4 pb-20">
        <h1 className="text-3xl text-center pb-7">Settings</h1>

        <div className="flex justify-center">
          <div className="flex flex-col w-full lg:w-1/2">
            <p className="text-center text-sm">
              Signed in using <strong>{emailId}</strong>
            </p>
            <Spacer />
            <Ripple>
              <Link
                to={`/subscriptions/gpb`}
                className="flex p-4 border border-primary rounded-lg focus-border"
                onClick={() => context.setShowLoader(true)}
              >
                <span className="text-base">Subscription</span>
                <span className="flex flex-grow"></span>
                <span
                  className={`w-min p-1 rounded-md text-sm ${
                    context.isActiveSubscription
                      ? "text-accent bg-accent"
                      : "text-urgent bg-urgent"
                  }`}
                >
                  {context.isActiveSubscription ? "ACTIVE" : "INACTIVE"}
                </span>
              </Link>
            </Ripple>
            <Spacer size={3} />

            <p className="text-emerald-700 font-bold">General</p>
            <Spacer size={1} />
            <Ripple>
              <Link
                to="/settings/profile"
                className="p-4 border border-primary rounded-t-lg focus-border"
              >
                <span>My profile</span>
              </Link>
            </Ripple>

            <Ripple>
              <Link
                to="/settings/editBudget"
                className="p-4 border-l border-r border-b border-primary focus-border"
              >
                <span>Edit Budget</span>
              </Link>
            </Ripple>

            <Ripple>
              <Link
                to="/settings/manageRecurringTransactions"
                className="p-4 border-l border-r border-b border-primary focus-border"
              >
                <span>Manage Recurring Transactions</span>
              </Link>
            </Ripple>

            <Ripple>
              <Link
                to={`/settings/changeCurrency?value=${context.currency}`}
                className="p-4 border-l border-r border-b border-primary focus-border"
                replace
              >
                <span>Change currency</span>
              </Link>
            </Ripple>

            <Ripple>
              <Link
                to={`/settings/security/list`}
                className="p-4 border-l border-r border-primary focus-border"
              >
                <span>Security</span>
              </Link>
            </Ripple>

            <Ripple>
              <Link
                to={`/settings/theme`}
                className="p-4 border border-primary rounded-b-lg focus-border"
              >
                <p>Theme</p>
                <p className="text-sm text-secondary">
                  {theme === "system"
                    ? "Use my system theme"
                    : theme === "dark"
                    ? "Dark theme"
                    : "Light theme"}
                </p>
              </Link>
            </Ripple>

            <Spacer size={3} />
            <p className="text-emerald-700 font-bold">Help & Feedback</p>
            <Spacer size={1} />
            <Ripple>
              <a
                href={`mailto:budgetsco+support@gmail.com`}
                className="p-4 border border-primary rounded-t-lg focus-border"
              >
                Get suppport
              </a>
            </Ripple>
            <Ripple>
              <a
                href="https://play.google.com/store/apps/details?id=com.app.budgetsco"
                className="p-4 border-b border-l border-r border-primary rounded-b-lg focus-border"
              >
                Rate us
              </a>
            </Ripple>

            <Spacer size={3} />
            <p className="text-emerald-700 font-bold">About</p>
            <Spacer size={1} />
            <Ripple>
              <Link
                to={`/privacy-policy`}
                className="p-4 border border-primary rounded-t-lg focus-border"
              >
                <span>Privacy policy</span>
              </Link>
            </Ripple>
            <Ripple>
              <Link
                to={`/terms-of-service`}
                className="p-4 border-b border-l border-r border-primary focus-border"
              >
                <span>Terms of service</span>
              </Link>
            </Ripple>
            <Ripple>
              <Link
                to={`/cancel-and-refund-policy`}
                className="p-4 border-b border-l border-r border-primary rounded-b-lg focus-border"
              >
                <span>Cancellation & Refund policy</span>
              </Link>
            </Ripple>

            <Spacer size={3} />
            <Ripple>
              <Form method="POST" onSubmit={handleLogoutFormSubmit} replace>
                <input type="hidden" name="formName" value="LOGOUT_FORM" />
                <button
                  type="submit"
                  className="p-4 border border-primary rounded-lg text-start text-base w-full focus-border"
                >
                  Log out
                </button>
              </Form>
            </Ripple>
          </div>
        </div>
      </main>
    </>
  );
}
