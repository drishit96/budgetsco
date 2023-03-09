import type { z } from "zod";

export function formatErrors(issues: z.ZodIssue[]) {
  const errors: { [key: string]: string } = {};
  issues.forEach((issue) => {
    errors[issue.path[0]] = issue.message;
  });
  return errors;
}
