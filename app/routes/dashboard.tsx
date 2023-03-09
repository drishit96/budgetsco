import { useEffect, useState } from "react";
import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import {
  Link,
  useLoaderData,
  useOutletContext,
  useSubmit,
  useTransition,
} from "@remix-run/react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import AddIcon from "~/components/icons/AddIcon";
import { Spacer } from "~/components/Spacer";
import { Transaction } from "~/components/Transaction";
import type { TransactionResponse } from "~/modules/transaction/transaction.schema";
import {
  removeTransaction,
  getRecentTransactions,
} from "~/modules/transaction/transaction.service";
import type { AppContext } from "~/root";
import {
  getSessionCookie,
  getSessionData,
  getUserPreferencesFromSessionCookie,
} from "~/utils/auth.utils.server";
import type { Transition } from "@remix-run/react/dist/transition";
import { Ripple } from "@rmwc/ripple";
import {
  deleteRecurringTransaction,
  getOverDueTransactions,
  getUpcomingTransactions,
  markTransactionAsDone,
} from "~/modules/recurring/recurring.service";
import type { RecurringTransactionsResponse } from "~/modules/recurring/recurring.schema";
import { RecurringTransaction } from "~/components/RecurringTransaction";
import { isNotNullAndEmpty, isNullOrEmpty } from "~/utils/text.utils";
import {
  getFCMRegistrationToken,
  isNotificationSupported,
  regenerateUserIdToken,
} from "~/utils/firebase.utils";
import { saveNotificationToken } from "~/modules/user/user.service";
import { getCurrencyName } from "~/utils/category.utils";
import { getUserPreferencesAfterTimestamp } from "~/modules/settings/settings.service";
import Banner from "~/components/Banner";
import { getThisMonthTarget } from "~/modules/reports/reports.service";
import { StatisticsCard } from "~/components/StatisticsCard";
import type { V2_MetaFunction } from "@remix-run/react/dist/routeModules";
import { formatDate_MMMM_YYYY } from "~/utils/date.utils";
import type { Currency } from "~/utils/number.utils";
import SubscriptionRequiredBottomSheet from "~/components/SubscriptionRequiredBottomSheet";

export const meta: V2_MetaFunction = ({ matches }) => {
  let rootModule = matches.find((match) => match.route.id === "root");
  return [...(rootModule?.meta ?? []), { title: "Dashboard - Budgetsco" }];
};

export let action: ActionFunction = async ({ request }) => {
  const sessionData = await getSessionData(request);
  if (sessionData == null || sessionData.userId == null) {
    return redirect("/auth/login");
  }

  const { userId, timezone } = sessionData;
  switch (request.method) {
    case "POST": {
      const form = await request.formData();
      const formName = form.get("formName")?.toString();

      if (formName === "MARK_AS_DONE_FORM") {
        const transactionId = form.get("transactionId")?.toString();
        if (isNotNullAndEmpty(transactionId)) {
          const isTransactionMarkedAsDone = await markTransactionAsDone(
            userId,
            timezone,
            transactionId
          );

          return json({ isTransactionMarkedAsDone });
        }
      } else if (formName === "REFRESH_SESSION_FORM") {
        const idToken = form.get("idToken")?.toString();
        if (isNotNullAndEmpty(idToken)) {
          const preferences = await getUserPreferencesFromSessionCookie(request);
          if (preferences == null) {
            throw new Error(`userPreferences missing for userId: ${userId}`);
          }
          return json(
            { sessionRefreshed: true },
            {
              headers: {
                "Set-Cookie": await getSessionCookie(idToken, preferences),
              },
            }
          );
        }
      } else if (formName === "SAVE_REGISTRATION_TOKEN") {
        const token = form.get("token")?.toString();
        if (isNotNullAndEmpty(token)) {
          const isTokenSaved = await saveNotificationToken(userId, token);
          return json({ registrationTokenSaved: isTokenSaved });
        }
      }
    }
    case "DELETE": {
      const form = await request.formData();
      const transactionId = form.get("transactionId")?.toString();
      if (transactionId == null) return null;

      const formName = form.get("formName")?.toString();
      if (formName === "DELETE_RECURRING_TRANSACTION_FORM") {
        return json({
          isDeleted: await deleteRecurringTransaction(userId, transactionId),
        });
      }

      return json({
        isDeleted: await removeTransaction(transactionId, userId, timezone),
      });
    }
  }
};

