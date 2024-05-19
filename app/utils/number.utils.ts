import Decimal from "decimal.js";
import type { CURRENCY_CODES } from "./category.utils";
import { isNullOrEmpty } from "./text.utils";

export type Currency = typeof CURRENCY_CODES[number] | null;

export function formatNumber(number: number | string, locale?: string) {
  return new Intl.NumberFormat(locale ?? "en-US", { minimumFractionDigits: 2 }).format(
    number as number
  );
}

export function formatPercentage(number: number | string, locale?: string) {
  return new Intl.NumberFormat(locale ?? "en-US", {
    minimumFractionDigits: 1,
    minimumIntegerDigits: 1,
    maximumFractionDigits: 1,
  }).format(number as number);
}

export function formatToCurrency(
  number: number | string,
  locale?: string,
  currency?: Currency
) {
  return new Intl.NumberFormat(locale ?? "en-US", {
    style: "currency",
    currency: currency ?? "INR",
    maximumFractionDigits: 2,
  }).format(number as number);
}

export function formatToCurrencyCompact(
  number: number | string,
  locale?: string,
  currency?: Currency
) {
  return new Intl.NumberFormat(locale ?? "en-US", {
    style: "currency",
    currency: currency ?? "INR",
    notation: "compact",
  }).format(number as number);
}

export function getCurrencySymbol(locale?: string, currency?: Currency) {
  const formatter = new Intl.NumberFormat(locale ?? "en-US", {
    style: "currency",
    currency: currency ?? "INR",
  });
  return formatter.formatToParts(0).find((f) => f.type === "currency")?.value ?? "$";
}

export function calculate(startWith: string | number) {
  if (isNullOrEmpty(startWith)) return new Decimal(0);
  return new Decimal(startWith);
}

export function add(num1: string | number, num2: string | number) {
  if (isNullOrEmpty(num1)) {
    if (isNullOrEmpty(num2)) return "0";
    return num2.toString();
  } else if (isNullOrEmpty(num2)) {
    return num1.toString();
  }
  return new Decimal(num1).add(num2).toString();
}

export function subtract(from: string | number, amt: string | number) {
  if (isNullOrEmpty(from)) {
    from = "0";
  }
  if (isNullOrEmpty(amt)) {
    return from.toString();
  }
  return new Decimal(from).minus(amt).toString();
}

export function divide(num1: string | number, num2: string | number) {
  if (isNullOrEmpty(num1)) {
    num1 = "0";
  }
  if (isNullOrEmpty(num2)) {
    return num1;
  }
  return new Decimal(num1).dividedBy(num2).toString();
}

export function abs(num: string | number) {
  return new Decimal(num).abs().toString();
}

export function round(number: string | number) {
  return new Decimal(number).round().toString();
}

export function max(...args: string[]) {
  return Decimal.max(...args).toString();
}

export function sum(args: string[]) {
  if (args == null || args.length == 0) return "0";
  return Decimal.sum(...args).toString();
}

export function avg(args: string[]) {
  if (args == null || args.length == 0) return "0";
  const nums = args.map((a) => new Decimal(a));
  return Decimal.sum(...nums)
    .dividedBy(nums.length)
    .toString();
}

export function median(args: string[]) {
  if (args == null || args.length == 0) return "0";
  const nums = args.map((a) => new Decimal(a));
  nums.sort((a, b) => a.minus(b).toNumber());

  const centerIndex = nums.length / 2;
  if (nums.length % 2 != 0) return nums[Math.floor(centerIndex)].toString();

  return Decimal.sum(nums[centerIndex - 1], nums[centerIndex])
    .dividedBy(2)
    .toString();
}
