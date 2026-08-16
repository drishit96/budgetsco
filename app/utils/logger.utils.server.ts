import newrelic from "newrelic";

export function logError(error: any) {
  newrelic.noticeError(error as Error, { stackTrace: error.stack });
  console.error(error);
}

export function logInfo(message: string) {
  console.info(message);
}

export function logWarn(message: string) {
  console.warn(message);
}

export function logDebug(message: string) {
  console.debug(message);
}
