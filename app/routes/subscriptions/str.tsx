import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { redirect, json } from "@remix-run/node";
import { useOutletContext, useLoaderData } from "@remix-run/react";
import type { V2_MetaFunction } from "@remix-run/react/dist/routeModules";
import { useEffect } from "react";
import { Spacer } from "~/components/Spacer";
import { STR_PRICING_TABLE_ID, STR_PUBLISHABLE_KEY } from "~/lib/ui.config";
import { getUserPreferencesAfterTimestamp } from "~/modules/settings/settings.service";
import {
  getSTRCustomerPortalSession,
  getSTRSubscriptionData,
} from "~/modules/subscriptions/str.subscription.service";
import type { AppContext } from "~/root";
import { getSessionData } from "~/utils/auth.utils.server";
import { formatDate_DD_MMMM_YYYY_hh_mm_aa } from "~/utils/date.utils";
import { logError } from "~/utils/logger.utils.server";

export const meta: V2_MetaFunction = ({ matches }) => {
  let rootModule = matches.find((match) => match.id === "root");
  return [...(rootModule?.meta ?? []), { title: "Subscriptions - Budgetsco" }];
};

export const action: ActionFunction = async ({ request }) => {
  const session = await getSessionData(request);
  if (session == null) return redirect("/auth/login");

  return json({ done: true });
};

export let loader: LoaderFunction = async ({ request }) => {
  try {
    const sessionData = await getSessionData(request);
    if (sessionData == null || sessionData.userId == null) {
      return redirect("/auth/login");
    }

    const { userId, isEmailVerified, emailId, lastModified } = sessionData;
    let { isActiveSubscription, paymentGateway } = sessionData;

    const latestPreferences = await getUserPreferencesAfterTimestamp(
      lastModified,
      userId
    );
    if (latestPreferences != null) {
      isActiveSubscription = latestPreferences.isActiveSubscription;
      paymentGateway = latestPreferences.paymentGateway;
    }

    if (!isEmailVerified) return redirect("/dashboard");
    if (isActiveSubscription) {
      if (paymentGateway === "GPB") return redirect("/subscriptions/gpb");
      if (paymentGateway == null) {
        throw new Error(`Invalid paymentGateway for userId: ${userId}`);
      }

      const getSubscription = getSTRSubscriptionData(userId);
      const getSession = getSTRCustomerPortalSession(userId);
      await Promise.allSettled([getSubscription, getSession]);

      const subscription = await getSubscription;
      const session = await getSession;

      if (subscription == null) {
        throw new Error(`Subscription does not exists for userId: ${userId}`);
      }

      if (session == null) {
        throw new Error(`Invalid STR subscription for userId: ${userId}`);
      }

      return {
        isActive: isActiveSubscription,
        emailId,
        userId,
        amount: subscription.items.data[0].price.unit_amount,
        currency: subscription.items.data[0].price.currency,
        interval: subscription.items.data[0].price.recurring?.interval,
        expiry: subscription.current_period_end,
        status: subscription.status,
        link: session.url,
      };
    }

    return {
      isActive: isActiveSubscription,
      emailId,
      userId,
    };
  } catch (error) {
    logError(error);
    return json({ error: "Something went wrong" });
  }
};

export default function STR() {
  const context = useOutletContext<AppContext>();
  const subscription = useLoaderData<{
    isActive?: boolean;
    emailId?: string;
    userId: string;
    link?: string;
    status?: string;
    amount?: number;
    currency?: string;
    interval?: "month" | "year";
    expiry?: number;
  }>();

  const onVisibilityChange = () => {
    if (!document.hidden) {
      context.setShowLoader(true);
      location.reload();
    }
  };

  useEffect(() => {
    context.setShowLoader(false);
    context.showBackButton(true);
    window.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return (
    <main className="pt-5 pb-28 pl-3 pr-3">
      <h1 className="text-3xl text-center pb-7">
        {subscription.isActive ? "Subscription" : "Select a plan"}
      </h1>

      <div className="flex justify-center">
        <div className="flex flex-col w-full lg:w-1/2">
          {!subscription.isActive && (
            <>
              <script async src="https://js.stripe.com/v3/pricing-table.js"></script>
              <stripe-pricing-table
                pricing-table-id={STR_PRICING_TABLE_ID}
                publishable-key={STR_PUBLISHABLE_KEY}
                client-reference-id={subscription.userId}
                customer-email={subscription.emailId}
              ></stripe-pricing-table>
            </>
          )}

          {subscription.isActive && (
            <div className="p-4 border rounded-md w-full">
              <span
                className={`pl-2 pr-2 pt-1 pb-1 rounded-md border ${
                  subscription.status === "active" || subscription.status === "trialing"
                    ? "border-green-900 bg-green-50 text-green-900"
                    : "border-red-900 bg-red-50 text-red-900"
                }  text-sm font-bold`}
              >
                {subscription.status === "active" || subscription.status === "trialing"
                  ? "ACTIVE"
                  : "INACTIVE"}
              </span>

              <Spacer />
              <p className="text-3xl">
                {new Intl.NumberFormat(context.userPreferredLocale ?? context.locale, {
                  style: "currency",
                  currency: subscription.currency,
                }).format((subscription.amount ?? 0) / 100)}
                <span className="text-base pl-1">
                  {subscription.interval === "month" ? "per month" : "per year"}
                </span>
              </p>
              <Spacer size={1} />

              <p className="text-sm">
                Renews on:{" "}
                {formatDate_DD_MMMM_YYYY_hh_mm_aa(
                  new Date(Number((subscription.expiry ?? 0) * 1000))
                )}
              </p>
              <Spacer size={3} />
              {subscription.link && (
                <a
                  className="btn-secondary w-full hover:bg-emerald-700 hover:text-white"
                  href={subscription.link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Manage subscription
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
