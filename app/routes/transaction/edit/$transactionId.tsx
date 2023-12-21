import type { Transaction } from "@prisma/client";
import { Ripple } from "@rmwc/ripple";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";

import {
  Form,
  useActionData,
  useFetcher,
  useLoaderData,
  useNavigation,
  useOutletContext,
  useSubmit,
} from "@remix-run/react";

import CheckIcon from "~/components/icons/CheckIcon";
import { ErrorValidation } from "~/components/ErrorValidation";
import { InfoText } from "~/components/InfoText";
import { InlineSpacer } from "~/components/InlineSpacer";
import NumberInputLarge from "~/components/NumberInputLarge";
import { Spacer } from "~/components/Spacer";
import type { TransactionType } from "~/modules/transaction/transaction.schema";
import { parseTransactionInput } from "~/modules/transaction/transaction.schema";
import {
  addNewCustomCategory,
  editTransaction,
  getMonthlyTarget,
  getTransaction,
} from "~/modules/transaction/transaction.service";
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
import {
  calculate,
  formatToCurrency,
  getCurrencySymbol,
  max,
  subtract,
} from "~/utils/number.utils";
import { isNullOrEmpty } from "~/utils/text.utils";
import type { MetaFunction } from "@remix-run/react/dist/routeModules";
import { logError } from "~/utils/logger.utils.server";
import {
  formatDate_YYYY_MM_DD,
  getFirstDateOfMonth,
  getFirstDateOfThisMonth,
} from "~/utils/date.utils";
import { ComboBox } from "~/components/ComboBox";
import { trackEvent } from "~/utils/analytics.utils.server";
import { EventNames } from "~/lib/anaytics.contants";

export const meta: MetaFunction = ({ matches }) => {
  let rootModule = matches.find((match) => match.id === "root");
  return [...(rootModule?.meta ?? []), { title: "Edit transaction - Budgetsco" }];
};

export const action: ActionFunction = async ({ request, params }) => {
  const sessionData = await getSessionData(request);
  if (sessionData == null || sessionData.userId == null) {
    return redirect("/auth/login");
  }

  const { userId, timezone } = sessionData;
  if (isNullOrEmpty(params.transactionId)) return json({ transaction: null });

  const form = await request.formData();
  const categoriesString = form.get("categories")?.toString();
  const [category, category2, category3] =
    categoriesString == null ? [] : categoriesString.split(",");

  const transactionInput = {
    description: form.get("description"),
    amount: Number(form.get("amount")),
    type: form.get("type"),
    category,
    category2,
    category3,
    paymentMode: form.get("paymentMode"),
  };

  const { errors, transaction } = parseTransactionInput(transactionInput);
  if (errors == null) {
    try {
      const editTransactionTask = editTransaction(
        userId,
        params.transactionId,
        transaction,
        timezone
      );
      const tasks = [editTransactionTask];
      const newCategory = form.get("customCategory")?.toString();
      if (newCategory) {
        tasks.push(addNewCustomCategory(userId, transaction.type, newCategory));
      }

      await Promise.allSettled(tasks);
      const isTransactionSaved = await editTransactionTask;
      isTransactionSaved &&
        trackEvent(request, EventNames.TRANSACTION_EDITED, { type: transaction.type });
      return isTransactionSaved ? json({ data: { isTransactionSaved: true } }) : null;
    } catch (err) {
      console.error(err);
      logError(err);
      return null;
    }
  } else {
    return json({ errors });
  }
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const sessionData = await getSessionData(request);
  if (sessionData == null || sessionData.userId == null) {
    return redirect("/auth/login");
  }

  const { userId, timezone } = sessionData;

  if (isNullOrEmpty(params.transactionId)) return json({ transaction: null });

  const transaction = await getTransaction(params.transactionId, sessionData.userId);
  if (transaction == null) return json({ transaction: null });

  const monthData = await getMonthlyTarget(userId, transaction.createdAt);
  return {
    monthData,
    transaction,
    isPastMonth:
      formatDate_YYYY_MM_DD(getFirstDateOfMonth(transaction.createdAt)) !==
      formatDate_YYYY_MM_DD(getFirstDateOfThisMonth(timezone)),
  };
};

const transactionTypes = getAllTransactionTypes();
const paymentModes = getAllPaymentModes();

