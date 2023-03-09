import { useAutoAnimate } from "@formkit/auto-animate/react";
import type { Transition } from "@remix-run/react/dist/transition";
import { Ripple } from "@rmwc/ripple";
import type { SubmitOptions } from "@remix-run/react";
import { Form, Link, useOutletContext, useSubmit } from "@remix-run/react";
import type { TransactionResponse } from "~/modules/transaction/transaction.schema";
import type { AppContext } from "~/root";
import { getTransactionColor } from "~/utils/colors.utils";
import { formatDate_DD_MMMM_YYYY } from "~/utils/date.utils";
import { formatNumber } from "~/utils/number.utils";
import EditIcon from "./EditIcon";
import InfoIcon from "./InfoIcon";
import RepeatIcon from "./RepeatIcon";
import { Spacer } from "./Spacer";
import TrashIcon from "./TrashIcon";
import SubscriptionRequiredBottomSheet from "./SubscriptionRequiredBottomSheet";

export function Transaction({
  transaction,
  transition,
  hideDivider = false,
  index,
  expandedIndex,
  setExpandedIndex,
  submitAction,
}: {
  transaction: TransactionResponse;
  transition: Transition;
  hideDivider?: boolean;
  index: number;
  expandedIndex?: number;
  setExpandedIndex: React.Dispatch<React.SetStateAction<number | undefined>>;
  submitAction?: string;
}) {
  const [listItemParent] = useAutoAnimate<HTMLDivElement>();
  const context = useOutletContext<AppContext>();
  const submit = useSubmit();
  const isTransactionUpdateInProgress =
    transition.state === "submitting" &&
    transition.submission.method === "DELETE" &&
    transition.submission.formData.get("transactionId") === transaction.id;

  return (
    <div ref={listItemParent}>
      <Ripple>
        <button
          data-test-id={`more-${transaction.category.split(" ").join("")}-${
            transaction.amount
          }`}
          className={`w-full bg-white focus-border p-2 
          ${hideDivider ? "" : "border-b"} 
          ${expandedIndex === index ? "border-t border-l border-r rounded-t-md" : ""}`}
          onClick={(e) => {
            e.preventDefault();
            setExpandedIndex((prevIndex) => (prevIndex === index ? undefined : index));
          }}
        >
          <div className="flex flex-col">
            <div className="flex">
              <span className="font-bold text-gray-700">{transaction.category}</span>
              <span className="flex-grow"></span>
              <span
                className={
                  getTransactionColor(transaction.type) + " font-bold tabular-nums"
                }
              >
                {transaction.type === "income" ? "+" : "-"}
                {formatNumber(
                  transaction.amount,
                  context.userPreferredLocale ?? context.locale
                )}
              </span>
            </div>
            <Spacer size={1} />
            <div className="flex">
              <span className="text-gray-500">
                {formatDate_DD_MMMM_YYYY(new Date(transaction.createdAt))}
              </span>
              <span className="flex-grow"></span>
              <span className="text-gray-500">{transaction.paymentMode}</span>
            </div>
          </div>
        </button>
      </Ripple>

      {expandedIndex === index && (
        <div>
          {transaction.description && (
            <div className="border-l border-r bg-white">
              <span className="flex gap-2 pl-4 pr-4 pt-2 pb-2 items-center">
                <InfoIcon size={24} />
                <span>{transaction.description}</span>
              </span>
            </div>
          )}
          <div className="w-full flex border-b border-t rounded-b-md bg-white">
            <Ripple>
              <Link
                data-test-id={"btn-edit"}
                to={`/transaction/edit/${transaction.id}`}
                className="flex flex-col flex-1 items-center p-3 border-l focus-border"
              >
                <EditIcon size={24} />
                <Spacer size={1} />
                Edit
              </Link>
            </Ripple>

            {context.isActiveSubscription && (
              <Ripple>
                <Link
                  data-test-id={"btn-make-this-recurring"}
                  to={`/transaction/recurring/new?amount=${
                    transaction.amount
                  }&category=${transaction.category.replace("&", "%26")}&type=${
                    transaction.type
                  }&paymentMode=${transaction.paymentMode}&description=${
                    transaction.description
                  }`}
                  className="flex flex-col flex-1 items-center p-3 border-l focus-border"
                >
                  <RepeatIcon size={24} />
                  <Spacer size={1} />
                  <span className="text-center">Make this recurring</span>
                </Link>
              </Ripple>
            )}

            {!context.isActiveSubscription && (
              <Ripple>
                <button
                  className="flex flex-col flex-1 items-center p-3 border-l focus-border"
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
                  <RepeatIcon size={24} />
                  <Spacer size={1} />
                  <span className="text-center">Make this recurring</span>
                </button>
              </Ripple>
            )}

            <Form
              replace
              method="delete"
              className="flex-1 cursor-pointer border-l border-r"
            >
              <input type="hidden" name="transactionId" value={transaction.id} />
              <Ripple>
                <button
                  data-test-id={"btn-delete"}
                  className="flex flex-col w-full p-3 items-center focus-border"
                  type="submit"
                  disabled={isTransactionUpdateInProgress}
                  onClick={(e) => {
                    e.preventDefault();
                    context.setDialogProps({
                      title: "Delete transaction?",
                      message:
                        "Once you delete this transaction, it cannot be recovered. Continue with deletion?",
                      showDialog: true,
                      positiveButton: "Delete",
                      onPositiveClick: () => {
                        const form = new FormData();
                        form.set("transactionId", transaction.id);
                        const submitOptions: SubmitOptions = {
                          method: "delete",
                          replace: true,
                        };
                        if (submitAction) {
                          submitOptions.action = submitAction;
                        }
                        submit(form, submitOptions);
                      },
                    });
                  }}
                >
                  <TrashIcon size={24} />
                  <Spacer size={1} />
                  {isTransactionUpdateInProgress ? "Deleting..." : "Delete"}
                </button>
              </Ripple>
            </Form>
          </div>
        </div>
      )}
    </div>
  );
}
