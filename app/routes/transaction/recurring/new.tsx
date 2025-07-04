import { Ripple } from "@rmwc/ripple";
import { useEffect } from "react";
import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import {
  Form,
  useActionData,
  useLoaderData,
  useNavigation,
  useOutletContext,
} from "@remix-run/react";
import { Badge } from "~/components/Badge";
import CheckIcon from "~/components/icons/CheckIcon";
import InfoIcon from "~/components/icons/InfoIcon";
import { InlineSpacer } from "~/components/InlineSpacer";
import RecurringSetup from "~/components/RecurringSetup";
import { Spacer } from "~/components/Spacer";
import { parseRecurringTransactionInput } from "~/modules/recurring/recurring.schema";
import { createNewRecurringTransaction } from "~/modules/recurring/recurring.service";
import type { AppContext } from "~/root";
import { getSessionData } from "~/utils/auth.utils.server";
import { getAllTransactionTypes } from "~/utils/category.utils";
import { formatToCurrency } from "~/utils/number.utils";
import { isNotNullAndEmpty, isNullOrEmpty } from "~/utils/text.utils";
import type { MetaFunction } from "@remix-run/react/dist/routeModules";
import { trackEvent } from "~/utils/analytics.utils.server";
import { EventNames } from "~/lib/anaytics.contants";

export const meta: MetaFunction = ({ matches }) => {
  let rootModule = matches.find((match) => match.id === "root");
  return [
    ...(rootModule?.meta ?? []),
    { title: "New recurring transaction - Budgetsco" },
  ];
};

export let action: ActionFunction = async ({ request }) => {
  const sessionData = await getSessionData(request);
  if (sessionData == null || sessionData.userId == null) {
    return redirect("/auth/login");
  }

  const { userId, timezone } = sessionData;

  const form = await request.formData();

  const recurringTransactionInput = {
    occurrence: form.get("occurrence"),
    interval: Number(form.get("interval")),
    description: form.get("description"),
    amount: form.get("amount")?.toString(),
    type: form.get("type"),
    category: form.get("category")?.toString().trim(),
    category2: form.get("category2")?.toString().trim(),
    category3: form.get("category3")?.toString().trim(),
    paymentMode: form.get("paymentMode"),
    startDate: form.get("startDate")?.toString().trim(),
  };
  const recurringTransaction = parseRecurringTransactionInput(recurringTransactionInput);
  if (recurringTransaction.errors) {
    return {
      data: recurringTransactionInput,
      errors: recurringTransaction.errors,
    };
  } else {
    const { success: isRecurringTransactionSaved } = await createNewRecurringTransaction(
      userId,
      timezone,
      recurringTransaction.transaction
    );
    trackEvent(request, EventNames.RECURRING_TRANSACTION_CREATED, {
      type: recurringTransaction.transaction.type,
      occurrence: recurringTransaction.transaction.occurrence,
      interval: recurringTransaction.transaction.interval.toString(),
    });
    return { isRecurringTransactionSaved };
  }
};

export const loader: LoaderFunction = async ({ request }) => {
  const sessionData = await getSessionData(request);
  if (sessionData == null || sessionData.userId == null) {
    return redirect("/auth/login");
  }

  const { timezone } = sessionData;

  const urlParams = new URL(request.url).searchParams;
  const amount = urlParams.get("amount") ?? "0";
  const category = urlParams.get("category");
  const type = urlParams.get("type") ?? "";
  const paymentMode = urlParams.get("paymentMode") ?? "";
  const description = urlParams.get("description");

  const startDate = new Date().toLocaleString("en-US", { timeZone: timezone });

  return { amount, category, type, paymentMode, description, startDate };
};

const transactionTypes = getAllTransactionTypes();

export default function NewRecurringTransaction() {
  const navigation = useNavigation();
  const context = useOutletContext<AppContext>();
  const isSubmittingData = navigation.state === "submitting";
  let { amount, category, type, paymentMode, description, startDate } = useLoaderData<{
    amount: string;
    category?: string;
    type: string;
    paymentMode: string;
    description: string;
    startDate: string;
  }>();
  const actionData = useActionData<{
    isRecurringTransactionSaved?: boolean;
    data?: {
      amount: string;
      category?: string;
      type: string;
      paymentMode: string;
      description: string;
      startDate: string;
    };
    errors?: { [key: string]: string };
  }>();

  if (actionData && actionData.data) {
    ({ amount, category, type, paymentMode, description, startDate } = actionData.data);
  }

  useEffect(() => {
    if (actionData?.isRecurringTransactionSaved) {
      history.back();
    }
  }, [actionData?.isRecurringTransactionSaved]);

  useEffect(() => {
    context.showBackButton(true);
  }, [context]);

  return (
    <main className="p-7 pb-28">
      <h1 className="text-3xl text-center pb-7">Recurring Transaction</h1>
      <div className="flex justify-center">
        <div className="flex flex-col w-full max-w-sm">
          <Form replace method="POST">
            <fieldset className="border border-primary p-4 rounded-md">
              <Spacer size={1} />
              <Badge
                value={transactionTypes.find((t) => t.value === type)?.label ?? "Expense"}
                size={"md"}
              />
              <input type="hidden" name="type" value={type} />
              <Spacer />

              <p className="text-5xl">
                {formatToCurrency(
                  amount,
                  context.userPreferredLocale,
                  context.userPreferredCurrency
                )}
              </p>
              <Spacer />

              <p className="text-primary font-semibold">{category}</p>
              <input type="hidden" name="amount" value={amount} />
              <input type="hidden" name="category" value={category} />
              <input type="hidden" name="paymentMode" value={paymentMode} />

              {description && (
                <>
                  <Spacer />
                  <span className="flex gap-2 items-center">
                    <InfoIcon size={24} />
                    <span>{description}</span>
                  </span>
                  <input type="hidden" name="description" value={description} />
                </>
              )}
            </fieldset>

            <Spacer size={1} />

            <div className="border border-primary p-4 rounded-md">
              <RecurringSetup
                disableInput={isSubmittingData}
                startDate={startDate}
                errors={actionData?.errors}
              />
            </div>

            <button type="submit" className="fixed bottom-8 right-8 shadow-xl focus-ring">
              <Ripple>
                <span className="flex items-center btn-primary">
                  <CheckIcon color="#FFF" />
                  <InlineSpacer size={1} />
                  {isSubmittingData ? "Saving..." : "Save"}
                </span>
              </Ripple>
            </button>
          </Form>
        </div>
      </div>
    </main>
  );
}
