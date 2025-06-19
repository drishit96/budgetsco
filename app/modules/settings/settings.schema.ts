import { z } from "zod";
import { CURRENCY_CODES } from "~/utils/category.utils";
import { formatErrors } from "../../utils/error.utils";
import { decimal } from "../transaction/transaction.schema";
import Decimal from "decimal.js";
import { safeParseObjectToSchema } from "~/utils/schema.utils";

const currencyInput = {
  currency: z
    .enum(CURRENCY_CODES, {
      errorMap: (val, ctx) => {
        return { message: `'${ctx.data}' currency is not supported yet` };
      },
    })
    .nullish(),
};

const preferencesInput = {
  timezone: z.string(),
  locale: z.string(),
  paymentGateway: z.enum(["GPB", "STR"]).nullable(),
  isActiveSubscription: z.boolean().default(false),
  isMFAOn: z.boolean().default(false),
  isPasskeyPresent: z.boolean().default(false),
  collectAnalytics: z.boolean().nullable(),
};

export const CurrencyPreferenceInputSchema = z.object({
  ...currencyInput,
});
export const UserPreferenceInputSchema = z.object({
  ...preferencesInput,
  ...currencyInput,
});
export const UserPreferenceResponseSchema = z.object({
  ...preferencesInput,
  ...currencyInput,
  lastModified: z.number(),
  userId: z.string(),
});

export const TargetFilterSchema = z.object({
  startMonth: z.string().regex(/^\d{4}-\d{2}$/, {
    message: "Start month must be in YYYY-MM format",
  }),
  endMonth: z
    .string()
    .regex(/^\d{4}-\d{2}$/, {
      message: "End month must be in YYYY-MM format",
    })
    .nullish(),
  breakDownByCategory: z.boolean().default(false),
});

export const BudgetInputSchema = z
  .object({
    breakdown: z.record(
      z.string().min(1),
      decimal({
        errorMsg: "Budget has to be more than zero",
        allowZero: true,
      })
    ),
  })
  .transform((data) => {
    const breakdownTotal = Decimal.sum(...Object.values(data.breakdown));
    return {
      ...data,
      total: breakdownTotal,
      breakdown: data.breakdown,
    };
  });

export const CustomCategoryActionSchema = z.object({
  category: z.string().min(1, "Category name is required"),
  type: z.enum(["expense", "income", "investment"]),
});

export type CurrencyPreferenceInput = z.infer<typeof CurrencyPreferenceInputSchema>;
export type UserPreferenceInput = z.infer<typeof UserPreferenceInputSchema>;
export type UserPreferenceResponse = z.infer<typeof UserPreferenceResponseSchema>;
export type TargetFilter = z.infer<typeof TargetFilterSchema>;
export type BudgetInput = z.infer<typeof BudgetInputSchema>;
export type CustomCategoryActionInput = z.infer<typeof CustomCategoryActionSchema>;

export function parseCurrencyPreferenceInput(currencyInput: unknown) {
  const output = CurrencyPreferenceInputSchema.safeParse(currencyInput);
  if (output.success) {
    return {
      errors: null,
      userPreferences: output.data,
    };
  } else {
    const errors = formatErrors(output.error.issues);
    return { errors, userPreferences: null };
  }
}

export function parseUserPreferenceInput(userPreferences: unknown) {
  const output = UserPreferenceInputSchema.safeParse(userPreferences);
  if (output.success) {
    return {
      errors: null,
      userPreferences: output.data,
    };
  } else {
    const errors = formatErrors(output.error.issues);
    return { errors, userPreferences: null };
  }
}

export function parseBudgetFilterInput(budgetFilter: unknown) {
  return safeParseObjectToSchema(budgetFilter, TargetFilterSchema);
}

export function parseBudgetInput(budget: unknown) {
  return safeParseObjectToSchema(budget, BudgetInputSchema);
}

export function parseCustomCategoryActionInput(category: unknown) {
  return safeParseObjectToSchema(category, CustomCategoryActionSchema);
}

export function parseUserPreferenceResponse(
  userPreferences: unknown
): UserPreferenceResponse {
  return UserPreferenceResponseSchema.parse(userPreferences);
}
