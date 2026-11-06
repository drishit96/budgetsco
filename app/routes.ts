import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  index("routes/index.tsx"),
  route("dashboard", "routes/dashboard.tsx"),

  // Auth Layout & Sub-routes
  route("auth", "routes/auth.tsx", [
    route("login", "routes/auth/login.tsx"),
    route("register", "routes/auth/register.tsx"),
    route("forgotPassword", "routes/auth/forgotPassword.tsx"),
  ]),
  route("auth-action", "routes/auth-action.tsx"),
  route("verifyEmail", "routes/verifyEmail.tsx"),
  route("verifyMFA", "routes/verifyMFA.tsx"),

  // Reports Layout & Sub-routes
  route("reports", "routes/reports.tsx", [
    route("thisMonth", "routes/reports/thisMonth.tsx"),
    route("compare", "routes/reports/compare.tsx"),
    route("trend", "routes/reports/trend.tsx", [
      route("expense", "routes/reports/trend/expense.tsx"),
      route("income", "routes/reports/trend/income.tsx"),
      route("investment", "routes/reports/trend/investment.tsx"),
    ]),
  ]),

  // Transactions
  route("transaction/create", "routes/transaction/create.tsx"),
  route("transaction/history", "routes/transaction/history.tsx"),
  route("transaction/edit/:transactionId", "routes/transaction/edit/$transactionId.tsx"),
  route("transaction/recurring/new", "routes/transaction/recurring/new.tsx"),
  route("transaction/recurring/bulk", "routes/transaction/recurring/bulk.tsx"),
  route("transaction/recurring/edit/:recurringTransactionId", "routes/transaction/recurring/edit/$recurringTransactionId.tsx"),

  // Settings
  route("settings/list", "routes/settings/list.tsx"),
  route("settings/profile", "routes/settings/profile.tsx"),
  route("settings/theme", "routes/settings/theme.tsx"),
  route("settings/changeCurrency", "routes/settings/changeCurrency.tsx"),
  route("settings/createBudget", "routes/settings/createBudget.tsx"),
  route("settings/editBudget", "routes/settings/editBudget.tsx"),
  route("settings/manageRecurringTransactions", "routes/settings/manageRecurringTransactions.tsx"),
  route("settings/ai-byok", "routes/settings/ai-byok.tsx"),
  route("settings/security/list", "routes/settings/security/list.tsx"),
  route("settings/security/mfa", "routes/settings/security/mfa.tsx"),
  route("settings/security/passkeys", "routes/settings/security/passkeys.tsx"),
  route("settings/tokens/list", "routes/settings/tokens/list.tsx"),
  route("settings/tokens/token/new", "routes/settings/tokens/token/new.tsx"),
  route("settings/tokens/token/edit/:tokenId", "routes/settings/tokens/token/edit/$tokenId.tsx"),

  // Subscriptions
  route("subscriptions/gpb", "routes/subscriptions/gpb.tsx"),
  route("subscriptions/str", "routes/subscriptions/str.tsx"),

  // Policy pages
  route("privacy-policy", "routes/privacy-policy.tsx"),
  route("terms-of-service", "routes/terms-of-service.tsx"),
  route("cancel-and-refund-policy", "routes/cancel-and-refund-policy.tsx"),
  route("manifest.webmanifest", "routes/manifest[.]webmanifest.tsx"),

  // API endpoints
  route("api/acknowledgePurchase", "routes/api/acknowledgePurchase.tsx"),
  route("api/estimateBudgetWithAI", "routes/api/estimateBudgetWithAI.tsx"),
  route("api/GPaySubscriptionUpdate", "routes/api/GPaySubscriptionUpdate.tsx"),
  route("api/STRSubscriptionUpdate", "routes/api/STRSubscriptionUpdate.tsx"),
  route("api/refreshSession", "routes/api/refreshSession.tsx"),
  route("api/verifyPasskey", "routes/api/verifyPasskey.tsx"),
  route("api/getPasskeyAuthenticationOptions", "routes/api/getPasskeyAuthenticationOptions.tsx"),
  route("api/getPasskeyRegistrationOptions", "routes/api/getPasskeyRegistrationOptions.tsx"),
  route("api/getPreviousBudgetPerCategory", "routes/api/getPreviousBudgetPerCategory.tsx"),
  route("api/getRemainingBudgetForCategory", "routes/api/getRemainingBudgetForCategory.tsx"),
  route("api/recommendRecurringTransactions", "routes/api/recommendRecurringTransactions.tsx"),
  route("api/recurringTransactionReminder", "routes/api/recurringTransactionReminder.tsx"),
  route("api/categories/get", "routes/api/categories/get.tsx"),
  route("api/categories/custom/get", "routes/api/categories/custom/get.tsx"),
  route("api/categories/custom/create", "routes/api/categories/custom/create.tsx"),
  route("api/categories/custom/delete", "routes/api/categories/custom/delete.tsx"),
  route("api/currency/get", "routes/api/currency/get.tsx"),
  route("api/currency/set", "routes/api/currency/set.tsx"),
  route("api/target/get", "routes/api/target/get.tsx"),
  route("api/target/set", "routes/api/target/set.tsx"),
  route("api/transactions/get", "routes/api/transactions/get.tsx"),
  route("api/transactions/create", "routes/api/transactions/create.tsx"),
  route("api/transactions/edit", "routes/api/transactions/edit.tsx"),
  route("api/transactions/delete", "routes/api/transactions/delete.tsx"),
  route("api/recurringTransactions/get", "routes/api/recurringTransactions/get.tsx"),
  route("api/recurringTransactions/create", "routes/api/recurringTransactions/create.tsx"),
  route("api/recurringTransactions/edit", "routes/api/recurringTransactions/edit.tsx"),
  route("api/recurringTransactions/delete", "routes/api/recurringTransactions/delete.tsx"),
  route("api/recurringTransactions/markAsDone", "routes/api/recurringTransactions/markAsDone.tsx"),
  route("api/recurringTransactions/skip", "routes/api/recurringTransactions/skip.tsx"),

  // Catch-all
  route("*", "routes/$.tsx"),
] satisfies RouteConfig;
