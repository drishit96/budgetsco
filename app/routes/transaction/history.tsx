import { useAutoAnimate } from "@formkit/auto-animate/react";
import { Ripple } from "@rmwc/ripple";
import { sub, add } from "date-fns";
import { useEffect, useState } from "react";
import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import type { ShouldRevalidateFunction, MetaFunction } from "@remix-run/react";
import {
  useNavigation,
  Form,
  Link,
  useLoaderData,
  useOutletContext,
  useSubmit,
} from "@remix-run/react";
import NextIcon from "~/components/icons/NextIcon";
import AddIcon from "~/components/icons/AddIcon";
import PrevIcon from "~/components/icons/PrevIcon";
import { Spacer } from "~/components/Spacer";
import { Transaction } from "~/components/Transaction";
import type { TransactionResponse } from "~/modules/transaction/transaction.schema";
import {
  getTransactions,
  removeTransaction,
} from "~/modules/transaction/transaction.service";
import type { AppContext } from "~/root";
import { getSessionData } from "~/utils/auth.utils.server";
import {
  formatDate_MMMM_YYYY,
  formatDate_YYY_MM,
  getFirstDateOfThisMonth,
  parseDate,
} from "~/utils/date.utils";
import FilterIcon from "~/components/icons/FilterIcon";
import { InlineSpacer } from "~/components/InlineSpacer";
import type { NewFilter } from "~/components/FilterBottomSheet";
import FilterBottomSheet from "~/components/FilterBottomSheet";
import { divide, formatToCurrency, sum } from "~/utils/number.utils";
import TransactionsTable from "~/components/TransactionsTable";

export const meta: MetaFunction = ({ matches }) => {
  let rootModule = matches.find((match) => match.id === "root");
  return [...(rootModule?.meta ?? []), { title: "Transaction history - Budgetsco" }];
};

export let action: ActionFunction = async ({ request }) => {
  const sessionData = await getSessionData(request);
  if (sessionData == null || sessionData.userId == null) {
    return redirect("/auth/login");
  }

  const { userId, timezone } = sessionData;
  const form = await request.formData();
  const transactionId = form.get("transactionId")?.toString();
  if (request.method !== "DELETE" || transactionId == null) return null;
  return json({
    isDeleted: await removeTransaction(transactionId, userId, timezone),
  });
};

export let loader: LoaderFunction = async ({ request }): Promise<any> => {
  const sessionData = await getSessionData(request);
  if (sessionData == null || sessionData.userId == null) {
    return redirect("/auth/login");
  }

  const { userId, timezone } = sessionData;
  const urlSearchParams = new URL(request.url).searchParams;
  const reqMonth = urlSearchParams.get("month") || undefined;
  const types = urlSearchParams.getAll("type") ?? undefined;
  const categories = urlSearchParams.getAll("category");
  const paymentModes = urlSearchParams.getAll("paymentMode");
  const transactions = getTransactions(userId, timezone, reqMonth, {
    types,
    categories,
    paymentModes,
  });

  const currentMonth = reqMonth ? parseDate(reqMonth) : getFirstDateOfThisMonth(timezone);

  return json(
    {
      types,
      categories,
      paymentModes,
      prevMonth: formatDate_YYY_MM(sub(currentMonth, { months: 1 })),
      currentMonth: formatDate_YYY_MM(currentMonth),
      nextMonth: formatDate_YYY_MM(add(currentMonth, { months: 1 })),
      transactions: await transactions,
    },
    {
      status: 200,
      headers: {
        "Cache-Control": `private, max-age=${5}`,
      },
    }
  );
};

export const shouldRevalidate: ShouldRevalidateFunction = ({
  formMethod,
  defaultShouldRevalidate,
}) => {
  if (formMethod && formMethod !== "GET" && formMethod !== "DELETE") return false;
  return defaultShouldRevalidate;
};

