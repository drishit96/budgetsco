import type { Navigation } from "@remix-run/router";
import { Ripple } from "@rmwc/ripple";
import type { SubmitOptions } from "@remix-run/react";
import { Form, Link, useOutletContext, useSubmit } from "@remix-run/react";
import type { TransactionResponse } from "~/modules/transaction/transaction.schema";
import type { AppContext } from "~/root";
import { getTransactionColor } from "~/utils/colors.utils";
import { formatDate_DD_MMMM_YYYY } from "~/utils/date.utils";
import { formatNumber } from "~/utils/number.utils";
import EditIcon from "./icons/EditIcon";
import InfoIcon from "./icons/InfoIcon";
import RepeatIcon from "./icons/RepeatIcon";
import { Spacer } from "./Spacer";
import TrashIcon from "./icons/TrashIcon";
import ListItem from "./ListItem";

export function Transaction({
  transaction,
  navigation,
  hideDivider = false,
  index,
  expandedIndex,
  setExpandedIndex,
  submitAction,
}: {
  transaction: TransactionResponse;
  navigation: Navigation;
  hideDivider?: boolean;
  index: number;
  expandedIndex?: number;
  setExpandedIndex: React.Dispatch<React.SetStateAction<number | undefined>>;
  submitAction?: string;
}) {
  const context = useOutletContext<AppContext>();
  const submit = useSubmit();
  const isTransactionUpdateInProgress =
    navigation.state === "submitting" &&
    navigation.formMethod === "DELETE" &&
    navigation.formData?.get("transactionId") === transaction.id;

  return (
    <ListItem
      dataTestId={`more-${transaction.category.split(" ").join("")}-${
        transaction.amount
      }`}
      hideDivider={hideDivider}
      index={index}
      expandedIndex={expandedIndex}
      setExpandedIndex={setExpandedIndex}
      content={
        <div className="flex flex-col">
          <div className="flex">
            <span className="font-bold">{transaction.category}</span>
            <span className="grow"></span>
            <span
              className={
                getTransactionColor(transaction.type) + " font-bold tabular-nums"
              }
            >
              {transaction.type === "income" ? "+" : "-"}
              {formatNumber(
                transaction.amount.toString(),
                context.userPreferredLocale ?? context.locale
              )}
            </span>
          </div>
          <Spacer size={1} />
          <div className="flex">
            <span className="text-gray-500">
              {formatDate_DD_MMMM_YYYY(new Date(transaction.createdAt))}
            </span>
            <span className="grow"></span>
            <span className="text-gray-500">{transaction.paymentMode}</span>
          </div>
        </div>
      }
      expandedContent={
        <div>
          {transaction.description && (
            <div className="text-primary border-l border-r border-primary bg-base">
              <span className="flex gap-2 pl-4 pr-4 pt-2 pb-2 items-center">
                <InfoIcon size={24} />
                <span className="text-primary">{transaction.description}</span>
              </span>
            </div>
          )}
          <div className="w-full flex border-b border-t border-primary rounded-b-md bg-base">
            <Ripple>
              <Link
                data-test-id={"btn-edit"}
                to={`/transaction/edit/${transaction.id}`}
                className="flex flex-col flex-1 items-center p-3 border-l border-primary focus-border"
              >
                <EditIcon size={24} />
                <Spacer size={1} />
                Edit
              </Link>
            </Ripple>

            <Ripple>
              <Link
                data-test-id={"btn-make-this-recurring"}
                to={`/transaction/recurring/new?amount=${
                  transaction.amount
                }&category=${encodeURIComponent(transaction.category)}&type=${
                  transaction.type
                }&paymentMode=${transaction.paymentMode}&description=${
                  transaction.description
                }`}
                className="flex flex-col flex-1 items-center p-3 border-l border-primary focus-border"
              >
                <RepeatIcon size={24} />
                <Spacer size={1} />
                <span className="text-center">Make this recurring</span>
              </Link>
            </Ripple>

            <Form
              replace
              method="DELETE"
              className="flex-1 cursor-pointer border-l border-r border-primary"
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
                          method: "DELETE",
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
      }
    ></ListItem>
  );
}
