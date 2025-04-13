import type { TransactionType } from "~/modules/transaction/transaction.schema";
import { getListOfAllMonths, getListOfYearsSince } from "./date.utils";
import {
  getDictionaryFromLocalStorage,
  getStringSettingFromLocalStorage,
  saveDictionaryToLocalStorage,
  saveStringSettingToLocalStorage,
} from "./setting.utils";

function getAllExpenseCategories() {
  return [
    "Bills & Subscriptions",
    "Business",
    "Career",
    "Celebration",
    "Dairy",
    "Donation",
    "Dine out",
    "Education",
    "EMI",
    "Entertainment",
    "Fees",
    "Fish & Meat",
    "Fruits & Veg",
    "Fuel",
    "Grocery",
    "Gym",
    "Health",
    "Insurance",
    "Medical",
    "Movies",
    "Others",
    "Rent",
    "Shopping",
    "Snacks",
    "Sports",
    "Tools",
    "Travel",
    "Vacation",
  ];
}

function getAllInvestmentCategories() {
  return [
    "Art",
    "Bonds",
    "Cryotocurrency",
    "ETF",
    "Fixed Deposit",
    "Hedge Funds",
    "Mutual Funds",
    "Precious Metals",
    "Private Equity",
    "Real Estate",
    "Stocks (Equity)",
    "Others",
  ];
}

function getAllIncomeCategories() {
  return [
    "Commission",
    "Business",
    "Capital Gains",
    "Dividend",
    "Freelancing",
    "Interest",
    "Inheritance",
    "Garage Sale",
    "Lottery",
    "Pension",
    "Rent",
    "Royalty",
    "Salary",
    "Side Project",
    "Others",
  ];
}

export function getCategoriesByTransactionType(transactionType: TransactionType) {
  let categories: string[] = [];
  if (transactionType === "expense") {
    categories = getAllExpenseCategories();
  } else if (transactionType === "income") {
    categories = getAllIncomeCategories();
  } else {
    categories = getAllInvestmentCategories();
  }

  return categories;
}

export function getTransactionTypeCategoriesForSelection(
  transactionType: TransactionType
) {
  let categories = getCategoriesByTransactionType(transactionType);
  return categories.map((category) => {
    return {
      label: category,
      value: category,
    };
  });
}

export function getCombinedTransactionTypeCategoriesForSelection(
  transactionType: TransactionType
) {
  const preSetCategories = getCategoriesByTransactionType(transactionType);
  const customCategories = getCustomCategoriesFromLocalStorage(transactionType);
  return sortCategoriesByValue([
    ...preSetCategories.map((category) => {
      return {
        label: category,
        value: category,
      };
    }),
    ...customCategories.map((category) => {
      return {
        label: category,
        value: category,
      };
    }),
  ]);
}

export function getCombinedCategoriesForAllTransactionTypes() {
  const set = new Set([
    ...getCategoriesByTransactionType("expense"),
    ...getCategoriesByTransactionType("income"),
    ...getCategoriesByTransactionType("investment"),
    ...getCustomCategoriesFromLocalStorage("expense"),
    ...getCustomCategoriesFromLocalStorage("income"),
    ...getCustomCategoriesFromLocalStorage("investment"),
  ]);
  return sortCategoriesByValue([
    ...Array.from(set).map((category) => {
      return {
        label: category,
        value: category,
      };
    }),
  ]);
}

export function getAllExpenseCategoriesForSelection() {
  return getAllExpenseCategories().map((category) => {
    return {
      label: category,
      value: category,
    };
  });
}

export function getAllTransactionTypes() {
  return [
    { label: "Expense", value: "expense" },
    { label: "Income", value: "income" },
    { label: "Investment", value: "investment" },
  ];
}

export function getAllPaymentModes() {
  return [
    { label: "Cash", value: "Cash" },
    { label: "Cheque", value: "Cheque" },
    { label: "Credit Card", value: "Credit Card" },
    { label: "Debit Card", value: "Debit Card" },
    { label: "Mobile Wallet", value: "Mobile Wallet" },
    { label: "Netbanking", value: "Netbanking" },
    { label: "Sodexo", value: "Sodexo" },
    { label: "UPI", value: "UPI" },
  ];
}

