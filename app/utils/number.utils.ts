import type { CURRENCY_CODES } from "./category.utils";

export type Currency = typeof CURRENCY_CODES[number] | null;

export function formatNumber(number: number, locale?: string) {
  return new Intl.NumberFormat(locale ?? "en-US", { minimumFractionDigits: 2 }).format(
    number
  );
}

export function formatPercentage(number: number, locale?: string) {
  return new Intl.NumberFormat(locale ?? "en-US", {
    minimumFractionDigits: 1,
    minimumIntegerDigits: 1,
    maximumFractionDigits: 1,
  }).format(number);
}

export function formatToCurrency(number: number, locale?: string, currency?: Currency) {
  return new Intl.NumberFormat(locale ?? "en-US", {
    style: "currency",
    currency: currency ?? "INR",
    maximumFractionDigits: 2,
  }).format(number);
}

export function formatToCurrencyCompact(
  number: number,
  locale?: string,
  currency?: Currency
) {
  return new Intl.NumberFormat(locale ?? "en-US", {
    style: "currency",
    currency: currency ?? "INR",
    notation: "compact",
  }).format(number);
}

export function getCurrencySymbol(locale?: string, currency?: Currency) {
  const formatter = new Intl.NumberFormat(locale ?? "en-US", {
    style: "currency",
    currency: currency ?? "INR",
  });
  return formatter.formatToParts(0).find((f) => f.type === "currency")?.value ?? "$";
}
