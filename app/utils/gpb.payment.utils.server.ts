import type { androidpublisher_v3 } from "@googleapis/androidpublisher";
import { auth, androidpublisher } from "@googleapis/androidpublisher";
import { OAuth2Client } from "google-auth-library";
import { logError, logWarn } from "./logger.utils.server";
import { isNullOrEmpty } from "./text.utils";

const PACKAGE_NAME = "com.app.budgetsco";

let playDeveloperApiClient: androidpublisher_v3.Androidpublisher | null = null;
let oidcClient: OAuth2Client | null = null;

function getOidcClient() {
  if (!oidcClient) {
    oidcClient = new OAuth2Client();
  }
  return oidcClient;
}

function getExpectedServiceAccountEmail(): string | null {
  if (process.env.FIREBASE_ADMIN_KEY) {
    try {
      const parsed = JSON.parse(process.env.FIREBASE_ADMIN_KEY);
      return parsed.client_email || parsed.clientEmail || null;
    } catch {
      return null;
    }
  }
  return null;
}

function getExpectedAudience(request: Request): string | string[] {
  const url = new URL(request.url);
  const endpointUrl = `${url.origin}${url.pathname}`;

  if (process.env.GPAY_PUBSUB_AUDIENCE) {
    const configured = process.env.GPAY_PUBSUB_AUDIENCE.split(",").map((s) => s.trim());
    return Array.from(new Set([...configured, endpointUrl]));
  }

  return endpointUrl;
}

export async function verifyGPBPubSubRequest(request: Request): Promise<boolean> {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      logWarn("GPB Pub/Sub webhook rejected: missing or malformed Authorization header");
      return false;
    }

    const idToken = authHeader.substring(7).trim();
    if (!idToken) {
      logWarn("GPB Pub/Sub webhook rejected: empty bearer token");
      return false;
    }

    const expectedServiceAccount = getExpectedServiceAccountEmail();
    if (!expectedServiceAccount) {
      logWarn("GPB Pub/Sub webhook rejected: expected service account email not configured");
      return false;
    }

    const audience = getExpectedAudience(request);

    const client = getOidcClient();
    const ticket = await client.verifyIdToken({
      idToken,
      audience,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      logWarn("GPB Pub/Sub webhook rejected: empty token payload");
      return false;
    }

    if (payload.email !== expectedServiceAccount) {
      logWarn(
        `GPB Pub/Sub webhook rejected: service account mismatch (expected: ${expectedServiceAccount}, received: ${payload.email})`
      );
      return false;
    }

    if (!payload.email_verified) {
      logWarn("GPB Pub/Sub webhook rejected: service account email not verified");
      return false;
    }

    return true;
  } catch (error) {
    logError(error);
    return false;
  }
}

function getPlayDeveloperApiClient() {
  if (!playDeveloperApiClient) {
    if (!process.env.GPLAY_API_KEY) {
      throw new Error("GPLAY_API_KEY is not defined");
    }
    const service = JSON.parse(process.env.GPLAY_API_KEY);
    const privateKey = service.private_key?.replace(/\\n/g, "\n");
    const jwtClient = new auth.JWT({
      email: service.client_email,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/androidpublisher"],
    });
    playDeveloperApiClient = androidpublisher({
      version: "v3",
      auth: jwtClient,
    });
  }
  return playDeveloperApiClient;
}

export async function getGPBSubscriptionDetails(purchaseToken: string) {
  try {
    if (isNullOrEmpty(purchaseToken)) return null;
    const client = getPlayDeveloperApiClient();
    const subscription =
      await client.purchases.subscriptionsv2.get({
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
    const client = getPlayDeveloperApiClient();
    await client.purchases.subscriptions.acknowledge({
      packageName: "com.app.budgetsco",
      subscriptionId,
      token: purchaseToken,
    });

    return true;
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
