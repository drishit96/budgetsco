import { useAutoAnimate } from "@formkit/auto-animate/react";
import type { Navigation } from "@remix-run/router";
import { Ripple } from "@rmwc/ripple";
import { Form, Link, useOutletContext, useSubmit } from "@remix-run/react";
import type { RecurringTransactionResponse } from "~/modules/recurring/recurring.schema";
import type { AppContext } from "~/root";
import { getTransactionColor } from "~/utils/colors.utils";
import { formatDate_DD_MMMM_YYYY_hh_mm_aa } from "~/utils/date.utils";
import { formatNumber } from "~/utils/number.utils";
import CheckIcon from "./icons/CheckIcon";
import InfoIcon from "./icons/InfoIcon";
import { Spacer } from "./Spacer";
import TrashIcon from "./icons/TrashIcon";
import EditIcon from "./icons/EditIcon";
import SkipIcon from "./icons/SkipIcon";

export function RecurringTransaction({
  transaction,
  navigation,
  hideDivider = false,
  manageView = false,
  index,
  expandedIndex,
  setExpandedIndex,
}: {
  transaction: RecurringTransactionResponse;
  navigation: Navigation;
  hideDivider?: boolean;
  manageView?: boolean;
  index: number;
  expandedIndex?: number;
  setExpandedIndex: React.Dispatch<React.SetStateAction<number | undefined>>;
}) {
  const [listItemParent] = useAutoAnimate<HTMLDivElement>();
  const context = useOutletContext<AppContext>();
  const submit = useSubmit();
  const isTransactionUpdateInProgress =
    navigation.state === "submitting" &&
    navigation.formData?.get("transactionId") === transaction.id;
  const isTransactionMaskAsDoneInProgress =
    isTransactionUpdateInProgress &&
    navigation.formData?.get("formName") === "MARK_AS_DONE_FORM";
  const isTransactionDeleteInProgress =
    isTransactionUpdateInProgress &&
    navigation.formMethod === "DELETE" &&
    navigation.formData?.get("formName") === "DELETE_RECURRING_TRANSACTION_FORM";
  const isTransactionSkipInProgress =
    isTransactionUpdateInProgress &&
    navigation.formData?.get("formName") === "SKIP_TRANSACTION_FORM";

  return (
    <div ref={listItemParent}>
      <Ripple>
        <button
          className={`w-full bg-base border-primary focus-border p-2 rounded-md 
          ${hideDivider ? "" : "border-b"} 
          ${expandedIndex === index ? "border-t border-l border-r rounded-b-none" : ""}`}
          onClick={() => {
            setExpandedIndex((prevIndex) => (prevIndex === index ? undefined : index));
          }}
        >
          <div className="flex flex-col">
            <div className="flex">
              <span className="font-bold">{transaction.category}</span>
              <span className="flex-grow"></span>
              <span className={getTransactionColor(transaction.type) + " font-bold"}>
                {transaction.type === "income" ? "+" : "-"}
                {formatNumber(transaction.amount.toString(), context.userPreferredLocale)}
              </span>
            </div>

            {transaction.description && (
              <div>
                <Spacer size={1} />
                <span className="flex gap-2 bg-base">
                  <InfoIcon size={24} />
                  <span className="text-primary">{transaction.description}</span>
                </span>
              </div>
            )}

            <Spacer size={1} />
            <div className="flex">
              <span className="text-gray-500">
                {formatDate_DD_MMMM_YYYY_hh_mm_aa(new Date(transaction.executionDate))}
              </span>
            </div>
          </div>
        </button>
      </Ripple>

      {expandedIndex === index && (
        <div className="w-full flex border-b border-t border-primary rounded-b-md bg-base">
          {!manageView && (
            <Form
              replace
              method="POST"
              className="flex-1 cursor-pointer border-l border-r border-primary"
            >
              <input type="hidden" name="formName" value="MARK_AS_DONE_FORM" />
              <input type="hidden" name="transactionId" value={transaction.id} />
              <Ripple>
                <button
                  data-test-id={"btn-recurring-done"}
                  className="flex flex-col w-full p-3 items-center focus-border"
                  type="submit"
                  disabled={isTransactionUpdateInProgress}
                >
                  <CheckIcon size={24} />
                  <Spacer size={1} />
                  {isTransactionMaskAsDoneInProgress ? "Saving..." : "Done"}
                </button>
              </Ripple>
            </Form>
          )}

          {!manageView && (
            <Form
              replace
              method="POST"
              className="flex-1 cursor-pointer border-l border-r border-primary"
            >
              <input type="hidden" name="formName" value="SKIP_TRANSACTION_FORM" />
              <input type="hidden" name="transactionId" value={transaction.id} />
              <Ripple>
                <button
                  data-test-id={"btn-recurring-skip"}
                  className="flex flex-col w-full p-3 items-center focus-border"
                  type="submit"
                  disabled={isTransactionUpdateInProgress}
                >
                  <SkipIcon size={24} />
                  <Spacer size={1} />
                  {isTransactionSkipInProgress ? "Skipping..." : "Skip"}
                </button>
              </Ripple>
            </Form>
          )}

          {manageView && (
            <Ripple>
              <Link
                to={`/transaction/recurring/edit/${transaction.id}`}
                className="flex flex-col flex-1 items-center p-3 border-l border-primary focus-border"
              >
                <EditIcon size={24} />
                <Spacer size={1} />
                Edit
              </Link>
            </Ripple>
          )}

          <Form
            replace
            method="DELETE"
            className="flex-1 cursor-pointer border-l border-r border-primary"
          >
            <input type="hidden" name="transactionId" value={transaction.id} />
            <input
              type="hidden"
              name="formName"
              value="DELETE_RECURRING_TRANSACTION_FORM"
            />
            <Ripple>
              <button
                data-test-id={"btn-recurring-delete"}
                className="flex flex-col w-full p-3 items-center focus-border"
                type="submit"
                disabled={isTransactionUpdateInProgress}
                onClick={(e) => {
                  e.preventDefault();
                  context.setDialogProps({
                    title: "Delete recurring transaction?",
                    message:
                      "Once you delete this transaction, it cannot be recovered. Continue with deletion?",
                    showDialog: true,
                    positiveButton: "Delete",
                    onPositiveClick: () => {
                      const form = new FormData();
                      form.set("formName", "DELETE_RECURRING_TRANSACTION_FORM");
                      form.set("transactionId", transaction.id);
                      submit(form, {
                        method: "DELETE",
                        replace: true,
                      });
                    },
                  });
                }}
              >
                <TrashIcon size={24} />
                <Spacer size={1} />
                {isTransactionDeleteInProgress ? "Deleting..." : "Delete"}
              </button>
            </Ripple>
          </Form>
        </div>
      )}
    </div>
  );
}
