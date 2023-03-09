export const EXPENSE_TYPE_COLOR_MAP = {
  red: "#9F1239",
  blue: "#0369A1",
  green: "#15803D",
} as const;

export const CHART_COLOR_MAP = {
  "CHART-COLOR-1": "#C12552",
  "CHART-COLOR-2": "#FF6600",
  "CHART-COLOR-3": "#F5C700",
  "CHART-COLOR-4": "#6A961F",
  "CHART-COLOR-5": "#008E8E",
  "CHART-COLOR-6": "#CC64DD",
  "CHART-COLOR-7": "#800080",
  "CHART-COLOR-8": "#4B0082",
  "CHART-COLOR-9": "#B36435",
} as const;

export const INVESTMENT_CHART_COLORS_MAP = {
  "INVESTMENT-COLOR-1": "#0C4A6E",
  "INVESTMENT-COLOR-2": "#075985",
  "INVESTMENT-COLOR-3": "#0369A1",
  "INVESTMENT-COLOR-4": "#0891B2",
  "INVESTMENT-COLOR-5": "#06B6D4",
  "INVESTMENT-COLOR-6": "#22D3EE",
  "INVESTMENT-COLOR-7": "#67E8F9",
  "INVESTMENT-COLOR-8": "#A5F3FC",
  "INVESTMENT-COLOR-9": "#CFFAFE",
  "INVESTMENT-COLOR-10": "#F0FDFA",
} as const;

export type Color =
  | keyof typeof CHART_COLOR_MAP
  | keyof typeof EXPENSE_TYPE_COLOR_MAP
  | keyof typeof INVESTMENT_CHART_COLORS_MAP;

export type ColorMap = {
  [key in Color]?: `#${string}`;
};

export const EXPENSE_TYPE_COLORS = ["#B91C1C", "#0369A1", "#15803D"];

export function getBackgroundTintColor(color: Color) {
  switch (color) {
    case "green":
      return "bg-green-50";
    case "red":
      return "bg-red-50";
    case "blue":
      return "bg-sky-50";
  }
}

export function getBackgroundDarkColor(color: Color) {
  switch (color) {
    case "green":
      return "bg-green-700";
    case "red":
      return "bg-red-700";
    case "blue":
      return "bg-sky-700";
    case "CHART-COLOR-1":
      return "bg-CHART-COLOR-1";
    case "CHART-COLOR-2":
      return "bg-CHART-COLOR-2";
    case "CHART-COLOR-3":
      return "bg-CHART-COLOR-3";
    case "CHART-COLOR-4":
      return "bg-CHART-COLOR-4";
    case "CHART-COLOR-5":
      return "bg-CHART-COLOR-5";
    case "CHART-COLOR-6":
      return "bg-CHART-COLOR-6";
    case "CHART-COLOR-7":
      return "bg-CHART-COLOR-7";
    case "CHART-COLOR-8":
      return "bg-CHART-COLOR-8";
    case "CHART-COLOR-9":
      return "bg-CHART-COLOR-9";
    case "INVESTMENT-COLOR-1":
      return "bg-INVESTMENT-COLOR-1";
    case "INVESTMENT-COLOR-2":
      return "bg-INVESTMENT-COLOR-2";
    case "INVESTMENT-COLOR-3":
      return "bg-INVESTMENT-COLOR-3";
    case "INVESTMENT-COLOR-4":
      return "bg-INVESTMENT-COLOR-4";
    case "INVESTMENT-COLOR-5":
      return "bg-INVESTMENT-COLOR-5";
    case "INVESTMENT-COLOR-6":
      return "bg-INVESTMENT-COLOR-6";
    case "INVESTMENT-COLOR-7":
      return "bg-INVESTMENT-COLOR-7";
    case "INVESTMENT-COLOR-8":
      return "bg-INVESTMENT-COLOR-8";
    case "INVESTMENT-COLOR-9":
      return "bg-INVESTMENT-COLOR-9";
    case "INVESTMENT-COLOR-10":
      return "bg-INVESTMENT-COLOR-10";
  }
}

export function getTextColor(color: Color) {
  switch (color) {
    case "green":
      return "text-green-900";
    case "red":
      return "text-red-900";
    case "blue":
      return "text-sky-900";
  }
}

export function getBorderColor(color: Color) {
  switch (color) {
    case "green":
      return "border-green-900";
    case "red":
      return "border-red-900";
    case "blue":
      return "border-sky-900";
  }
}

export function getTransactionColor(
  transactionType: "income" | "expense" | "investment"
) {
  if (transactionType === "income") return "text-green-700";
  if (transactionType === "expense") return "text-red-700";
  if (transactionType === "investment") return "text-sky-700";
}
