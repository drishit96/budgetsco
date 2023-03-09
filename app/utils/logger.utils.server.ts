import newrelic from "newrelic";

export function logError(error: any) {
  newrelic.noticeError(error as Error, { stackTrace: error.stack });
  console.log(error);
}