export default function EditTransaction() {
  const submit = useSubmit();
  const navigation = useNavigation();
  const { monthData, transaction, isPastMonth } = useLoaderData<{
    monthData: {
      budget: string;
      expense: string;
    };
    transaction: Transaction;
    isPastMonth: boolean;
  }>();
  const context = useOutletContext<AppContext>();
  const categoryRemainingBudgetFetcher = useFetcher();
  const categoryRemainingBudgetMap = useRef<{
    [key: string]: number | null | undefined;
  }>({});
  const [amount, setAmount] = useState(transaction.amount);
  const [showRemainingBudget, setShowRemainingBudget] = useState(
    transaction.type === "expense"
  );
  const [remainingBudget, setRemainingBudget] = useState(
    subtract(monthData.budget, monthData.expense)
  );
  const [transactionType, setTransactionType] = useState<TransactionType>(
    transaction.type as TransactionType
  );
  const [categories, setCategories] = useState(
    getTransactionTypeCategoriesForSelection(transaction.type as TransactionType)
  );
  const actionData = useActionData<{
    errors?: { [key: string]: string };
    data?: { isTransactionSaved: boolean };
  }>();
  const isSubmittingData = navigation.state === "submitting";
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    transaction.category,
  ]);
  const [paymentMode, setPaymentMode] = useState(transaction.paymentMode);

  const calculateRemainingBudget = useCallback(
    (newTransactionAmount: string) => {
      if (isNullOrEmpty(newTransactionAmount)) {
        newTransactionAmount = "0";
      }
      const newCategory = selectedCategories[0];
      if (
        selectedCategories.length &&
        categoryRemainingBudgetMap &&
        categoryRemainingBudgetMap.current[newCategory] != null
      ) {
        const categoryRemainingBudget =
          categoryRemainingBudgetMap.current[newCategory] ?? 0;
        if (categoryRemainingBudget == 0) {
          setRemainingBudget("0");
        } else if (newCategory == transaction.category) {
          setRemainingBudget(
            max(
              calculate(categoryRemainingBudget)
                .minus(newTransactionAmount)
                .plus(transaction.amount)
                .toString(),
              "0"
            )
          );
        } else {
          setRemainingBudget(
            max(subtract(categoryRemainingBudget, newTransactionAmount), "0")
          );
        }
      } else {
        setRemainingBudget(
          max(
            calculate(monthData.budget)
              .minus(monthData.expense)
              .minus(newTransactionAmount)
              .plus(transaction.amount)
              .toString(),
            "0"
          )
        );
      }
    },
    [monthData, selectedCategories, transaction.amount, transaction.category]
  );

  function getRemainingBudgetInfoText() {
    if (
      selectedCategories.length &&
      categoryRemainingBudgetMap.current[selectedCategories[0]] != null
    ) {
      return `Remaining budget under ${selectedCategories[0]}: ${formatToCurrency(
        remainingBudget,
        "en-US",
        context.userPreferredCurrency
      )}`;
    } else {
      return `Remaining total budget: ${formatToCurrency(
        remainingBudget,
        "en-US",
        context.userPreferredCurrency
      )}`;
    }
  }

  useEffect(() => {
    if (actionData?.data?.isTransactionSaved) {
      context.setSnackBarMsg("Transaction saved");
      const successSound = new Audio("/sounds/success.mp3");
      successSound.play();
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
    if (!isPastMonth && selectedCategories.length > 0 && transactionType === "expense") {
      if (
        categoryRemainingBudgetMap == null ||
        categoryRemainingBudgetMap.current[selectedCategories[0]] === undefined
      ) {
        categoryRemainingBudgetFetcher.load(
          `/api/getRemainingBudgetForCategory?category=${encodeURIComponent(
            selectedCategories[0]
          )}`
        );
      }
    } else {
      calculateRemainingBudget(amount);
    }
  }, [selectedCategories]);

  useEffect(() => {
    if (categoryRemainingBudgetFetcher.data) {
      categoryRemainingBudgetMap.current = {
        ...categoryRemainingBudgetMap.current,
        ...(categoryRemainingBudgetFetcher.data as {
          [key: string]: number | null;
        }),
      };
      calculateRemainingBudget(amount);
    }
  }, [amount, calculateRemainingBudget, categoryRemainingBudgetFetcher.data]);

  useEffect(() => {
    calculateRemainingBudget(amount);
  }, [amount, calculateRemainingBudget]);

  useEffect(() => {
    if (isSubmittingData) {
      context.setSnackBarMsg("Saving transaction...");
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
      {transaction != null ? (
        <main className="p-7 pb-28">
          <h1 className="text-3xl text-center pb-7">Edit transaction</h1>
          <Form replace method="POST" onSubmit={(e) => handleFormSubmit(e)}>
            <fieldset disabled={isSubmittingData}>
              <p className="text-center">Amount:</p>
              <p className="text-center">
                <NumberInputLarge
                  name="amount"
                  autoFocus
                  defaultValue={transaction.amount}
                  required
                  min={0}
                  prefix={getCurrencySymbol("en-US", context.userPreferredCurrency)}
                  disabled={isSubmittingData}
                  onChangeHandler={(e) => {
                    setAmount(e.target.value);
                  }}
                />
              </p>
              <div className="flex flex-col items-center">
                <ErrorValidation error={actionData?.errors?.amount} />
              </div>

              <Spacer size={3} />
              <div className="flex justify-center">
                <div className="flex flex-col w-full max-w-sm">
                  {showRemainingBudget ? (
                    <>
                      <Spacer />
                      <InfoText text={`${getRemainingBudgetInfoText()}`} />
                    </>
                  ) : null}
                  <Spacer size={3} />

                  <label className="text-primary">
                    <p>Type</p>
                    <select
                      name="type"
                      className="form-select select w-full"
                      defaultValue={
                        transactionTypes.find((t) => t.value === transaction.type)?.value
                      }
                      onChange={(e) => {
                        if (isNullOrEmpty(e.target.value)) return;
                        setShowRemainingBudget(e.target.value === "expense");
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
                    defaultInputValue={transaction.category}
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
                    defaultInputValue={paymentMode}
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
                        label: transaction.paymentMode,
                        value: transaction.paymentMode,
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
                    defaultValue={transaction.description ?? undefined}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="fixed bottom-16 right-8 shadow-xl rounded-md focus-ring"
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
