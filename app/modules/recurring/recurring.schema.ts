import { z } from "zod";
import { formatErrors } from "../../utils/error.utils";
import { decimal } from "../transaction/transaction.schema";
import { safeParseObjectToSchema } from "~/utils/schema.utils";

const recurringTransactionInput = {
  occurrence: z.enum(["day", "month", "year"]),
  interval: z.number().int().min(1, "Number must be greater than zero").max(500),
  description: z.string().nullish(),
  amount: decimal({ errorMsg: "Amount must be greater than zero", path: ["amount"] }),
  type: z.enum(["income", "expense", "investment"]),
  category: z.string().min(1, "Please select a category"),
  category2: z.string().nullish(),
  category3: z.string().nullish(),
  paymentMode: z.string().min(1, "Please select a payment mode"),
  startDate: z
    .string()
    .datetime({ message: "Please select a valid start date" })
    .optional(),
};

const recurringTransactionGenerated = {
  id: z.string(),
  executionDate: z.date(),
};

export const RecurringTransactionInputSchema = z
  .object(recurringTransactionInput)
  .refine((data) => data.category2 !== data.category, {
    message: "Categories must be unique",
    path: ["category2"],
  })
  .refine(
    (data) =>
      data.category3 !== data.category &&
      (!data.category2 || data.category3 !== data.category2),
    {
      message: "Categories must be unique",
      path: ["category3"],
    }
  );

export const RecurringTransactionFilterSchema = z.object({
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
});

export const RecurringTransactionResponseSchema = z.object({
  ...recurringTransactionInput,
  ...recurringTransactionGenerated,
});

export const RecurringTransactionsResponseSchema = z.array(
  RecurringTransactionResponseSchema
);

export type RecurringTransactionInput = z.infer<typeof RecurringTransactionInputSchema>;
export type RecurringTransactionResponse = z.infer<
  typeof RecurringTransactionResponseSchema
>;
export type RecurringTransactionsResponse = z.infer<
  typeof RecurringTransactionsResponseSchema
>;
export type RecurringTransactionFilter = z.infer<typeof RecurringTransactionFilterSchema>;

export function parseRecurringTransactionInput(transaction: unknown) {
  const output = RecurringTransactionInputSchema.safeParse(transaction);
  if (output.success) {
    return {
      errors: null,
      transaction: output.data,
    };
  } else {
    const errors = formatErrors(output.error.issues);
    return { errors, transaction: null };
  }
}

export function parseRecurringTransactionResponse(transaction: unknown) {
  const output = RecurringTransactionResponseSchema.safeParse(transaction);
  if (output.success) {
    return {
      errors: null,
      transaction: output.data,
    };
  } else {
    const errors = formatErrors(output.error.issues);
    return { errors, transaction: null };
  }
}

export function parseRecurringTransactionsResponse(transactions: unknown) {
  const output = RecurringTransactionsResponseSchema.safeParse(transactions);
  if (output.success) {
    return {
      errors: null,
      transactions: output.data,
    };
  } else {
    const errors = formatErrors(output.error.issues);
    return { errors, transaction: null };
  }
}

export function parseRecurringTransactionFilter(filter: unknown) {
  return safeParseObjectToSchema(filter, RecurringTransactionFilterSchema);
}
