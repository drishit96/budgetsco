import type { LoaderFunction } from "@remix-run/server-runtime";
import { Ripple } from "@rmwc/ripple";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ActionFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";

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
  addNewTransaction,
  getCurrentMonthTarget,
} from "~/modules/transaction/transaction.service";
import type { AppContext } from "~/root";
import { getSessionData } from "~/utils/auth.utils.server";
import {
  addNewCustomCategoryToLocalStorage,
  isNewCustomCategory,
  getAllPaymentModes,
  getAllTransactionTypes,
  getCombinedTransactionTypeCategoriesForSelection,
  getTransactionTypeCategoriesForSelection,
  getLastUsedType,
  getLastUsedCategory,
  saveLastUsedType,
  saveLastUsedCategory,
  getLastUsedPaymentMode,
  saveLastUsedPaymentMode,
} from "~/utils/category.utils";
import { formatToCurrency, getCurrencySymbol, max, subtract } from "~/utils/number.utils";
import { isNullOrEmpty } from "~/utils/text.utils";
import RecurringSetup from "~/components/RecurringSetup";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { parseRecurringTransactionInput } from "~/modules/recurring/recurring.schema";
import { createNewRecurringTransaction } from "~/modules/recurring/recurring.service";
import type { MetaFunction } from "@remix-run/react/dist/routeModules";
import { ComboBox } from "~/components/ComboBox";
import { trackEvent } from "~/utils/analytics.utils.server";
import { EventNames } from "~/lib/anaytics.contants";

export const meta: MetaFunction = ({ matches }) => {
  let rootModule = matches.find((match) => match.id === "root");
  return [...(rootModule?.meta ?? []), { title: "Create transaction - Budgetsco" }];
};