export default function TransactionHistory() {
  const submit = useSubmit();
  const navigation = useNavigation();
  const [listParent] = useAutoAnimate<HTMLUListElement>();
  const context = useOutletContext<AppContext>();
  const {
    types,
    categories,
    paymentModes,
    prevMonth,
    currentMonth,
    nextMonth,
    transactions,
  }: {
    types: string[];
    categories: string[];
    paymentModes: string[];
    prevMonth: string;
    currentMonth: string;
    nextMonth: string;
    transactions: TransactionResponse[];
  } = useLoaderData<typeof loader>();
  const [expandedTransactionIndex, setExpandedTransactionIndex] = useState<
    number | undefined
  >(undefined);
  const [isLargeScreen, setIsLargeScreen] = useState(false);

  useEffect(() => {
    context.showBackButton(true);
  }, [context]);

  const onWindowResize = () => {
    if (!document.hidden) {
      setIsLargeScreen(window.innerWidth >= 1180);
    }
  };

  useEffect(() => {
    setIsLargeScreen(window.innerWidth >= 1180);
    window.addEventListener("resize", onWindowResize);
    return () => {
      window.removeEventListener("resize", onWindowResize);
    };
  }, []);

  function setNewFilter(newFilter: NewFilter) {
    const { selectedCategories, month, selectedTypes, selectedPaymentModes } = newFilter;

    const form = new FormData();
    form.set("month", month);

    if (selectedCategories.length) {
      selectedCategories.forEach((category) => form.append("category", category));
    }

    if (selectedTypes.length) {
      selectedTypes.forEach((type) => form.append("type", type));
    }

    if (selectedPaymentModes.length) {
      selectedPaymentModes.forEach((type) => form.append("paymentMode", type));
    }

    context.setShowLoader(true);
    window.addEventListener(
      "popstate",
      function () {
        setTimeout(() => submit(form, { method: "GET", replace: true }), 200);
      },
      { once: true }
    );
  }

  return (
    <main className="pt-7 pb-12 pl-3 pr-3">
      <h1 className="text-3xl text-center">Your transactions</h1>
      <div className="flex flex-col justify-center items-center">
        <div className="w-full md:w-11/12 xl:w-10/12 mt-3">
          <div className="flex bg-base sticky top-0 z-10">
            <Form
              className="flex flex-col items-center md:items-start w-8/12 lg:w-10/12"
              method="GET"
              action="/transaction/history"
              replace
            >
              <Spacer />
              <fieldset className="flex items-center">
                {types &&
                  types.map((type) => (
                    <input key={type} type="hidden" name="type" value={type} />
                  ))}
                {categories &&
                  categories.map((category) => (
                    <input
                      key={category}
                      type="hidden"
                      name="category"
                      value={category}
                    />
                  ))}
                {paymentModes &&
                  paymentModes.map((paymentMode) => (
                    <input
                      key={paymentMode}
                      type="hidden"
                      name="paymentMode"
                      value={paymentMode}
                    />
                  ))}
                <Ripple unbounded>
                  <button className="p-2" type="submit" name="month" value={prevMonth}>
                    <PrevIcon size={24} />
                  </button>
                </Ripple>

                <span className="text-primary">
                  {formatDate_MMMM_YYYY(parseDate(currentMonth))}
                </span>

                <Ripple unbounded>
                  <button className="p-2" type="submit" name="month" value={nextMonth}>
                    <NextIcon size={24} />
                  </button>
                </Ripple>
              </fieldset>
              <Spacer />
            </Form>
            <Ripple className="rounded-md w-4/12 lg:w-2/12">
              <button
                className="flex justify-center items-center w-full"
                onClick={() =>
                  context.setBottomSheetProps({
                    show: true,
                    closeButtonSize: "sm",
                    content: (
                      <FilterBottomSheet
                        context={context}
                        defaultSelectedCategories={categories}
                        defaultMonth={currentMonth}
                        defaultTypes={types}
                        defaultPaymentModes={paymentModes}
                        onFilterSet={setNewFilter}
                      />
                    ),
                  })
                }
              >
                <FilterIcon size={24} />
                <InlineSpacer size={1} />
                <span className="text-primary">Filter</span>
                <InlineSpacer size={1} />
                {(categories.length > 0 || types.length > 0) && (
                  <span className="w-min pl-1 pr-1 rounded-full bg-emerald-700 text-white">
                    {categories.length + types.length + paymentModes.length}
                  </span>
                )}
              </button>
            </Ripple>
          </div>
          <Spacer />

          <div className="flex flex-wrap md:justify-end gap-2 pl-2 pr-2 text-sm">
            <div>
              <span className="font-bold">Total:</span>
              <InlineSpacer size={1} />
              {formatToCurrency(
                sum(transactions.map((t) => t.amount.toString())),
                context.userPreferredLocale,
                context.userPreferredCurrency
              )}
            </div>

            <span className="grow md:grow-0" />
            <div>
              <span className="font-bold">Average:</span>
              <InlineSpacer size={1} />
              {formatToCurrency(
                divide(
                  sum(transactions.map((t) => t.amount.toString())),
                  transactions.length
                ),
                context.userPreferredLocale,
                context.userPreferredCurrency
              )}
            </div>
          </div>
          <Spacer />

          {isLargeScreen ? (
            <TransactionsTable transactions={transactions} />
          ) : (
            <ul ref={listParent}>
              {transactions.map((transaction, index) => {
                return (
                  <li key={transaction.id}>
                    <Transaction
                      transaction={transaction}
                      navigation={navigation}
                      hideDivider={index == transactions.length - 1}
                      index={index}
                      expandedIndex={expandedTransactionIndex}
                      setExpandedIndex={setExpandedTransactionIndex}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
      <Spacer size={4} />

      <Link
        to="/transaction/create/"
        className="z-20 fixed bottom-8 right-8 shadow-xl focus-ring"
      >
        <Ripple>
          <span className="flex items-center btn-primary">
            <AddIcon size={24} color={"#FFF"} />
            <p className="inline ml-1">Create transaction</p>
          </span>
        </Ripple>
      </Link>
    </main>
  );
}
