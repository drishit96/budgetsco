import { z } from "zod";
import { formatErrors } from "./error.utils";

type SafeParseResult<T> =
  | {
      errors: null;
      data: T;
    }
  | {
      errors: { [key: string]: string };
      data: null;
    };


/**
 * Safely parses and validates an unknown input against a Zod schema
 * @template T - The Zod schema type
 * @param {unknown} input - The input value to validate
 * @param {T} schema - The Zod schema to validate against
 * @returns {SafeParseResult<z.infer<T>>} An object containing either the parsed data or validation errors
 * @returns {null | Record<string, string[]>} errors - Validation errors if any, null otherwise
 * @returns {z.infer<T> | null} data - Parsed data if validation succeeds, null otherwise
 */
export function safeParseObjectToSchema<T extends z.ZodType>(
  input: unknown,
  schema: T
): SafeParseResult<z.infer<T>> {
  const output = schema.safeParse(input);
  if (output.success) {
    return {
      errors: null,
      data: output.data,
    };
  } else {
    const errors = formatErrors(output.error.issues);
    return { errors, data: null };
  }
}