export function getAllMonths() {
  return getListOfAllMonths().map((month, index) => {
    return {
      label: month,
      value: index + 1,
    };
  });
}

export function getAllYears() {
  return getListOfYearsSince(2016).map((year) => {
    return {
      label: year.toString(),
      value: year,
    };
  });
}

export function getCurrencyName(currencyCode?: string | null) {
  try {
    const currencyNames = new Intl.DisplayNames(["en"], { type: "currency" });
    if (currencyCode == null) return `${currencyNames.of("INR")} (INR)`;
    return `${currencyNames.of(currencyCode)} (${currencyCode})`;
  } catch (error) {
    console.log(error);
    return "Indian Rupee (INR)";
  }
}

export const CURRENCY_CODES = [
  "AFN",
  "ALL",
  "DZD",
  "AOA",
  "XCD",
  "ARS",
  "AMD",
  "AWG",
  "AUD",
  "EUR",
  "AZN",
  "BHD",
  "BDT",
  "BBD",
  "BYN",
  "BZD",
  "XOF",
  "BTN",
  "BOB",
  "BAM",
  "BWP",
  "BRL",
  "BND",
  "BGN",
  "BIF",
  "KHR",
  "XAF",
  "CAD",
  "CLF",
  "CNY",
  "COU",
  "KMF",
  "CRC",
  "CZK",
  "DKK",
  "DJF",
  "DOP",
  "CDF",
  "USD",
  "EGP",
  "ERN",
  "SZL",
  "ETB",
  "FJD",
  "GMD",
  "GEL",
  "GHS",
  "GTQ",
  "GNF",
  "GYD",
  "HNL",
  "HKD",
  "HUF",
  "ISK",
  "INR",
  "IDR",
  "IQD",
  "ILS",
  "JMD",
  "JPY",
  "JOD",
  "KZT",
  "KES",
  "KWD",
  "KGS",
  "LAK",
  "LBP",
  "ZAR",
  "LRD",
  "LYD",
  "MOP",
  "MGA",
  "MWK",
  "MYR",
  "MVR",
  "MRU",
  "MUR",
  "MXV",
  "MDL",
  "MNT",
  "MAD",
  "MZN",
  "MMK",
  "NPR",
  "ANG",
  "NZD",
  "NIO",
  "NGN",
  "MKD",
  "NOK",
  "OMR",
  "PKR",
  "PGK",
  "PYG",
  "PEN",
  "PHP",
  "PLN",
  "QAR",
  "RON",
  "RUB",
  "RWF",
  "WST",
  "SAR",
  "RSD",
  "SCR",
  "SLE",
  "SGD",
  "SBD",
  "SOS",
  "KRW",
  "SSP",
  "LKR",
  "SRD",
  "SEK",
  "CHW",
  "TWD",
  "TJS",
  "TZS",
  "THB",
  "TOP",
  "TTD",
  "TND",
  "TRY",
  "TMT",
  "UGX",
  "UAH",
  "AED",
  "GBP",
  "UYW",
  "UZS",
  "VUV",
  "VND",
  "YER",
  "ZMW",
  "ZWL",
] as const;

export function getAllCurrencyOptions() {
  return CURRENCY_CODES.map((currencyCode) => ({
    label: getCurrencyName(currencyCode),
    value: currencyCode,
  }));
}

export function convertCategoriesForSelection(categories: string[]) {
  if (categories == null) return [];
  return categories.map((category) => {
    return {
      label: category,
      value: category,
    };
  });
}

export function sortCategoriesByValue(categories: { label: string; value: string }[]) {
  return categories.sort((a, b) => {
    if (a.value < b.value) return -1;
    if (a.value > b.value) return 1;
    return 0;
  });
}

