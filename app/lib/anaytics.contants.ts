const EventNames = {
  LOGGED_IN: "Logged in",
  REGISTERED: "Registered",
  EMAIL_VERIFIED: "Email verified",
  PASSWORD_VALID: "Password valid",
  CURRENCY_CHANGED: "Currency changed",
  MFA_VALID: "MFA valid",
  MFA_ENABLED: "MFA enabled",
  MFA_DISABLED: "MFA disabled",
  TRANSACTION_CREATED: "Transaction created",
  TRANSACTION_EDITED: "Transaction edited",
  TRANSACTION_DELETED: "Transaction deleted",
  RECURRING_TRANSACTION_CREATED: "Recurring transaction created",
  RECURRING_TRANSACTION_EDITED: "Recurring transaction edited",
  RECURRING_TRANSACTION_DELETED: "Recurring transaction deleted",
  RECURRING_TRANSACTION_MARKED_AS_DONE: "Recurring transaction marked as done",
  BUDGET_CREATED: "Budget created",
  BUDGET_EDITED: "Budget edited",
  LOGOUT: "Logged out",
} as const;

export { EventNames };
