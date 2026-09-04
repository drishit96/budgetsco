import { z } from "zod";

const recurringRecommendationInput = {
  description: z.string().describe("Transaction description or pattern"),
  amount: z.number().describe("Recommended amount as a number"),
  type: z.enum(["income", "expense", "investment"]).describe("Transaction type"),
  category: z.string().describe("Transaction category"),
  paymentMode: z.string().describe("Payment method"),
  occurrence: z.enum(["day", "month", "year"]).describe("Recurrence period"),
  interval: z
    .number()
    .int()
    .min(1)
    .describe("How often it recurs within the occurrence period"),
  startDate: z
    .string()
    .describe("Start date for the recurring transaction in ISO format"),
  confidence: z.string().describe("AI confidence level in this recommendation"),
  reasoning: z.string().describe("Explanation for why this is recommended"),
};

export const RecurringRecommendationSchema = z.compile(
  z.object(recurringRecommendationInput)
);

export const RecurringRecommendationsResponseSchema = z.compile(
  z.object({
    recommendations: z.array(RecurringRecommendationSchema),
  })
);

export type RecurringRecommendation = z.infer<typeof RecurringRecommendationSchema>;
export type RecurringRecommendationsResponse = z.infer<typeof RecurringRecommendationsResponseSchema>;

