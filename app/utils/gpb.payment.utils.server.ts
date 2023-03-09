import type { androidpublisher_v3 } from "@googleapis/androidpublisher";
import { auth, androidpublisher } from "@googleapis/androidpublisher";
import { isNullOrEmpty } from "./text.utils";

const PACKAGE_NAME = "com.app.budgetsco";
const service = JSON.parse(process.env.GPLAY_API_KEY!);
const jwtClient = new auth.JWT(
  service.client_email,
  undefined,
  service.private_key,
  ["https://www.googleapis.com/auth/androidpublisher"],
  undefined
);
const playDeveloperApiClient = androidpublisher({
  version: "v3",
  auth: jwtClient,
});

export async function getGPBSubscriptionDetails(purchaseToken: string) {
  try {
    if (isNullOrEmpty(purchaseToken)) return null;
    const subscription =
      await playDeveloperApiClient.purchases.subscriptionsv2.get({
        packageName: PACKAGE_NAME,
        token: purchaseToken,
      });
    return subscription;
  } catch (err: any) {
    console.log(err?.message);
    return null;
  }
}

export async function acknowledgeGPBSubscriptionPurchase(
  subscriptionId: string,
  purchaseToken: string
) {
  try {
    await playDeveloperApiClient.purchases.subscriptions.acknowledge({
      packageName: "com.app.budgetsco",
      subscriptionId,
      token: purchaseToken,
    });

    return false;
  } catch (err: any) {
    console.log(err?.message);
    return false;
  }
}

export function isGPBSubscriptionActive(
  subscription: androidpublisher_v3.Schema$SubscriptionPurchaseV2
) {
  try {
    const subscriptionState = subscription.subscriptionState;
    if (
      subscriptionState === "SUBSCRIPTION_STATE_ON_HOLD" ||
      subscriptionState === "SUBSCRIPTION_STATE_EXPIRED" ||
      subscriptionState === "SUBSCRIPTION_STATE_PAUSED"
    ) {
      return false;
    } else if (subscriptionState === "SUBSCRIPTION_STATE_CANCELED") {
      if (
        subscription.lineItems == null ||
        subscription.lineItems[0].expiryTime == null
      ) {
        return false;
      }
      const expiry = new Date(subscription.lineItems[0].expiryTime);
      if (expiry < new Date()) return false;
      return true;
    }
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
}

export function getUserCancellationReason(
  subscription: androidpublisher_v3.Schema$SubscriptionPurchaseV2
) {
  let cancelReason: string | null | undefined = null;
  if (subscription.canceledStateContext?.userInitiatedCancellation) {
    const cancelObj =
      subscription.canceledStateContext?.userInitiatedCancellation;

    cancelReason =
      cancelObj.cancelSurveyResult?.reason === "CANCEL_SURVEY_REASON_OTHERS"
        ? cancelObj.cancelSurveyResult?.reasonUserInput
        : cancelObj.cancelSurveyResult?.reason;

    return cancelReason ?? null;
  }
  return cancelReason;
}
