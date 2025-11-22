import { useAutoAnimate } from "@formkit/auto-animate/react";
import { Ripple } from "@rmwc/ripple";
import React, { useEffect, useRef, useState } from "react";
import { Form, useFetcher, useNavigation, useSubmit } from "@remix-run/react";
import type { AppContext } from "~/root";
import {
  getAllExpenseCategoriesForSelection,
  getCombinedTransactionTypeCategoriesForSelection,
  syncNewCustomCategoriesToLocalStorage,
} from "~/utils/category.utils";
import { isNullOrEmpty } from "~/utils/text.utils";
import CheckIcon from "./icons/CheckIcon";
import DeleteIcon from "./icons/DeleteIcon";
import EditIcon from "./icons/EditIcon";
import { InlineSpacer } from "./InlineSpacer";
import { Input } from "./Input";
import { Spacer } from "./Spacer";
import { ComboBox } from "./ComboBox";
import { calculate, sum } from "~/utils/number.utils";
import { ErrorText } from "./ErrorText";
import AiIcon from "./icons/AiIcon";
import CopyIcon from "./icons/CopyIcon";

export default function TargetSetter({
  errors,
  context,
  mode = "create",
  defaultData = [],
}: {
  errors: { [key: string]: string } | undefined;
  context: AppContext;
  mode?: "create" | "edit";
  defaultData?: {
    category: string;
    budget: string;
  }[];
}) {
  const navigation = useNavigation();
  const [categoryWiseTargetSetterParent] = useAutoAnimate<HTMLFieldSetElement>();
  const previousBudgetFetcher = useFetcher();
  const aiEstimateFetcher = useFetcher();
  const [totalBudget, setTotalBudget] = useState("0");
  const [totalBudgetError, setTotalBudgetError] = useState("");
  const [categoryBudgets, setCategoryBudgets] = useState<
    {
      index: number;
      category: string;
      budget: string;
    }[]
  >([]);
  const isSubmittingData = navigation.state === "submitting";
  const [maxKey, setMaxKey] = useState(1);
  const [existingCategoryBudgetMap, setExistingCategoryBudgetMap] = useState(
    new Map<string, string>()
  );
  const [startFromScratchSelected, setStartFromScratchSelected] = useState(false);
  const submit = useSubmit();
  const categories = useRef(getAllExpenseCategoriesForSelection());

  function addNewCategoryBudget(e: React.MouseEvent) {
    e.preventDefault();
    setCategoryBudgets([
      ...categoryBudgets,
      { index: maxKey, category: "", budget: "0" },
    ]);
    setMaxKey((prevKey) => prevKey + 1);
  }

  function deleteCategoryBudget(e: React.MouseEvent, index: number) {
    e.preventDefault();
    setCategoryBudgets(categoryBudgets.filter((c) => c.index != index));
  }

  function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (mode === "create") {
      const customCategories = syncNewCustomCategoriesToLocalStorage(
        "expense",
        categoryBudgets.map((c) => c.category)
      );
      const form = new FormData(event.currentTarget);
      form.set("customCategories", JSON.stringify(customCategories));
      submit(event.currentTarget, { method: "POST", replace: true });
      return;
    }
    const form = new FormData();

    let totalBudgetOfAllCategories = sum(categoryBudgets.map((c) => c.budget));
    const newCategoryBudgetMap = new Map<string, string>();
    for (let item of categoryBudgets) {
      newCategoryBudgetMap.set(item.category, item.budget);
    }

    if (calculate(totalBudget).lessThan(totalBudgetOfAllCategories)) {
      setTotalBudgetError(
        "Total budget must be greater than or equal to the sum of all category budgets"
      );
      return;
    }

    for (let item of existingCategoryBudgetMap) {
      const existingCategory = item[0];
      const existingBudget = item[1];

      if (!newCategoryBudgetMap.has(existingCategory)) {
        newCategoryBudgetMap.set(existingCategory, "0");
      } else if (newCategoryBudgetMap.get(existingCategory) === existingBudget) {
        newCategoryBudgetMap.delete(existingCategory);
      }
    }

    form.set("totalBudget", totalBudget.toString());
    form.set(
      "categoryBudgetMap",
      JSON.stringify(Array.from(newCategoryBudgetMap.entries()))
    );
    const customCategories = syncNewCustomCategoriesToLocalStorage(
      "expense",
      Array.from(newCategoryBudgetMap.keys())
    );
    form.set("customCategories", JSON.stringify(customCategories));
    submit(form, { method: "POST", replace: true });
  }

  useEffect(() => {
    if (mode === "edit" && defaultData.length) {
      let index = 0;
      const data = defaultData.map((item) => {
        return {
          index: ++index,
          category: item.category,
          budget: item.budget,
        };
      });
      const map = new Map<string, string>();
      defaultData.forEach((item) => {
        map.set(item.category, item.budget);
      });
      setMaxKey(++index);
      setCategoryBudgets(data);
      setExistingCategoryBudgetMap(map);
    }
  }, []);

  useEffect(() => {
    categories.current = getCombinedTransactionTypeCategoriesForSelection("expense");
  }, []);

  useEffect(() => {
    setTotalBudget(sum(categoryBudgets.map((c) => c.budget || "0")));
  }, [categoryBudgets]);

  useEffect(() => {
    if (previousBudgetFetcher.data != null) {
      const budgetData = previousBudgetFetcher.data as {
        index: number;
        category: string;
        budget: string;
      }[];
      if (budgetData.length > 0) {
        setCategoryBudgets([...categoryBudgets, ...budgetData]);
        setMaxKey(budgetData.length);
      } else {
        context.setSnackBarMsg("No budget found for previous month");
      }
    }
  }, [previousBudgetFetcher.data]);

  useEffect(() => {
    if (aiEstimateFetcher.data != null) {
      if ((aiEstimateFetcher.data as any).error) {
        context.setSnackBarMsg((aiEstimateFetcher.data as any).error);
        return;
      }
      const budgetData = aiEstimateFetcher.data as {
        index: number;
        category: string;
        budget: string;
      }[];
      if (budgetData.length > 0) {
        setCategoryBudgets([...categoryBudgets, ...budgetData]);
        setMaxKey(budgetData.length);
        context.setSnackBarMsg("AI estimate generated successfully");
      }
    }
  }, [aiEstimateFetcher.data]);

  return (
    <>
      <main className="p-3">
        <p className="text-3xl text-center pb-7">
          {mode === "create" || defaultData.length == 0 ? "Set budget" : "Edit budget"}
        </p>
        <div className="flex flex-col justify-center items-center w-full">
          {defaultData?.length == 0 &&
            previousBudgetFetcher.data == null &&
            aiEstimateFetcher.data == null &&
            !startFromScratchSelected ? (
            <>
              <div className="flex flex-col items-center gap-4 w-full">
                <div className="flex gap-4 w-full justify-center">
                  <div className="w-1/2 lg:w-1/5">
                    <Ripple accent>
                      <button
                        disabled={
                          previousBudgetFetcher.data ||
                          previousBudgetFetcher.state === "loading" ||
                          aiEstimateFetcher.state === "loading"
                        }
                        className="btn-secondary-sm h-32 w-full flex flex-col items-center justify-center gap-2"
                        onClick={() =>
                          previousBudgetFetcher.load("/api/getPreviousBudgetPerCategory")
                        }
                      >
                        <CopyIcon size={36} color="var(--text-color-accent)" />
                        <span>Copy previous budget</span>
                      </button>
                    </Ripple>
                  </div>
                  <div className="w-1/2 lg:w-1/5">
                    <Ripple accent>
                      <button
                        disabled={
                          aiEstimateFetcher.data ||
                          aiEstimateFetcher.state === "loading" ||
                          previousBudgetFetcher.state === "loading"
                        }
                        onClick={() =>
                          aiEstimateFetcher.submit(
                            {},
                            { method: "POST", action: "/api/estimateBudgetWithAI" }
                          )
                        }
                        className={`btn-secondary-sm h-32 w-full flex flex-col items-center justify-center gap-2`}
                      >
                        <div
                          className={
                            aiEstimateFetcher.state === "loading" ||
                              aiEstimateFetcher.state === "submitting"
                              ? "animate-icon-glow"
                              : ""
                          }
                        >
                          <AiIcon color="var(--text-color-accent)" size={36} />
                        </div>
                        <span>
                        {aiEstimateFetcher.state === "loading" ||
                          aiEstimateFetcher.state === "submitting"
                          ? "Generating..."
                          : "AI Estimate"}
                      </span>
                    </button>
                  </Ripple>
                </div>
              </div>

              <div className="w-full lg:w-1/5">
                <Ripple accent>
                  <button
                    disabled={
                      aiEstimateFetcher.state === "loading" ||
                      previousBudgetFetcher.state === "loading"
                    }
                    className="btn-secondary-sm h-32 w-full flex flex-col items-center justify-center gap-2"
                    onClick={(e) => {
                      e.preventDefault();
                      setStartFromScratchSelected(true);
                      setCategoryBudgets([
                        { index: maxKey, category: "", budget: "0" },
                      ]);
                      setMaxKey((prevKey) => prevKey + 1);
                    }}
                  >
                    <EditIcon size={36} color="var(--text-color-accent)" />
                    <span>Start from scratch</span>
                  </button>
                </Ripple>
              </div>
            </div>
          <Spacer />
        </>
          ) : null}

        {(mode === "edit" ||
          (defaultData && defaultData.length > 0) ||
          previousBudgetFetcher.data != null ||
          aiEstimateFetcher.data != null ||
          startFromScratchSelected) && (
            <>
              <Spacer />

              <Form
                replace
                method="POST"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleFormSubmit(e);
                }}
              >
                <fieldset name="Total Budget" disabled={isSubmittingData}>
                  <Input
                    name="totalBudget"
                    type="number"
                    value={totalBudget}
                    min={0.01}
                    label="Total Budget"
                    autoFocus={true}
                    required={true}
                    error={errors?.totalBudget ?? totalBudgetError}
                    onChangeHandler={(e) => setTotalBudget(e.target.value)}
                  />
                </fieldset>

                <Spacer size={4} />
                <fieldset
                  ref={categoryWiseTargetSetterParent}
                  name="Category-wise budget"
                  className="pb-10"
                  disabled={isSubmittingData}
                >
                  {errors && errors.totalBudget == null && (
                    <>
                      <ErrorText
                        error={
                          (errors &&
                            errors.totalBudget == null &&
                            "Invalid input in category-wise budget") ||
                          undefined
                        }
                        showIcon={false}
                      />
                      <Spacer />
                    </>
                  )}

                  <div className="flex items-center gap-3 flex-wrap pb-4">
                    <span className="font-semibold">Budget per category</span>
                    <span className="grow"></span>
                    <Ripple accent>
                      <button
                        className="btn-secondary-sm"
                        onClick={(e) => addNewCategoryBudget(e)}
                      >
                        Add new
                      </button>
                    </Ripple>
                  </div>

                  <Spacer />

                  {categoryBudgets.map((categoryBudget) => {
                    return (
                      <div key={categoryBudget.index}>
                        <div className="flex">
                          <div className="basis-9/12">
                            <ComboBox
                              name={`category${categoryBudget.index}`}
                              labelId="Category"
                              defaultInputValue={categoryBudget.category}
                              autoFocus={isNullOrEmpty(categoryBudget.category)}
                              placeholder="Category"
                              onCreateItem={(newItem) => {
                                if (isNullOrEmpty(newItem)) return;
                                setCategoryBudgets((prev) =>
                                  prev.map((item) => {
                                    if (item.index == categoryBudget.index) {
                                      return {
                                        ...item,
                                        category: newItem.value,
                                      };
                                    } else {
                                      return item;
                                    }
                                  })
                                );
                              }}
                              onSelectedItemChange={(changes) => {
                                if (isNullOrEmpty(changes.selectedItem)) return;
                                setCategoryBudgets((prev) =>
                                  prev.map((item) => {
                                    if (item.index == categoryBudget.index) {
                                      return {
                                        ...item,
                                        category: changes.selectedItem!.value,
                                      };
                                    } else {
                                      return item;
                                    }
                                  })
                                );
                              }}
                              selectedItem={{
                                label: categoryBudget.category,
                                value: categoryBudget.category,
                              }}
                              items={categories.current}
                              itemToString={(item) => (item ? item.label : "")}
                            />
                          </div>

                          <Spacer size={0.5} />
                          <div className="basis-2/12">
                            <Input
                              name={`budget${categoryBudget.index}`}
                              defaultValue={categoryBudget.budget}
                              type="number"
                              min={0}
                              label="Budget"
                              required={true}
                              onChangeHandler={(e) => {
                                setCategoryBudgets((prev) =>
                                  prev.map((item) => {
                                    if (item.index == categoryBudget.index) {
                                      return {
                                        ...item,
                                        budget: e.target.value,
                                      };
                                    } else {
                                      return item;
                                    }
                                  })
                                );
                              }}
                            />
                          </div>

                          <Spacer size={1} />
                          <Ripple unbounded disabled={isSubmittingData}>
                            <button
                              id={`btn-deleteCategoryBudget${categoryBudget.index}`}
                              className="align-bottom"
                              onClick={(e) => deleteCategoryBudget(e, categoryBudget.index)}
                              disabled={isSubmittingData}
                            >
                              <DeleteIcon size={24} color={"red"} />
                            </button>
                          </Ripple>
                        </div>
                        <Spacer />
                      </div>
                    );
                  })}
                </fieldset>

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
            </>
          )}
      </div>
    </main >
    </>
  );
}
