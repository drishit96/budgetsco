import type { z } from "zod";

export function formatErrors(issues: z.core.$ZodIssueBase[]) {
  const errors: { [key: string]: string } = {};
  issues.forEach((issue) => {
    errors[issue.path[0].toString()] = issue.message;
  });
  return errors;
}
