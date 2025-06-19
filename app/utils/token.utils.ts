import { TokenResponse } from "~/modules/settings/tokens/tokens.schema";
import defaultsDeep from "lodash.defaultsdeep";
import { add } from "date-fns";

/**
 * Generates a default token input object with predefined permissions and expiration date.
 * If a tokenInput is provided, it merges the default values with the provided input.
 *
 * @param tokenInput - Optional existing token input to merge with defaults.
 * @returns A TokenResponse object with default values and merged permissions.
 */
export function getDefaultTokenInput(tokenInput?: TokenResponse): TokenResponse {
  const defaultState: TokenResponse = {
    id: "",
    createdAt: new Date(),
    name: "",
    expiresAt: add(new Date(), { days: 30 }),
    permissions: {
      transactions: {
        read: false,
        write: false,
        delete: false,
      },
      recurringTransactions: {
        read: false,
        write: false,
        delete: false,
        displayName: "Recurring Transactions",
      },
      preferences: {
        budget: {
          read: false,
          write: false,
        },
        currency: {
          read: true,
          write: false,
          disabledPermissions: ["read"],
        },
        customCategories: {
          displayName: "Custom Categories",
          read: true,
          write: false,
          delete: false,
          disabledPermissions: ["read"],
        },
      },
    },
  };
  return defaultsDeep(tokenInput ?? {}, defaultState);
}

/**
 * Converts form data into a nested permissions object structure.
 * Automatically initializes default currency read permissions if not present.
 *
 * @param formData - The FormData object containing permission entries
 * @returns An object containing nested permission settings
 *
 * @example
 * const form = new FormData();
 * form.append("preferences.currency.read", "true");
 * const permissions = getPermissionsFromForm(form);
 * // Returns: { preferences: { currency: { read: true, disabledPermissions: ["read"] } } }
 */
export function getPermissionsFromForm(formData: FormData) {
  let permissions: any = {};
  for (let [key, value] of formData.entries()) {
    buildNestedPermissionsObject(permissions, key, value);
  }

  if (permissions.preferences == null) {
    permissions.preferences = {};
  }
  if (permissions.preferences.currency == null) {
    permissions.preferences.currency = { read: true, disabledPermissions: ["read"] };
  }

  return permissions;
}

/**
 * Recursively builds a nested object structure based on a dot-notation property path
 * and sets permission values at the leaf nodes.
 *
 * @param targetObj - The target object to build the nested structure in
 * @param propertyPath - Dot-notation string representing the property path (e.g. "users.read")
 * @param permissionValue - The permission value to set at the leaf node ("true"/"false")
 *
 * @example
 * const permissions = {};
 * buildNestedPermissionsObject(permissions, "users.read", "true");
 * // Result: { users: { read: true } }
 *
 * @returns void | The result of recursive call on nested object
 */
function buildNestedPermissionsObject(
  targetObj: any,
  propertyPath: string,
  permissionValue: FormDataEntryValue
) {
  const pathSegments = propertyPath.split(".");
  if (pathSegments.length === 1) {
    if (
      propertyPath === "read" ||
      propertyPath === "write" ||
      propertyPath === "delete"
    ) {
      targetObj[propertyPath] = permissionValue === "true";
    } else {
      targetObj[propertyPath] = {};
    }
    return;
  }

  const currentSegment = pathSegments[0];
  if (!targetObj.hasOwnProperty(currentSegment)) {
    targetObj[currentSegment] = {};
  }
  pathSegments.shift();

  return buildNestedPermissionsObject(
    targetObj[currentSegment],
    pathSegments.join("."),
    permissionValue
  );
}
