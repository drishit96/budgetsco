import type { ActionFunction } from "react-router";
import type { GPBNotificaction } from "~/modules/subscriptions/gpb.subscriptions.service";
import { updateSubscriptionStatus } from "~/modules/subscriptions/gpb.subscriptions.service";
import { verifyGPBPubSubRequest } from "~/utils/gpb.payment.utils.server";
import { logError } from "~/utils/logger.utils.server";
import { isNullOrEmpty } from "~/utils/text.utils";

export let action: ActionFunction = async ({ request }) => {
  try {
    const isAuthorized = await verifyGPBPubSubRequest(request);
    if (!isAuthorized) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const payloadStr = Buffer.from(body.message.data, "base64").toString();
    if (isNullOrEmpty(payloadStr)) return new Response("OK", { status: 200 });

    const payload: GPBNotificaction = JSON.parse(payloadStr);
    if (!payload || !payload.subscriptionNotification) {
      return new Response("OK", { status: 200 });
    }

    await updateSubscriptionStatus(payload.subscriptionNotification.purchaseToken);

    return new Response("OK", { status: 200 });
  } catch (error) {
    logError(error);
    return new Response("NOK", { status: 500 });
  }
};
