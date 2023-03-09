import type { ActionFunction } from "@remix-run/node";
import type { GPBNotificaction } from "~/modules/subscriptions/gpb.subscriptions.service";
import { updateSubscriptionStatus } from "~/modules/subscriptions/gpb.subscriptions.service";
import { isNullOrEmpty } from "~/utils/text.utils";

export let action: ActionFunction = async ({ request }) => {
  try {
    const body = await request.json();
    const payloadStr = Buffer.from(body.message.data, "base64").toString();
    if (isNullOrEmpty(payloadStr)) return new Response("OK", { status: 200 });

    const payload: GPBNotificaction = JSON.parse(payloadStr);
    await updateSubscriptionStatus(
      payload.subscriptionNotification.purchaseToken
    );

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.log(error);
    return new Response("NOK", { status: 500 });
  }
};
