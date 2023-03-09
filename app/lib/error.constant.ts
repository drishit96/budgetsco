const DBErrorDescriptions = {
  P2002_DUPLICATE_EMAIL: "Email-id already exists",
  UNKNOWN: "Something went wrong, please try again later",
} as const;

const DBErrors = {
  P2002: "P2002",
  UNKNOWN: "UNKNOWN",
} as const;

export { DBErrors, DBErrorDescriptions };