export const action: ActionFunction = async ({ request }) => {
  const sessionData = await getSessionData(request);
  if (sessionData == null || sessionData.userId == null) {
    return redirect("/auth/login");
  }

  const { userId, timezone } = sessionData;

  const form = await request.formData();
  const isRecurringTransaction = form.get("isRecurring") === "on";
  const categoriesString = form.get("categories")?.toString();
  const [category, category2, category3] =
    categoriesString == null ? [] : categoriesString.split(",");

  const transactionInput = {
    description: form.get("description")?.toString(),
    amount: form.get("amount")?.toString(),
    type: form.get("type")?.toString(),
    category: category?.trim(),
    category2: category2?.trim(),
    category3: category3?.trim(),
    paymentMode: form.get("paymentMode")?.toString(),
  };

  let recurringTransactionInput = {
    ...transactionInput,
    occurrence: form.get("occurrence")?.toString(),
    interval: Number(form.get("interval")),
  };

  const { errors, transaction } = parseTransactionInput(transactionInput);
  const { errors: recurringTransactionErrors, transaction: recurringTransaction } =
    isRecurringTransaction
      ? parseRecurringTransactionInput(recurringTransactionInput)
      : { errors: null, transaction: null };

  if (errors == null && (!isRecurringTransaction || recurringTransactionErrors == null)) {
    try {
      const addTransactionTask = addNewTransaction(transaction, userId, timezone);
      const tasks = [addTransactionTask];
      const newCategory = form.get("customCategory")?.toString();
      if (newCategory) {
        tasks.push(addNewCustomCategory(userId, transaction.type, newCategory));
      }

      await Promise.allSettled(tasks);
      const isTransactionSaved = await addTransactionTask;

      if (isRecurringTransaction && recurringTransaction != null) {
        createNewRecurringTransaction(userId, timezone, recurringTransaction).then(
          (isDataSaved) => {
            isDataSaved &&
              trackEvent(request, EventNames.RECURRING_TRANSACTION_CREATED, {
                type: recurringTransaction.type,
                occurrence: recurringTransaction.occurrence,
                interval: recurringTransaction.interval.toString(),
              });
          }
        );
      }

      if (isTransactionSaved) {
        trackEvent(request, EventNames.TRANSACTION_CREATED, {
          type: transaction.type,
          isRecurring: isRecurringTransaction ? "yes" : "no",
        });
      }
      return isTransactionSaved ? { data: { isTransactionSaved: true } } : null;
    } catch (err) {
      console.error(err);
      return null;
    }
  } else {
    if (isRecurringTransaction) {
      return { errors: { ...errors, ...recurringTransactionErrors } };
    }
    return { errors };
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

  const currentMonthTarget = await getCurrentMonthTarget(userId, timezone);
  return currentMonthTarget == null
    ? { budget: 0, expense: 0 }
    : Response.json(currentMonthTarget);
};

const transactionTypes = getAllTransactionTypes();
const paymentModes = getAllPaymentModes();

export default function Create() {
  const submit = useSubmit();
  const navigation = useNavigation();
  const { budget, expense } = useLoaderData<{
    budget: string;
    expense: string;
  }>();
  const context = useOutletContext<AppContext>();
  const categoryRemainingBudgetFetcher = useFetcher();
  const categoryRemainingBudgetMap = useRef<{
    [key: string]: number | null | undefined;
  }>({});
  const [amount, setAmount] = useState("0");
  const [showRemainingBudget, setShowRemainingBudget] = useState(true);
  const [remainingBudget, setRemainingBudget] = useState(subtract(budget, expense));
  const [transactionType, setTransactionType] = useState<TransactionType>("expense");
  const [paymentMode, setPaymentMode] = useState(paymentModes[0].value);
  const [categories, setCategories] = useState(
    getTransactionTypeCategoriesForSelection("expense")
  );
  const [lastUsedCategory, setLastUsedCategory] = useState<{ [key: string]: string }>();
  const actionData = useActionData<{
    errors?: { [key: string]: string };
    data?: { isTransactionSaved: boolean };
  }>();
  const isSubmittingData = navigation.state === "submitting";
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showRecurringSetup, setShowRecurringSetup] = useState(false);
  const [recurringSetupContainer] = useAutoAnimate<HTMLDivElement>();

  const calculateRemainingBudget = useCallback(
    (transactionAmount: string) => {
      if (isNullOrEmpty(transactionAmount)) {
        transactionAmount = "0";
      }
      if (
        selectedCategories.length &&
        categoryRemainingBudgetMap &&
        categoryRemainingBudgetMap.current[selectedCategories[0]] != null
      ) {
        const categoryRemainingBudget =
          categoryRemainingBudgetMap.current[selectedCategories[0]] ?? 0;
        if (categoryRemainingBudget == 0) {
          setRemainingBudget("0");
        } else {
          setRemainingBudget(
            max(subtract(categoryRemainingBudget, transactionAmount), "0")
          );
        }
      } else {
        setRemainingBudget(
          max(subtract(subtract(budget, expense), transactionAmount), "0")
        );
      }
    },
    [budget, expense, selectedCategories]
  );

  function getRemainingBudgetInfoText() {
    if (
      selectedCategories.length &&
      categoryRemainingBudgetMap.current[selectedCategories[0]] != null
    ) {
      return `Remaining budget under '${selectedCategories[0]}': ${formatToCurrency(
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
    const lastUsedType = getLastUsedType();
    const lastUsedCategory = getLastUsedCategory();
    const lastUsedPaymentMode = getLastUsedPaymentMode();
    setTransactionType(lastUsedType);
    setLastUsedCategory(lastUsedCategory);
    if (lastUsedCategory && lastUsedCategory[lastUsedType]) {
      setSelectedCategories([lastUsedCategory[lastUsedType]]);
    }
    setPaymentMode(lastUsedPaymentMode);
    setCategories(getCombinedTransactionTypeCategoriesForSelection(lastUsedType));
  }, []);

  useEffect(() => {
    if (selectedCategories.length > 0 && transactionType === "expense") {
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

      saveLastUsedCategory({ ...lastUsedCategory, [transactionType]: categories[0] });
    }

    saveLastUsedType(transactionType);
    saveLastUsedPaymentMode(paymentMode);
    submit(formData, { method: "POST", replace: true });
  }

  return (
    <>
      <main className="p-5 pb-28">
        <h1 className="text-3xl text-center pb-7">New transaction</h1>
        <Form replace method="POST" onSubmit={(e) => handleFormSubmit(e)}>
          <fieldset disabled={isSubmittingData}>
            <p className="text-center">Amount</p>
            <p className="text-center">
              <NumberInputLarge
                name="amount"
                autoFocus
                selectOnAutoFocus
                defaultValue={0}
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
                    value={transactionType}
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
                </label>
                <ErrorValidation error={actionData?.errors?.type} />

                <Spacer size={3} />

                <ComboBox
                  name="category"
                  labelId="Category"
                  placeholder="Type a category here"
                  onCreateItem={(item) => {
                    if (isNullOrEmpty(item)) return;
                    setSelectedCategories([item.value]);
                  }}
                  onSelectedItemChange={(changes) => {
                    if (isNullOrEmpty(changes.selectedItem)) return;
                    setSelectedCategories([changes.selectedItem.value]);
                  }}
                  selectedItem={categories.find((c) => c.value === selectedCategories[0])}
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
                  placeholder="Type a payment mode here"
                  onCreateItem={(item) => {
                    if (isNullOrEmpty(item)) return;
                    setPaymentMode(item.value);
                  }}
                  onSelectedItemChange={(changes) => {
                    if (isNullOrEmpty(changes.selectedItem)) return;
                    setPaymentMode(changes.selectedItem.value);
                  }}
                  selectedItem={paymentModes.find((p) => p.value == paymentMode)}
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
                  dir="auto"
                />

                <Spacer size={3} />
                <div
                  className="border border-primary w-full p-3"
                  ref={recurringSetupContainer}
                >
                  <label className="text-primary">
                    <input
                      className="form-checkbox checkbox"
                      type="checkbox"
                      name="isRecurring"
                      onChange={() => setShowRecurringSetup((prev) => !prev)}
                    />
                    <InlineSpacer size={1} />
                    <span>Make this recurring</span>
                  </label>

                  {showRecurringSetup && (
                    <>
                      <Spacer size={3} />
                      <RecurringSetup
                        disableInput={isSubmittingData}
                        errors={actionData?.errors}
                      />
                    </>
                  )}
                </div>
              </div>
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
          </fieldset>
        </Form>
      </main>
    </>
  );
}
