import { useEffect, useState } from "react";
import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import type { Navigation } from "@remix-run/router";
import {
  Link,
  useLoaderData,
  useNavigation,
  useOutletContext,
  useSubmit,
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
import { abs, calculate, subtract } from "~/utils/number.utils";
import { trackEvent } from "~/utils/analytics.utils.server";
import { EventNames } from "~/lib/anaytics.contants";

export const meta: V2_MetaFunction = ({ matches }) => {
  const rootModule = matches.find((match) => match.id === "root");
  return [...(rootModule?.meta ?? []), { title: "Dashboard - Budgetsco" }];
};

export const action: ActionFunction = async ({ request }) => {
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
          const { isTransactionMarkedAsDone, type } = await markTransactionAsDone(
            userId,
            timezone,
            transactionId
          );

          if (isTransactionMarkedAsDone) {
            trackEvent(request, EventNames.RECURRING_TRANSACTION_MARKED_AS_DONE);
            trackEvent(request, EventNames.TRANSACTION_CREATED, {
              type,
              isCreatedFromRecurringTransaction: "yes",
            });
          }

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

      let isDeleted = false;
      const formName = form.get("formName")?.toString();
      if (formName === "DELETE_RECURRING_TRANSACTION_FORM") {
        isDeleted = await deleteRecurringTransaction(userId, transactionId);
        trackEvent(request, EventNames.RECURRING_TRANSACTION_DELETED);
        return json({ isDeleted });
      }

      isDeleted = await removeTransaction(transactionId, userId, timezone);
      trackEvent(request, EventNames.TRANSACTION_DELETED);
      return json({ isDeleted });
    }
  }
};

export const loader: LoaderFunction = async ({ request }) => {
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
      recommendToSetBudget: (await targetDetails)?.thisMonth?.budget?.isZero(),
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
  navigation: Navigation,
  setExpandedTransactionIndex: React.Dispatch<React.SetStateAction<number | undefined>>,
  expandedTransactionIndex?: number
) {
  return recurringTransactions.map((transaction, index) => {
    return (
      <li key={transaction.id}>
        <RecurringTransaction
          transaction={transaction}
          navigation={navigation}
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
  navigation: Navigation,
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
          navigation={navigation}
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
  const navigation = useNavigation();
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
      thisMonth: { budget: string; expense: string; date: string };
      prevMonth: { budget: string; expense: string };
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
      submit(form, { method: "POST" });

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
    submit(form, { method: "POST", replace: true });
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
    if (navigation.state === "submitting") {
      if (navigation.formData?.get("formName") === "SAVE_REGISTRATION_TOKEN") {
        context.setSnackBarMsg("Notifications enabled");
      } else if (navigation.formData?.get("formName") === "MARK_AS_DONE_FORM") {
        const successSound = new Audio("/sounds/success.mp3");
        successSound.play();
      }
    }
  }, [navigation.state, navigation.formData, context]);

  useEffect(() => {
    context.showBackButton(false);
  }, [context]);

  return (
    <main className="pb-28 pl-3 pr-3">
      <h1 className="text-3xl text-center text-primary-dark pb-5">Dashboard</h1>
      <div className="flex flex-col items-center">
        <div
          ref={bannerParent}
          className="flex flex-wrap items-center space-y-1 w-full md:w-3/4 lg:w-2/3 xl:w-1/2"
        >
          {!context.isMFAOn && (
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

          {browserSupportsNotification && Notification.permission !== "granted" && (
            <Banner
              type="tip"
              message="Enable notifications for recurring transactions."
              showAction
              actionText={
                navigation.state === "submitting" &&
                navigation.formData?.get("formName") === "SAVE_REGISTRATION_TOKEN"
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
            <Banner
              type="tip"
              message="Don't let your expenses control you"
              showLink
              link="/settings/editBudget"
              linkText="Set budget now"
            />
          )}
        </div>

        {overDueTransactions && overDueTransactions.length > 0 && (
          <div className="p-2 rounded-md w-full md:w-3/4 lg:w-2/3 xl:w-1/2 mt-3 bg-urgent">
            <p className="text-lg text-center text-urgent p-1 font-bold">Overdue</p>
            <Spacer size={1} />
            <ul ref={listParent}>
              {renderRecurringTransactions(
                overDueTransactions,
                navigation,
                setExpandedOverdueTransactionIndex,
                expandedOverdueTransactionIndex
              )}
            </ul>
            <Spacer />
          </div>
        )}

        <div className="w-full md:w-3/4 lg:w-2/3 xl:w-1/2 mt-1 p-2 rounded-md bg-elevated-10">
          <p className="text-center text-primary font-bold p-1">
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
              perc={calculate(targetDetails.thisMonth.expense)
                .minus(targetDetails.prevMonth.expense)
                .dividedBy(abs(targetDetails.prevMonth.expense))
                .mul(100)
                .toNumber()}
              color="red"
              currency={context.userPreferredCurrency ?? (context.currency as Currency)}
              locale={context.userPreferredLocale ?? context.locale}
            />
            <StatisticsCard
              name="Savings"
              num={calculate(targetDetails.thisMonth.budget)
                .minus(targetDetails.thisMonth.expense)
                .toString()}
              positiveIsBetter={true}
              perc={calculate(targetDetails.thisMonth.budget)
                .minus(targetDetails.thisMonth.expense)
                .minus(
                  subtract(
                    targetDetails.prevMonth.budget,
                    targetDetails.prevMonth.expense
                  )
                )
                .dividedBy(
                  calculate(targetDetails.prevMonth.budget)
                    .minus(targetDetails.prevMonth.expense)
                    .abs()
                )
                .mul(100)
                .toNumber()}
              color="blue"
              currency={context.userPreferredCurrency ?? (context.currency as Currency)}
              locale={context.userPreferredLocale ?? context.locale}
            />
          </div>
        </div>

        {upcomingTransactions && upcomingTransactions.length > 0 && (
          <div className="bg-important p-2 rounded-md w-full md:w-3/4 lg:w-2/3 xl:w-1/2 mt-2">
            <p className="text-lg text-center text-important p-1 font-bold">Upcoming</p>
            <Spacer size={1} />
            <ul ref={listParent}>
              {renderRecurringTransactions(
                upcomingTransactions,
                navigation,
                setExpandedUpcomingTransactionIndex,
                expandedUpcomingTransactionIndex
              )}
            </ul>
          </div>
        )}

        {transactions && (
          <div className="p-2 rounded-md w-full md:w-3/4 lg:w-2/3 xl:w-1/2 mt-3 bg-elevated-10">
            <p className="text-lg text-center text-primary p-1 font-bold">
              Recent transactions
            </p>
            <Spacer />
            <ul ref={listParent}>
              {renderTransactions(
                transactions,
                navigation,
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
      </div>
    </main>
  );
}