export let loader: LoaderFunction = async ({ request }) => {
  const sessionData = await getSessionData(request);
  if (sessionData == null || sessionData.userId == null) {
    return redirect("/auth/login");
  }

  const { userId, timezone, isEmailVerified } = sessionData;

  if (!isEmailVerified) {
    return redirect("/verifyEmail");
  }

  const overDueTransactions = getOverDueTransactions(userId, timezone);
  const upcomingTransactions = getUpcomingTransactions(userId, timezone);
  const transactions = getRecentTransactions(userId, timezone);
  const targetDetails = getThisMonthTarget(userId, timezone);
  const getLatestPreferences = getUserPreferencesAfterTimestamp(
    sessionData.lastModified,
    userId
  );
  await Promise.allSettled([
    overDueTransactions,
    upcomingTransactions,
    transactions,
    targetDetails,
    getLatestPreferences,
  ]);

  const headers: { [key: string]: string } = {};
  const refreshSession =
    sessionData &&
    sessionData?.expiresOn &&
    Date.now() > sessionData?.expiresOn * 1000 - 172_800_000
      ? true
      : false;

  return json(
    {
      overDueTransactions: await overDueTransactions,
      upcomingTransactions: await upcomingTransactions,
      transactions: await transactions,
      targetDetails: await targetDetails,
      askUserForNewTarget: (await targetDetails) == null,
      recommendToSetBudget: (await targetDetails)?.thisMonth?.budget == 0,
      refreshSession,
    },
    {
      status: 200,
      headers,
    }
  );
};

function renderRecurringTransactions(
  recurringTransactions: RecurringTransactionsResponse,
  transition: Transition,
  setExpandedTransactionIndex: React.Dispatch<React.SetStateAction<number | undefined>>,
  expandedTransactionIndex?: number
) {
  return recurringTransactions.map((transaction, index) => {
    return (
      <li key={transaction.id}>
        <RecurringTransaction
          transaction={transaction}
          transition={transition}
          hideDivider={index == recurringTransactions.length - 1}
          index={index}
          expandedIndex={expandedTransactionIndex}
          setExpandedIndex={setExpandedTransactionIndex}
        />
      </li>
    );
  });
}

function renderTransactions(
  transactions: TransactionResponse[],
  transition: Transition,
  setExpandedRecurringTransactionIndex: React.Dispatch<
    React.SetStateAction<number | undefined>
  >,
  expandedRecurringTransactionIndex?: number
) {
  return transactions.map((transaction, index) => {
    return (
      <li key={transaction.id}>
        <Transaction
          transaction={transaction}
          transition={transition}
          hideDivider={index == transactions.length - 1}
          index={index}
          expandedIndex={expandedRecurringTransactionIndex}
          setExpandedIndex={setExpandedRecurringTransactionIndex}
        />
      </li>
    );
  });
}

