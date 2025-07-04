import { Ripple } from "@rmwc/ripple";
import { useEffect, useState } from "react";
import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";

import {
  Form,
  useActionData,
  useLoaderData,
  useNavigation,
  useOutletContext,
  useSubmit,
} from "@remix-run/react";

import CheckIcon from "~/components/icons/CheckIcon";
import { ErrorValidation } from "~/components/ErrorValidation";
import { InlineSpacer } from "~/components/InlineSpacer";
import NumberInputLarge from "~/components/NumberInputLarge";
import { Spacer } from "~/components/Spacer";
import type { TransactionType } from "~/modules/transaction/transaction.schema";
import type { AppContext } from "~/root";
import { getSessionData } from "~/utils/auth.utils.server";
import {
  addNewCustomCategoryToLocalStorage,
  getAllPaymentModes,
  getAllTransactionTypes,
  getCombinedTransactionTypeCategoriesForSelection,
  getTransactionTypeCategoriesForSelection,
  isNewCustomCategory,
} from "~/utils/category.utils";
import { getCurrencySymbol } from "~/utils/number.utils";
import { isNotNullAndEmpty, isNullOrEmpty } from "~/utils/text.utils";
import type { RecurringTransactionResponse } from "~/modules/recurring/recurring.schema";
import { parseRecurringTransactionInput } from "~/modules/recurring/recurring.schema";
import {
  editRecurringTransaction,
  getRecurringTransaction,
} from "~/modules/recurring/recurring.service";
import RecurringSetup from "~/components/RecurringSetup";
import { addNewCustomCategory } from "~/modules/transaction/transaction.service";
import type { MetaFunction } from "@remix-run/react/dist/routeModules";
import { ComboBox } from "~/components/ComboBox";
import { trackEvent } from "~/utils/analytics.utils.server";
import { EventNames } from "~/lib/anaytics.contants";
import { logError } from "~/utils/logger.utils.server";

export const meta: MetaFunction = ({ matches }) => {
  let rootModule = matches.find((match) => match.id === "root");
  return [
    ...(rootModule?.meta ?? []),
    { title: "Edit recurring transaction - Budgetsco" },
  ];
};

export const action: ActionFunction = async ({ request, params }) => {
  const sessionData = await getSessionData(request);
  if (sessionData == null || sessionData.userId == null) {
    return redirect("/auth/login");
  }

  const { userId } = sessionData;
  if (isNullOrEmpty(params.recurringTransactionId)) {
    return { transaction: null };
  }

  const form = await request.formData();
  const categoriesString = form.get("categories")?.toString();
  const [category, category2, category3] =
    categoriesString == null ? [] : categoriesString.split(",");

  const recurringTransactionInput = {
    occurrence: form.get("occurrence"),
    interval: Number(form.get("interval")),
    description: form.get("description"),
    amount: form.get("amount")?.toString(),
    type: form.get("type"),
    category,
    category2,
    category3,
    paymentMode: form.get("paymentMode"),
    startDate: form.get("startDate")?.toString().trim(),
  };

  const { errors, transaction } = parseRecurringTransactionInput(
    recurringTransactionInput
  );
  if (errors == null) {
    try {
      const editRecurringTransactionTask = editRecurringTransaction(
        userId,
        params.recurringTransactionId,
        transaction
      );
      const tasks: Promise<any>[] = [editRecurringTransactionTask];
      const newCategory = form.get("customCategory")?.toString();
      if (newCategory) {
        tasks.push(addNewCustomCategory(userId, transaction.type, newCategory));
      }
      await Promise.allSettled(tasks);
      const isTransactionSaved = await editRecurringTransactionTask;
      isTransactionSaved && trackEvent(request, EventNames.RECURRING_TRANSACTION_EDITED);
      return isTransactionSaved ? { data: { isTransactionSaved: true } } : null;
    } catch (err) {
      logError(err);
      return null;
    }
  } else {
    return { errors };
  }
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const sessionData = await getSessionData(request);
  if (sessionData == null || sessionData.userId == null) {
    return redirect("/auth/login");
  }

  const { timezone } = sessionData;
  if (isNullOrEmpty(params.recurringTransactionId)) return { transaction: null };

  const recurringTransaction = await getRecurringTransaction(
    params.recurringTransactionId,
    sessionData.userId
  );

  const startDate = (recurringTransaction?.executionDate ?? new Date()).toLocaleString(
    "en-US",
    { timeZone: timezone }
  );
  return Response.json({
    startDate,
    recurringTransaction,
  });
};

const transactionTypes = getAllTransactionTypes();
const paymentModes = getAllPaymentModes();

