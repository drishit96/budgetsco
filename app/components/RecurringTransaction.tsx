import { useAutoAnimate } from "@formkit/auto-animate/react";
import type { Transition } from "@remix-run/react/dist/transition";
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

export function RecurringTransaction({
  transaction,
  transition,
  hideDivider = false,
  manageView = false,
  index,
  expandedIndex,
  setExpandedIndex,
}: {
  transaction: RecurringTransactionResponse;
  transition: Transition;
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
    transition.state === "submitting" &&
    transition.submission.formData.get("transactionId") === transaction.id;
  const isTransactionMaskAsDoneInProgress =
    isTransactionUpdateInProgress &&
    transition.submission.formData.get("formName") === "MARK_AS_DONE_FORM";
  const isTransactionDeleteInProgress =
    isTransactionUpdateInProgress &&
    transition.submission.method === "DELETE" &&
    transition.submission.formData.get("formName") ===
      "DELETE_RECURRING_TRANSACTION_FORM";

  return (
    <div ref={listItemParent}>
      <Ripple>
        <button
          className={`w-full bg-white focus-border p-2 rounded-md 
          ${hideDivider ? "" : "border-b"} 
          ${expandedIndex === index ? "border-t border-l border-r rounded-b-none" : ""}`}
          onClick={() => {
            setExpandedIndex((prevIndex) => (prevIndex === index ? undefined : index));
          }}
        >
          <div className="flex flex-col">
            <div className="flex">
              <span className="font-bold text-gray-700">{transaction.category}</span>
              <span className="flex-grow"></span>
              <span className={getTransactionColor(transaction.type) + " font-bold"}>
                {transaction.type === "income" ? "+" : "-"}
                {formatNumber(transaction.amount, context.userPreferredLocale)}
              </span>
            </div>

            {transaction.description && (
              <div>
                <Spacer size={1} />
                <span className="flex gap-2 bg-white">
                  <InfoIcon size={24} />
                  <span>{transaction.description}</span>
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
        <div className="w-full flex border-b border-t rounded-b-md bg-white">
          {!manageView && (
            <Form
              replace
              method="post"
              className="flex-1 cursor-pointer border-l border-r"
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

          {manageView && (
            <Ripple>
              <Link
                to={`/transaction/recurring/edit/${transaction.id}`}
                className="flex flex-col flex-1 items-center p-3 border-l focus-border"
              >
                <EditIcon size={24} />
                <Spacer size={1} />
                Edit
              </Link>
            </Ripple>
          )}

          <Form
            replace
            method="delete"
            className="flex-1 cursor-pointer border-l border-r"
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
                        method: "delete",
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
