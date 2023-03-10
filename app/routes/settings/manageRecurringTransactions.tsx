import { useAutoAnimate } from "@formkit/auto-animate/react";
import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { useLoaderData, useTransition } from "@remix-run/react";
import type { V2_MetaFunction } from "@remix-run/react/dist/routeModules";
import type { Transition } from "@remix-run/react/dist/transition";
import { useState } from "react";
import { RecurringTransaction } from "~/components/RecurringTransaction";
import type { RecurringTransactionsResponse } from "~/modules/recurring/recurring.schema";
import {
  deleteRecurringTransaction,
  getAllRecurringTransactions,
} from "~/modules/recurring/recurring.service";
import { getSessionData } from "~/utils/auth.utils.server";

export const meta: V2_MetaFunction = ({ matches }) => {
  let rootModule = matches.find((match) => match.route.id === "root");
  return [
    ...(rootModule?.meta ?? []),
    {
      title: "Manage recurring transactions - Budgetsco",
    },
  ];
};

export let action: ActionFunction = async ({ request }) => {
  const sessionData = await getSessionData(request);
  if (sessionData == null || sessionData.userId == null) {
    return redirect("/auth/login");
  }

  const { userId } = sessionData;
  switch (request.method) {
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
    }
  }
};

export let loader: LoaderFunction = async ({ request }): Promise<any> => {
  const sessionData = await getSessionData(request);
  if (sessionData == null || sessionData.userId == null) {
    return redirect("/auth/login");
  }

  const recurringTransactions = await getAllRecurringTransactions(sessionData.userId);

  return json({ recurringTransactions });
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
          manageView={true}
          index={index}
          expandedIndex={expandedTransactionIndex}
          setExpandedIndex={setExpandedTransactionIndex}
        />
      </li>
    );
  });
}

export default function ManageRecurringTransactions() {
  const transition = useTransition();
  const [listParent] = useAutoAnimate<HTMLUListElement>();
  const { recurringTransactions } = useLoaderData<{
    recurringTransactions: RecurringTransactionsResponse;
  }>();
  const [expandedTransactionIndex, setExpandedTransactionIndex] = useState<
    number | undefined
  >(undefined);
  return (
    <>
      <main className="pt-7 pb-12 pl-3 pr-3">
        <p className="text-3xl text-center pb-7">Your Recurring Transactions</p>
        <div className="flex flex-col justify-center items-center">
          <div className="border rounded-md w-full md:w-3/4 lg:w-2/3 xl:w-1/2 mt-3">
            <ul ref={listParent}>
              {renderRecurringTransactions(
                recurringTransactions as unknown as RecurringTransactionsResponse,
                transition,
                setExpandedTransactionIndex,
                expandedTransactionIndex
              )}
            </ul>
          </div>
        </div>
      </main>
    </>
  );
}