export function isNewCustomCategory(transactionType: TransactionType, category: string) {
  category = category.trim();
  const presetCategories = getCategoriesByTransactionType(transactionType);
  const customCategories = getCustomCategoriesFromLocalStorage(transactionType);
  if (!presetCategories.includes(category) && !customCategories.includes(category)) {
    return true;
  }
  return false;
}

export function getCustomCategoriesFromLocalStorage(
  transactionType: TransactionType
): string[] {
  if (window && window.localStorage) {
    const categories = localStorage.getItem(transactionType + "_categories");
    if (categories == null) return [];
    return JSON.parse(categories);
  }
  return [];
}

export function addNewCustomCategoryToLocalStorage(
  transactionType: TransactionType,
  category: string
) {
  if (window && window.localStorage) {
    const key = transactionType + "_categories";
    const categoriesString = localStorage.getItem(key);
    if (categoriesString == null) {
      localStorage.setItem(key, JSON.stringify([category]));
    } else {
      const categories: string[] = JSON.parse(categoriesString);
      categories.push(category);
      localStorage.setItem(key, JSON.stringify(categories));
    }
  }
}

export function saveCustomCategoriesToLocalStorage(customCategories: {
  [key: string]: string[];
}) {
  if (window && window.localStorage) {
    Object.entries(customCategories).forEach(([type, categories]) => {
      localStorage.setItem(`${type}_categories`, JSON.stringify(categories));
    });
  }
}

export function syncNewCustomCategoriesToLocalStorage(
  transactionType: TransactionType,
  categories: string[]
) {
  try {
    if (!window || !window.localStorage) return [];

    const existingCategoriesString = localStorage.getItem(
      `${transactionType}_categories`
    );

    const presetCategories = getCategoriesByTransactionType(transactionType);
    const existingCategories: string[] = existingCategoriesString
      ? JSON.parse(existingCategoriesString)
      : [];

    const presetCategoriesSet = new Set<string>(presetCategories);
    const existingCategoriesSet = new Set<string>(existingCategories);

    const customCategories: string[] = [];
    for (let category of categories) {
      category = category.trim();
      if (!presetCategoriesSet.has(category) && !existingCategoriesSet.has(category)) {
        customCategories.push(category);
      }
    }

    existingCategories.push(...customCategories);
    localStorage.setItem(
      `${transactionType}_categories`,
      JSON.stringify(existingCategories)
    );

    return customCategories;
  } catch (error) {
    console.log(error);
    return [];
  }
}

export function saveBrowserPreferencesToLocalStorage(currency: string, locale: string) {
  try {
    if (window && window.localStorage) {
      window.localStorage.setItem("currency", currency);
      window.localStorage.setItem("locale", locale);
    }
  } catch (error) {
    console.log(error);
  }
}

export function getLastModifiedFromLocalStorage() {
  try {
    if (window && window.localStorage) {
      const timestamp = window.localStorage.getItem("lastModified");
      if (timestamp == null) return 0;
      return Number(timestamp);
    }
    return 0;
  } catch (error) {
    console.log(error);
    return 0;
  }
}

export function saveLastModifiedToLocalStorage(timestamp: number) {
  try {
    if (window && window.localStorage) {
      window.localStorage.setItem("lastModified", timestamp.toString());
    }
  } catch (error) {
    console.log(error);
  }
}

export function getLastUsedType(): TransactionType {
  return getStringSettingFromLocalStorage("lastUsedType", "expense") as TransactionType;
}

export function saveLastUsedType(type: TransactionType) {
  saveStringSettingToLocalStorage("lastUsedType", type.toString());
}

export function getLastUsedCategory(): { [key: string]: string } {
  return getDictionaryFromLocalStorage("lastUsedCategory", {});
}

export function saveLastUsedCategory(category: { [key: string]: string }) {
  saveDictionaryToLocalStorage("lastUsedCategory", category);
}

export function getLastUsedPaymentMode() {
  return getStringSettingFromLocalStorage("lastUsedPaymentMode", "Cash");
}

export function saveLastUsedPaymentMode(paymentMode: string) {
  saveStringSettingToLocalStorage("lastUsedPaymentMode", paymentMode);
}
