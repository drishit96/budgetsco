import type { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { getGPBUserSubscription } from "~/modules/subscriptions/gpb.subscriptions.service";
import { getSessionData } from "~/utils/auth.utils.server";
import { getGPBSubscriptionDetails } from "~/utils/gpb.payment.utils.server";
import { useLoaderData, useOutletContext } from "@remix-run/react";
import { useEffect, useState } from "react";
import { logError } from "~/utils/logger.utils.server";
import { Spacer } from "~/components/Spacer";
import type { AppContext } from "~/root";
import type { GPBSubscriptionState } from "@prisma/client";
import { formatDate_DD_MMMM_YYYY_hh_mm_aa } from "~/utils/date.utils";
import { Ripple } from "@rmwc/ripple";
import Banner from "~/components/Banner";
import type { V2_MetaFunction } from "@remix-run/react/dist/routeModules";

type GPBPlan = {
  id: string;
  name: string;
  description: string;
  period: string;
  amount: string;
};

export const meta: V2_MetaFunction = ({ matches }) => {
  let rootModule = matches.find((match) => match.route.id === "root");
  return [...(rootModule?.meta ?? []), { title: "Subscriptions - Budgetsco" }];
};

export let loader: LoaderFunction = async ({ request }) => {
  try {
    const sessionData = await getSessionData(request);
    if (sessionData == null || sessionData.userId == null) {
      return redirect("/auth/login");
    }

    const { userId, isEmailVerified, isActiveSubscription, paymentGateway } = sessionData;

    if (!isEmailVerified) return redirect("/dashboard");
    if (isActiveSubscription) {
      if (paymentGateway === "STR") return redirect("/subscriptions/str");
      if (paymentGateway == null) {
        throw new Error(`Invalid paymentGateway for userId: ${userId}`);
      }
      const userSubscription = await getGPBUserSubscription(userId);
      if (userSubscription == null) {
        throw new Error(`Subscription not found for GPB user: ${userId}`);
      }

      const subscription = await getGPBSubscriptionDetails(
        userSubscription.purchaseToken
      );
      if (subscription == null) {
        throw new Error(`Subscription could not be fetched from GPB for user: ${userId}`);
      }

      return {
        isActive: isActiveSubscription,
        planId: subscription.data.lineItems && subscription.data.lineItems[0].productId,
        status: userSubscription.state,
        expiry: userSubscription.expiry,
      };
    } else if (paymentGateway == null) {
      return json({ firstPaymentPending: true });
    } else {
      return json({ isActive: false });
    }
  } catch (error) {
    console.log(error);
    logError(error);
    return json({ error: "Something went wrong" });
  }
};

export default function GPB() {
  const context = useOutletContext<AppContext>();
  const subscription = useLoaderData<{
    isActive?: boolean;
    firstPaymentPending?: boolean;
    planId?: string;
    status?: GPBSubscriptionState;
    expiry?: string;
    error?: string;
  }>();
  const [isGPBSupported, setIsGPBSupported] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<GPBPlan>();
  const [plans, setPlans] = useState<GPBPlan[]>([]);

  async function getAvailablePlans() {
    try {
      const service = await window.getDigitalGoodsService(
        "https://play.google.com/billing"
      );
      if (service) {
        const skuDetails = await service.getDetails(["monthly_sub", "yearly_sub"]);
        const availablePlans: GPBPlan[] = skuDetails.map((sku): GPBPlan => {
          return {
            id: sku.itemId as string,
            name: (sku.title as string).split("(")[0],
            description: sku.description,
            period: sku.subscriptionPeriod === "P1M" ? "per month" : "per year",
            amount: new Intl.NumberFormat(navigator.language, {
              style: "currency",
              currency: sku.price.currency,
            }).format(sku.price.value),
          };
        });

        if (subscription.isActive) {
          const activePlan = availablePlans.find((p) => p.id === subscription.planId);
          setSelectedPlan(activePlan);
        } else {
          setSelectedPlan(availablePlans[0]);
        }

        setPlans(availablePlans);
      } else {
        location.replace("/subscriptions/str");
      }
    } catch (error) {
      console.log(error);
      if (error && error.toString().includes("unsupported context")) {
        location.replace("/subscriptions/str");
      }
    }
  }

  async function handleSubscribe(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    e.preventDefault();
    const selectedPlanId = selectedPlan?.id ?? "";
    const paymentMethods = [
      {
        supportedMethods: "https://play.google.com/billing",
        data: {
          sku: selectedPlanId,
        },
      },
    ];
    const paymentDetails = {
      total: {
        label: `Total`,
        amount: { currency: `USD`, value: `0` },
      },
    };
    const request = new PaymentRequest(paymentMethods, paymentDetails);
    try {
      const paymentResponse = await request.show();
      const { purchaseToken } = paymentResponse.details;

      const resp = await fetch("/api/acknowledgePurchase", {
        method: "POST",
        body: JSON.stringify({
          subscriptionId: selectedPlanId,
          purchaseToken,
        }),
      });

      const response: { acknowledged: boolean } = await resp.json();
      if (response.acknowledged) {
        await paymentResponse.complete("success");
      }

      await paymentResponse.complete("fail");

      location.replace("/dashboard");
    } catch (error) {
      let message: string | undefined;
      if (error?.toString().includes("RESULT_CANCELED")) {
        message = "Looks like you closed the window mid way. Please try again.";
      }
      context.setDialogProps({
        message: message ?? "Please try again later",
        showDialog: true,
        title: "Payment failed",
      });
    }
  }

  useEffect(() => {
    context.setShowLoader(false);
    context.showBackButton(true);
    const gpbSupported = "getDigitalGoodsService" in window;
    if (!subscription.isActive && !gpbSupported) {
      location.replace("/subscriptions/str");
    }

    setIsGPBSupported(gpbSupported);
    if (subscription.isActive && !gpbSupported) {
      location.replace(
        `https://play.google.com/store/account/subscriptions?sku=${subscription.planId}&package=com.app.budgetsco`
      );
    }
    gpbSupported && getAvailablePlans();
  }, []);

  return (
    <main className="pt-5 pb-28 pl-3 pr-3">
      <h1 className="text-3xl text-center pb-7">
        {subscription.isActive ? "Subscription" : "Select a plan"}
      </h1>

      <div className="flex justify-center">
        <div className="flex flex-col w-full lg:w-1/2">
          {(subscription.status === "SUBSCRIPTION_STATE_ON_HOLD" ||
            subscription.status === "SUBSCRIPTION_STATE_IN_GRACE_PERIOD") && (
            <Banner
              type="urgent"
              message="There is a problem with your subscription. Please go to Google Play subscription settings to fix your payment method."
              showAction
              actionText="Open Google Play Store"
              onActionClick={() => {
                location.assign(
                  `https://play.google.com/store/account/subscriptions?sku=${subscription.planId}&package=com.app.budgetsco`
                );
              }}
            />
          )}

          {subscription.isActive &&
            subscription.status === "SUBSCRIPTION_STATE_ACTIVE" &&
            selectedPlan && (
              <div className="p-4 border rounded-md">
                <span className="pl-2 pr-2 pt-1 pb-1 rounded-md border border-green-900 bg-green-50 text-green-900 text-sm font-bold">
                  ACTIVE
                </span>

                <Spacer size={1} />
                <p className="text-sm">{selectedPlan.name}</p>
                <p className="text-3xl">
                  {selectedPlan.amount}
                  <span className="text-base pl-1">{selectedPlan.period}</span>
                </p>
                <Spacer size={1} />

                <p>
                  Renews on:{" "}
                  {formatDate_DD_MMMM_YYYY_hh_mm_aa(
                    new Date(Number(subscription.expiry))
                  )}
                </p>
                <Spacer />

                <button
                  className="btn-secondary w-full"
                  onClick={() =>
                    location.assign(
                      `https://play.google.com/store/account/subscriptions?sku=${subscription.planId}&package=com.app.budgetsco`
                    )
                  }
                >
                  Manage subscription in Google Play
                </button>
              </div>
            )}

          {!subscription.isActive && isGPBSupported && (
            <>
              {plans.map((plan) => {
                return (
                  <>
                    <label
                      key={plan.id}
                      className={`flex items-center p-3 border-2 rounded-md ${
                        selectedPlan?.id === plan.id ? "border-emerald-700" : ""
                      }`}
                    >
                      <input
                        className="radio form-radio"
                        type="radio"
                        name="plan"
                        value={plan.id}
                        defaultChecked={plan.id === selectedPlan?.id}
                        onChange={() => setSelectedPlan(plan)}
                      />
                      <Spacer />
                      <div>
                        <p className="text-base">{plan.name}</p>
                        <p className="text-3xl">
                          {plan.amount}
                          <span className="text-base pl-1">{plan.period}</span>
                        </p>
                      </div>
                    </label>
                    <Spacer />
                  </>
                );
              })}
              {selectedPlan && (
                <Ripple>
                  <button
                    className="btn-primary w-full"
                    onClick={(e) => handleSubscribe(e)}
                  >
                    {subscription.firstPaymentPending
                      ? "Start 45 day free trial"
                      : "Subscribe now"}
                  </button>
                </Ripple>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
