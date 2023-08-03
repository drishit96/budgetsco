import { Ripple } from "@rmwc/ripple";
import { useEffect, useState } from "react";
import type { AppContext } from "~/root";
import {
  getAllPaymentModes,
  getAllTransactionTypes,
  getCombinedCategoriesForAllTransactionTypes,
} from "~/utils/category.utils";
import { InlineSpacer } from "./InlineSpacer";
import { Input } from "./Input";
import { Spacer } from "./Spacer";

const types = getAllTransactionTypes();

export type NewFilter = {
  selectedCategories: string[];
  month: string;
  selectedTypes: string[];
  selectedPaymentModes: string[];
};

function FilterTab({
  name,
  count,
  isCurrentTab,
  onClick,
}: {
  name: string;
  count: number;
  isCurrentTab: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`flex p-1 border-primary border-b w-full ${
        isCurrentTab ? "bg-focus" : "bg-base"
      }`}
      onClick={onClick}
    >
      <span>{name}</span>
      <span className="grow"></span>
      {count > 0 && (
        <span className="w-min pl-1 pr-1 rounded-full bg-emerald-700 text-white">
          {count}
        </span>
      )}
    </button>
  );
}

export default function FilterBottomSheet({
  context,
  defaultSelectedCategories,
  defaultMonth,
  defaultTypes,
  defaultPaymentModes,
  onFilterSet,
}: {
  context: AppContext;
  defaultSelectedCategories?: string[];
  defaultMonth: string;
  defaultTypes?: string[];
  defaultPaymentModes?: string[];
  onFilterSet: (filter: NewFilter) => void;
}) {
  const [categories, setCategories] = useState<{ label: string; value: string }[]>([]);
  const [paymentModes, setPaymentModes] = useState<{ label: string; value: string }[]>(
    []
  );
  const [currentTab, setCurrentTab] = useState("category");
  const [categorySearchValue, setCategorySearchValue] = useState("");
  const [paymentModeSearchValue, setPaymentModeSearchValue] = useState("");
  const [selectedTypes, setSelectedTypes] = useState(new Set(defaultTypes));
  const [selectedCategories, setSelectedCategories] = useState(
    new Set(defaultSelectedCategories)
  );
  const [selectedPaymentModes, setSelectedPaymentModes] = useState(
    new Set(defaultPaymentModes)
  );
  useEffect(() => {
    setCategories(getCombinedCategoriesForAllTransactionTypes());
    setPaymentModes(getAllPaymentModes());
    setSelectedTypes(new Set(defaultTypes));
    setSelectedCategories(new Set(defaultSelectedCategories));
    setSelectedPaymentModes(new Set(defaultPaymentModes));
  }, [defaultTypes, defaultSelectedCategories, defaultPaymentModes]);
  return (
    <div className="flex flex-col text-primary">
      <p className="text-2xl font-semibold">Filter</p>
      <Spacer size={1} />

      <div className="flex divide-x">
        <div className="flex flex-col items-start grow">
          <FilterTab
            key="category"
            name="Category"
            count={selectedCategories.size}
            isCurrentTab={currentTab === "category"}
            onClick={() => setCurrentTab("category")}
          />
          <FilterTab
            key="type"
            name="Type"
            count={selectedTypes.size}
            isCurrentTab={currentTab === "type"}
            onClick={() => setCurrentTab("type")}
          />
          <FilterTab
            key="paymentMode"
            name="Payment mode"
            count={selectedPaymentModes.size}
            isCurrentTab={currentTab === "paymentMode"}
            onClick={() => setCurrentTab("paymentMode")}
          />
        </div>
        {currentTab === "category" && (
          <div className="flex flex-col grow pl-2 pr-1 h-96 overflow-y-scroll bg-base">
            <div className="sticky top-0 bg-base">
              <Input
                type="search"
                name="categorySearch"
                label="Search a category"
                value={categorySearchValue}
                onChangeHandler={(e) => setCategorySearchValue(e.target.value)}
              />
            </div>
            <Spacer size={1} />
            {categories
              .filter(
                (c) =>
                  categorySearchValue == "" ||
                  c.label
                    .toLocaleLowerCase()
                    .includes(categorySearchValue.toLocaleLowerCase())
              )
              .map((category) => (
                <label key={category.value}>
                  <input
                    className="form-checkbox checkbox"
                    type="checkbox"
                    name="category"
                    value={category.value}
                    checked={selectedCategories.has(category.value)}
                    onChange={(e) => {
                      const newSet = new Set(selectedCategories);
                      if (newSet.has(e.target.value)) {
                        newSet.delete(e.target.value);
                      } else {
                        newSet.add(e.target.value);
                      }
                      setSelectedCategories(newSet);
                    }}
                  />
                  <InlineSpacer />
                  <span className="text-primary text-lg lg:text-base">
                    {category.label}
                  </span>
                </label>
              ))}
          </div>
        )}
        {currentTab === "type" && (
          <div className="flex flex-col grow pl-2">
            {types.map((type) => (
              <label key={type.value}>
                <input
                  className="form-checkbox checkbox"
                  type="checkbox"
                  name="type"
                  value={type.value}
                  checked={selectedTypes.has(type.value)}
                  onChange={(e) => {
                    let newSet = new Set(selectedTypes);
                    if (newSet.has(e.target.value)) {
                      newSet.delete(e.target.value);
                    } else {
                      newSet.add(e.target.value);
                    }
                    setSelectedTypes(newSet);
                  }}
                />
                <InlineSpacer />
                <span className="text-lg lg:text-base">{type.label}</span>
              </label>
            ))}
          </div>
        )}
        {currentTab === "paymentMode" && (
          <div className="flex flex-col grow pl-2 pr-1 h-96 overflow-y-scroll bg-base">
            <div className="sticky top-0 bg-base">
              <Input
                type="search"
                name="paymentModeSearch"
                label="Search a payment mode"
                value={paymentModeSearchValue}
                onChangeHandler={(e) => setPaymentModeSearchValue(e.target.value)}
              />
            </div>
            <Spacer size={1} />
            {paymentModes
              .filter(
                (c) =>
                  paymentModeSearchValue == "" ||
                  c.label
                    .toLocaleLowerCase()
                    .includes(paymentModeSearchValue.toLocaleLowerCase())
              )
              .map((paymentMode) => (
                <label key={paymentMode.value}>
                  <input
                    className="form-checkbox checkbox"
                    type="checkbox"
                    name="category"
                    value={paymentMode.value}
                    checked={selectedPaymentModes.has(paymentMode.value)}
                    onChange={(e) => {
                      const newSet = new Set(selectedPaymentModes);
                      if (newSet.has(e.target.value)) {
                        newSet.delete(e.target.value);
                      } else {
                        newSet.add(e.target.value);
                      }
                      setSelectedPaymentModes(newSet);
                    }}
                  />
                  <InlineSpacer />
                  <span className="text-primary text-lg lg:text-base">
                    {paymentMode.label}
                  </span>
                </label>
              ))}
          </div>
        )}
      </div>
      <Spacer />
      <div className="flex space-x-1">
        <Ripple>
          <button
            className="btn-secondary-sm grow"
            onClick={() => {
              selectedCategories.clear();
              selectedTypes.clear();
              onFilterSet({
                selectedCategories: [],
                month: defaultMonth,
                selectedTypes: [],
                selectedPaymentModes: [],
              });
              history.back();
            }}
          >
            Clear All
          </button>
        </Ripple>
        <Ripple>
          <button
            className="btn-primary-sm text-center grow"
            onClick={() => {
              onFilterSet({
                selectedCategories: Array.from(selectedCategories),
                month: defaultMonth,
                selectedTypes: Array.from(selectedTypes),
                selectedPaymentModes: Array.from(selectedPaymentModes),
              });
              history.back();
            }}
          >
            Apply
          </button>
        </Ripple>
      </div>
    </div>
  );
}