export default function Index() {
  const transition = useTransition();
  const [bannerParent] = useAutoAnimate<HTMLDivElement>();
  const [listParent] = useAutoAnimate<HTMLUListElement>();
  const context = useOutletContext<AppContext>();
  const submit = useSubmit();
  const [isRefreshCallSent, setIsRefreshCallSent] = useState(false);
  const [browserSupportsNotification, setBrowserSupportsNotification] = useState(false);
  const [expandedOverdueTransactionIndex, setExpandedOverdueTransactionIndex] = useState<
    number | undefined
  >(undefined);
  const [expandedUpcomingTransactionIndex, setExpandedUpcomingTransactionIndex] =
    useState<number | undefined>(undefined);
  const [expandedTransactionIndex, setExpandedTransactionIndex] = useState<
    number | undefined
  >(undefined);
  const {
    overDueTransactions,
    upcomingTransactions,
    transactions,
    targetDetails,
    askUserForNewTarget,
    recommendToSetBudget,
    refreshSession,
  }: {
    overDueTransactions: RecurringTransactionsResponse;
    upcomingTransactions: RecurringTransactionsResponse;
    transactions: TransactionResponse[];
    targetDetails: {
      thisMonth: { budget: number; expense: number; date: string };
      prevMonth: { budget: number; expense: number };
    };
    askUserForNewTarget: boolean;
    recommendToSetBudget: boolean;
    refreshSession: boolean;
  } = useLoaderData<typeof loader>();

  if (refreshSession && !isRefreshCallSent) {
    regenerateUserIdToken().then((idToken) => {
      if (isNullOrEmpty(idToken)) return;

      context.setSnackBarMsg("Session refreshed");

      const form = new FormData();
      form.set("formName", "REFRESH_SESSION_FORM");
      form.set("idToken", idToken);
      submit(form, { method: "post" });

      setIsRefreshCallSent(true);
    });
  }

  async function checkSupportForNotifications() {
    const isSupported = await isNotificationSupported();
    setBrowserSupportsNotification(isSupported);
  }

  async function requestNotificationPermission() {
    const { token, error } = await getFCMRegistrationToken();
    if (isNullOrEmpty(token) && isNotNullAndEmpty(error)) {
      context.setSnackBarMsg("Notifications not supported by browser");
      return;
    }
    if (isNullOrEmpty(token)) return;

    const form = new FormData();
    form.set("formName", "SAVE_REGISTRATION_TOKEN");
    form.set("token", token);
    submit(form, { method: "post", replace: true });
  }

  async function checkForUnAcknowledgedPurchases() {
    if ("getDigitalGoodsService" in window) {
      const service = await window.getDigitalGoodsService(
        "https://play.google.com/billing"
      );
      if (service) {
        const existingPurchases = await service.listPurchases();
        const purchase = existingPurchases && existingPurchases[0];
        if (purchase) {
          const resp = await fetch("/api/acknowledgePurchase", {
            method: "POST",
            body: JSON.stringify({
              subscriptionId: purchase.itemId,
              purchaseToken: purchase.purchaseToken,
            }),
          });

          const response: { acknowledged: boolean } = await resp.json();
          if (response.acknowledged) {
            context.setSnackBarMsg("Subscription active");
          }
        }
      }
    }
  }

  useEffect(() => {
    checkSupportForNotifications();
    checkForUnAcknowledgedPurchases();
  }, []);

  useEffect(() => {
    if (
      transition.state === "submitting" &&
      transition.submission.formData.get("formName") === "SAVE_REGISTRATION_TOKEN"
    ) {
      context.setSnackBarMsg("Notifications enabled");
    }
  }, [transition.state, transition.submission?.formData, context]);

  useEffect(() => {
    context.showBackButton(false);
  }, [context]);

  return (
    <main className="pb-28 pl-3 pr-3">
      <h1 className="text-3xl text-center pb-5">Dashboard</h1>
      <div className="flex flex-col items-center">
        <div
          ref={bannerParent}
          className="flex flex-wrap items-center space-y-1 w-full md:w-3/4 lg:w-2/3 xl:w-1/2"
        >
          {context.isActiveSubscription && !context.isMFAOn && (
            <Banner
              type="important"
              message={`Enable two factor authentication (2FA) to add an additional layer of security to your account by requiring more than just a password to sign in. (You can always enable it from settings)`}
              showLink
              link="/settings/security/mfa"
              linkText="Set up 2FA"
              allowDismiss={false}
              allowPermanentDismiss={true}
              permanentDismissSettingName={"show2FASuggestion"}
            />
          )}
          <Banner
            type="tip"
            message={`Your currency is set to ${getCurrencyName(
              context.currency
            )}. If this isn't right, you can change it now. You can always change it from settings.`}
            showLink
            link={`/settings/changeCurrency?value=${
              context.userPreferredCurrency ?? context.currency
            }`}
            linkText="Change currency"
            allowDismiss={false}
            allowPermanentDismiss={true}
            permanentDismissSettingName={"showChangeCurrencyBanner"}
          />

          {context.isActiveSubscription &&
            browserSupportsNotification &&
            Notification.permission !== "granted" && (
              <Banner
                type="tip"
                message="Enable notifications for recurring transactions."
                showAction
                actionText={
                  transition.state === "submitting" &&
                  transition.submission.formData.get("formName") ===
                    "SAVE_REGISTRATION_TOKEN"
                    ? "Enabling..."
                    : "Enable"
                }
                allowDismiss={false}
                allowPermanentDismiss={true}
                permanentDismissSettingName={"showNotificationBanner"}
                onActionClick={requestNotificationPermission}
              />
            )}

          {context.isEmailVerified && askUserForNewTarget && (
            <>
              <Spacer />
              <Banner
                type="important"
                message="It's time to set a budget for this month"
                showLink
                link="/settings/createBudget"
                linkText="Set now"
              />
            </>
          )}

          {recommendToSetBudget && (
            <>
              {!context.isActiveSubscription ? (
                <Banner
                  type="tip"
                  message="Don't let your expenses control you"
                  showAction
                  actionText="Set budget now"
                  onActionClick={() => {
                    context.setBottomSheetProps({
                      show: true,
                      content: (
                        <SubscriptionRequiredBottomSheet
                          context={context}
                          onRefresh={() => {
                            history.back();
                          }}
                        />
                      ),
                    });
                  }}
                />
              ) : (
                <Banner
                  type="tip"
                  message="Don't let your expenses control you"
                  showLink
                  link="/settings/editBudget"
                  linkText="Set budget now"
                />
              )}
            </>
          )}
        </div>

        {overDueTransactions && overDueTransactions.length > 0 && (
          <div className="p-2 rounded-md w-full md:w-3/4 lg:w-2/3 xl:w-1/2 mt-3 bg-red-50">
            <p className="text-lg text-center text-red-700 p-1 font-bold">Overdue</p>
            <Spacer size={1} />
            <ul ref={listParent}>
              {renderRecurringTransactions(
                overDueTransactions,
                transition,
                setExpandedOverdueTransactionIndex,
                expandedOverdueTransactionIndex
              )}
            </ul>
            <Spacer />
          </div>
        )}

        <div className="w-full md:w-3/4 lg:w-2/3 xl:w-1/2 mt-1 p-2 rounded-md bg-slate-50">
          <p className="text-center text-gray-700 font-bold p-1">
            {formatDate_MMMM_YYYY(new Date(targetDetails.thisMonth.date))}
          </p>
          <Spacer size={0.5} />
          <div className="flex flex-wrap gap-1">
            <StatisticsCard
              name="Budget"
              num={targetDetails.thisMonth.budget}
              color="green"
              currency={context.userPreferredCurrency ?? (context.currency as Currency)}
              locale={context.userPreferredLocale ?? context.locale}
            />
            <StatisticsCard
              name="Expense"
              num={targetDetails.thisMonth.expense}
              positiveIsBetter={false}
              perc={
                ((targetDetails.thisMonth.expense - targetDetails.prevMonth.expense) /
                  Math.abs(targetDetails.prevMonth.expense)) *
                100
              }
              color="red"
              currency={context.userPreferredCurrency ?? (context.currency as Currency)}
              locale={context.userPreferredLocale ?? context.locale}
            />
            <StatisticsCard
              name="Savings"
              num={targetDetails.thisMonth.budget - targetDetails.thisMonth.expense}
              positiveIsBetter={true}
              perc={
                ((targetDetails.thisMonth.budget -
                  targetDetails.thisMonth.expense -
                  (targetDetails.prevMonth.budget - targetDetails.prevMonth.expense)) /
                  Math.abs(
                    targetDetails.prevMonth.budget - targetDetails.prevMonth.expense
                  )) *
                100
              }
              color="blue"
              currency={context.userPreferredCurrency ?? (context.currency as Currency)}
              locale={context.userPreferredLocale ?? context.locale}
            />
          </div>
        </div>

        {upcomingTransactions && upcomingTransactions.length > 0 && (
          <div className="bg-amber-50 p-2 rounded-md w-full md:w-3/4 lg:w-2/3 xl:w-1/2 mt-2">
            <p className="text-lg text-center text-amber-700 p-1 font-bold">Upcoming</p>
            <Spacer size={1} />
            <ul ref={listParent}>
              {renderRecurringTransactions(
                upcomingTransactions,
                transition,
                setExpandedUpcomingTransactionIndex,
                expandedUpcomingTransactionIndex
              )}
            </ul>
          </div>
        )}

        {transactions && (
          <div className="p-2 rounded-md w-full md:w-3/4 lg:w-2/3 xl:w-1/2 mt-3 bg-slate-50">
            <p className="text-lg text-center text-gray-700 p-1 font-bold">
              Recent transactions
            </p>
            <Spacer />
            <ul ref={listParent}>
              {renderTransactions(
                transactions,
                transition,
                setExpandedTransactionIndex,
                expandedTransactionIndex
              )}
            </ul>
            {transactions.length == 0 && (
              <>
                <p className="text-center text-sm">
                  You haven't created any transactions yet
                </p>
              </>
            )}
            <Spacer />

            {transactions.length > 0 && (
              <div className="flex">
                <div className="flex-grow"></div>
                <Ripple accent>
                  <Link
                    to={`/transaction/history`}
                    prefetch="render"
                    className="btn-secondary-sm whitespace-nowrap"
                  >
                    Show more
                  </Link>
                </Ripple>
              </div>
            )}
          </div>
        )}

        {context.isActiveSubscription && (
          <Link
            to="/transaction/create/"
            className="z-20 fixed bottom-16 right-8 shadow-xl focus-ring"
          >
            <Ripple>
              <span className="flex items-center btn-primary">
                <AddIcon size={24} color={"#FFF"} />
                <p className="inline ml-1">Create transaction</p>
              </span>
            </Ripple>
          </Link>
        )}

        {!context.isActiveSubscription && (
          <button
            className="z-20 fixed btn-primary bottom-16 right-8 shadow-xl"
            onClick={() => {
              context.setBottomSheetProps({
                show: true,
                content: (
                  <SubscriptionRequiredBottomSheet
                    context={context}
                    onRefresh={() => {
                      history.back();
                    }}
                  />
                ),
              });
            }}
          >
            <Ripple>
              <span className="flex items-center">
                <AddIcon size={24} color={"#FFF"} />
                <p className="inline ml-1">Create transaction</p>
              </span>
            </Ripple>
          </button>
        )}
      </div>
    </main>
  );
}
