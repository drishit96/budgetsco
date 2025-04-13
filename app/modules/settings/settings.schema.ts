import { z } from "zod";
import { CURRENCY_CODES } from "~/utils/category.utils";
import { formatErrors } from "../../utils/error.utils";

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

export type CurrencyPreferenceInput = z.infer<typeof CurrencyPreferenceInputSchema>;
export type UserPreferenceInput = z.infer<typeof UserPreferenceInputSchema>;
export type UserPreferenceResponse = z.infer<typeof UserPreferenceResponseSchema>;

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

export function parseUserPreferenceResponse(
  userPreferences: unknown
): UserPreferenceResponse {
  return UserPreferenceResponseSchema.parse(userPreferences);
}
