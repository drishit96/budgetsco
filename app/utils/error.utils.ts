import type { z } from "zod";
import { isNullOrEmpty } from "./text.utils";

export function formatErrors(issues: z.core.$ZodIssueBase[]) {
  const errors: { [key: string]: string } = {};
  issues.forEach((issue) => {
    if (isNullOrEmpty(issue.path[0])) {
      errors["_".toString()] = issue.message;
    } else {
      errors[issue.path[0].toString()] = issue.message;
    }
  });
  return errors;
}
