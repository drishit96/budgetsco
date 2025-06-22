import { TokenPermissions } from "~/modules/settings/tokens/tokens.schema";

export function checkPermissions(request: Request, permissions: TokenPermissions) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method.toLowerCase();

  if (!path.startsWith("/api") || !permissions) {
    return false;
  }

  if (path.startsWith("/api/transactions")) {
    if (method === "get") {
      return permissions.transactions?.read as boolean;
    } else if (method === "post") {
      return permissions.transactions?.write as boolean;
    } else if (method === "delete") {
      return permissions.transactions?.delete as boolean;
    }
  } else if (path.startsWith("/api/categories")) {
    if (path.startsWith("/api/categories/custom")) {
      if (method === "get") {
        return true;
      } else if (method === "post") {
        return (permissions.preferences as TokenPermissions)?.customCategories
          ?.write as boolean;
      } else if (method === "delete") {
        return (permissions.preferences as TokenPermissions)?.customCategories
          ?.delete as boolean;
      }
    } else {
      if (method === "get") {
        return true;
      }
    }
  } else if (path.startsWith("/api/currency")) {
    if (method === "get") {
      return true;
    } else if (method === "post") {
      return (permissions.preferences as TokenPermissions)?.currency?.write as boolean;
    }
  } else if (path.startsWith("/api/target")) {
    if (method === "get") {
      return (permissions.preferences as TokenPermissions)?.budget?.read as boolean;
    } else if (method === "post") {
      return (permissions.preferences as TokenPermissions)?.budget?.write as boolean;
    } else if (method === "delete") {
      return (permissions.preferences as TokenPermissions)?.budget?.delete as boolean;
    }
  } else if (path.startsWith("/api/recurringTransactions")) {
    if (method === "get") {
      return permissions.recurringTransactions?.read as boolean;
    } else if (method === "post") {
      return permissions.recurringTransactions?.write as boolean;
    } else if (method === "delete") {
      return permissions.recurringTransactions?.delete as boolean;
    }
  }

  return false;
}
