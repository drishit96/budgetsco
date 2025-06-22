import { add } from "date-fns";
import { z } from "zod";
import { formatErrors } from "~/utils/error.utils";

const addReadPermissionIfWriteOrDelete = (
  val:
    | {
        read?: boolean;
        write?: boolean;
        delete?: boolean;
      }
    | undefined
) => {
  if (val == null) return undefined;
  if (val.write || val.delete) {
    val.read = true;
  }
  return val;
};

const permissions = z
  .object({
    transactions: z
      .object({
        read: z.boolean().optional(),
        write: z.boolean().optional(),
        delete: z.boolean().optional(),
      })
      .optional()
      .transform(addReadPermissionIfWriteOrDelete),
    recurringTransactions: z
      .object({
        read: z.boolean().optional(),
        write: z.boolean().optional(),
        delete: z.boolean().optional(),
      })
      .optional()
      .transform(addReadPermissionIfWriteOrDelete),
    preferences: z
      .object({
        budget: z
          .object({
            read: z.boolean().optional(),
            write: z.boolean().optional(),
          })
          .optional()
          .transform(addReadPermissionIfWriteOrDelete),
        currency: z
          .object({
            read: z.boolean().default(true),
            write: z.boolean().optional(),
          })
          .transform(addReadPermissionIfWriteOrDelete),
        customCategories: z
          .object({
            read: z.boolean().default(true),
            write: z.boolean().optional(),
            delete: z.boolean().optional(),
          })
          .optional()
          .transform(addReadPermissionIfWriteOrDelete),
      })
      .optional(),
  })
  .refine(
    (data) => {
      const hasPermission = (obj: any): boolean => {
        return Object.entries(obj).some(([_, value]) => {
          if (typeof value === "object") {
            return hasPermission(value);
          }
          return value === true;
        });
      };
      return hasPermission(data);
    },
    {
      message: "At least one permission must be enabled",
    }
  );

const tokenInput = {
  name: z.string().min(1, "Token name is required"),
  expiresAt: z
    .date()
    .min(
      add(new Date(), { days: 1 }),
      "Expiration date must be at least 1 day in the future"
    ),
  permissions,
};

const tokenGenerated = {
  id: z.string(),
  createdAt: z.date(),
  token: z.string(),
};

const tokenSchema = z.object({
  ...tokenInput,
  ...tokenGenerated,
});

export const TokensResponseSchema = z.array(tokenSchema);
export const TokenResponseSchema = tokenSchema;
export const TokenInputSchema = z.object(tokenInput);

export type TokenResponse = Omit<
  z.infer<typeof TokenResponseSchema>,
  "token" | "permissions"
> & {
  permissions: TokenPermissions;
};
export type TokensResponse = z.infer<typeof TokensResponseSchema>;
export type TokenPermissionType = "read" | "write" | "delete";

export type TokenPermissions = {
  [key: string]:
    | TokenPermissions
    | {
        displayName?: string;
        disabledPermissions?: TokenPermissionType[];
        read: boolean;
        write?: boolean;
        delete?: boolean;
      };
};

export type TokenInput = Omit<z.infer<typeof TokenInputSchema>, "permissions"> & {
  permissions: TokenPermissions;
};

export function parseTokenInput(token: unknown) {
  const output = TokenInputSchema.safeParse(token);
  if (output.success) {
    return {
      errors: null,
      token: output.data,
    };
  } else {
    const errors = formatErrors(output.error.issues);
    return { errors, token: null };
  }
}

export function parseTokenResponse(token: unknown) {
  const output = TokenResponseSchema.safeParse(token);
  if (output.success) {
    return {
      errors: null,
      token: output.data,
    };
  } else {
    const errors = formatErrors(output.error.issues);
    return { errors, token: null };
  }
}

export function parseTokensResponse(tokens: unknown) {
  const output = TokensResponseSchema.safeParse(tokens);
  if (output.success) {
    return {
      errors: null,
      tokens: output.data,
    };
  } else {
    const errors = formatErrors(output.error.issues);
    return { errors, tokens: null };
  }
}
