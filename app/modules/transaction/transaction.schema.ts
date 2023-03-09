import { z } from "zod";
import { formatErrors } from "~/utils/error.utils";

const transactionInput = {
  description: z.string().nullish(),
  amount: z.number().gt(0, "Amount must be greater than zero").step(0.01),
  type: z.enum(["income", "expense", "investment"]),
  category: z.string().min(1, "Please select a category"),
  category2: z.string().nullish(),
  category3: z.string().nullish(),
  paymentMode: z.string().min(1, "Please select a payment mode"),
};

const transactionGenerated = {
  id: z.string(),
  createdAt: z.date(),
  createdAtLocal: z.date(),
};

const monthlyTargetInput = {
  budget: z.number().gt(0, "Budget has to be more than zero"),
};

export const TransactionInputSchema = z
  .object(transactionInput)
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

export const TransactionResponseSchema = z.object({
  ...transactionInput,
  ...transactionGenerated,
});

export const TransactionsResponseSchema = z.array(TransactionResponseSchema);
export const MonthlyTargetInputSchema = z.object(monthlyTargetInput);
export const MonthlyCategoryWiseTargetInputSchema = z.map(
  z.string().min(1),
  z.number().gte(0)
);

export type TransactionInput = z.infer<typeof TransactionInputSchema>;
export type TransactionResponse = z.infer<typeof TransactionResponseSchema>;
export type TransactionsResponse = z.infer<typeof TransactionsResponseSchema>;
export type MonthlyTargetInput = z.infer<typeof MonthlyTargetInputSchema>;
export type MonthlyCategoryWiseTargetInput = z.infer<
  typeof MonthlyCategoryWiseTargetInputSchema
>;
export type TransactionType = "income" | "expense" | "investment";

export function parseTransactionInput(transaction: unknown) {
  const output = TransactionInputSchema.safeParse(transaction);
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

export function parseTransactionsResponse(transactions: unknown): TransactionsResponse {
  return TransactionsResponseSchema.parse(transactions);
}

export function parseMonthlyTargetInput(targetDetails: unknown) {
  const output = MonthlyTargetInputSchema.safeParse(targetDetails);
  if (output.success) {
    return {
      errors: null,
      targetDetails: output.data,
    };
  } else {
    const errors = formatErrors(output.error.issues);
    return { errors, targetDetails: null };
  }
}

export function parseMonthlyCategoryWiseTargetInput(targetDetails: unknown) {
  const output = MonthlyCategoryWiseTargetInputSchema.safeParse(targetDetails);
  if (output.success) {
    return {
      errors: null,
      categoryWiseTargetDetails: output.data,
    };
  } else {
    const errors = formatErrors(output.error.issues);
    return { errors, categoryWiseTargetDetails: null };
  }
}