export default function EditRecurringTransaction() {
  const submit = useSubmit();
  const navigation = useNavigation();
  const { startDate, recurringTransaction } = useLoaderData<{
    startDate: string;
    recurringTransaction: RecurringTransactionResponse;
  }>();
  const [transactionType, setTransactionType] = useState<TransactionType>(
    recurringTransaction.type
  );
  const context = useOutletContext<AppContext>();
  const [categories, setCategories] = useState(
    getTransactionTypeCategoriesForSelection(recurringTransaction.type as TransactionType)
  );
  const actionData = useActionData<{
    errors?: { [key: string]: string };
    data?: { isTransactionSaved: boolean };
  }>();
  const isSubmittingData = navigation.state === "submitting";
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    recurringTransaction.category,
  ]);
  const [paymentMode, setPaymentMode] = useState(recurringTransaction.paymentMode);

  useEffect(() => {
    if (actionData?.data?.isTransactionSaved) {
      context.setSnackBarMsg("Transaction updated");
      history.back();
    }
  }, [actionData?.data?.isTransactionSaved]);

  useEffect(() => {
    context.showBackButton(true);
  }, [context]);

  useEffect(() => {
    setCategories(getCombinedTransactionTypeCategoriesForSelection(transactionType));
  }, []);

  useEffect(() => {
    if (isSubmittingData) {
      context.setSnackBarMsg("Updating transaction...");
    }
  }, [isSubmittingData, context]);

  function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const categoriesString = formData.get("categories")?.toString();
    if (categoriesString) {
      const categories = categoriesString.split(",");
      const isNewCategory = isNewCustomCategory(transactionType, categories[0]);

      if (isNewCategory) {
        formData.set("customCategory", categories[0]);
        addNewCustomCategoryToLocalStorage(transactionType, categories[0]);
      }
    }

    submit(formData, { method: "POST", replace: true });
  }

  return (
    <>
      {recurringTransaction != null ? (
        <main className="p-7 pb-28">
          <h1 className="text-3xl text-center pb-7">Edit recurring transaction</h1>
          <Form replace method="POST" onSubmit={(e) => handleFormSubmit(e)}>
            <fieldset disabled={isSubmittingData}>
              <p className="text-center">Amount:</p>
              <p className="text-center">
                <NumberInputLarge
                  name="amount"
                  autoFocus
                  defaultValue={recurringTransaction.amount}
                  required
                  min={0}
                  prefix={getCurrencySymbol("en-US", context.userPreferredCurrency)}
                  disabled={isSubmittingData}
                />
              </p>
              <div className="flex flex-col items-center">
                <ErrorValidation error={actionData?.errors?.amount} />
              </div>

              <Spacer size={3} />
              <div className="flex justify-center">
                <div className="flex flex-col w-full max-w-sm">
                  <label>
                    <p>Type</p>
                    <select
                      name="type"
                      className="form-select select w-full"
                      defaultValue={
                        transactionTypes.find(
                          (t) => t.value === recurringTransaction.type
                        )?.value
                      }
                      onChange={(e) => {
                        if (isNullOrEmpty(e.target.value)) return;
                        setTransactionType(e.target.value as TransactionType);
                        setCategories(
                          getCombinedTransactionTypeCategoriesForSelection(
                            e.target.value as TransactionType
                          )
                        );
                      }}
                    >
                      {transactionTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                    <ErrorValidation error={actionData?.errors?.type} />
                  </label>
                  <Spacer size={3} />

                  <ComboBox
                    name="category"
                    labelId="Category"
                    defaultInputValue={recurringTransaction.category}
                    placeholder="Type a category here"
                    onCreateItem={(item) => {
                      if (isNullOrEmpty(item)) return;
                      setSelectedCategories([item.value]);
                    }}
                    onSelectedItemChange={(changes) => {
                      if (isNullOrEmpty(changes.selectedItem)) return;
                      setSelectedCategories([changes.selectedItem.value]);
                    }}
                    selectedItem={{
                      label: selectedCategories[0],
                      value: selectedCategories[0],
                    }}
                    items={categories}
                    itemToString={(item) => (item ? item.label : "")}
                  />
                  <ErrorValidation
                    error={
                      actionData?.errors?.category ??
                      actionData?.errors?.category2 ??
                      actionData?.errors?.category3
                    }
                  />

                  <input
                    type="hidden"
                    name="categories"
                    value={selectedCategories.join(",")}
                  />

                  <Spacer size={3} />
                  <ComboBox
                    name="paymentModeToShow"
                    labelId="Payment mode"
                    defaultInputValue={recurringTransaction.paymentMode}
                    placeholder="Type a payment mode here"
                    onCreateItem={(item) => {
                      if (isNullOrEmpty(item)) return;
                      setPaymentMode(item.value);
                    }}
                    onSelectedItemChange={(changes) => {
                      if (isNullOrEmpty(changes.selectedItem)) return;
                      setPaymentMode(changes.selectedItem.value);
                    }}
                    selectedItem={
                      paymentModes.find((p) => p.value == paymentMode) ?? {
                        label: recurringTransaction.paymentMode,
                        value: recurringTransaction.paymentMode,
                      }
                    }
                    items={paymentModes}
                    itemToString={(item) => (item ? item.value : "")}
                  />
                  <input type="hidden" name="paymentMode" value={paymentMode} />
                  <ErrorValidation error={actionData?.errors?.paymentMode} />

                  <Spacer size={3} />
                  <textarea
                    name="description"
                    className="input text-center"
                    placeholder="Description (optional)"
                    defaultValue={recurringTransaction.description ?? undefined}
                  />

                  <Spacer />
                  <div className="border border-primary p-4 rounded-md">
                    <RecurringSetup
                      disableInput={isSubmittingData}
                      data={{
                        occurrence: recurringTransaction.occurrence,
                        interval: recurringTransaction.interval,
                      }}
                      startDate={startDate}
                      errors={actionData?.errors}
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="fixed bottom-8 right-8 shadow-xl focus-ring"
              >
                <Ripple>
                  <span className="flex items-center btn-primary">
                    <CheckIcon color="#FFF" />
                    <InlineSpacer size={1} />
                    {isSubmittingData ? "Saving..." : "Save"}
                  </span>
                </Ripple>
              </button>
            </fieldset>
          </Form>
        </main>
      ) : (
        <div>Transaction not found</div>
      )}
    </>
  );
}
