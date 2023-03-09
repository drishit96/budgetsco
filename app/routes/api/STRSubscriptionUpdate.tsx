import type { ActionFunction } from "@remix-run/node";
import type Stripe from "stripe";
import { updateSTRSubscriptionStatus } from "~/modules/subscriptions/str.subscription.service";
import { logError } from "~/utils/logger.utils.server";
import { getValidatedEvent } from "~/utils/str.payment.utils.server";
import { isNullOrEmpty } from "~/utils/text.utils";

export let action: ActionFunction = async ({ request }) => {
  try {
    const signature = request.headers.get("stripe-signature");
    if (signature == null) return new Response("NOK", { status: 400 });

    const bodyText = await request.text();
    if (isNullOrEmpty(bodyText)) return new Response("NOK", { status: 400 });

    const eventObj = getValidatedEvent(bodyText, signature);
    if (eventObj == null) return new Response("NOK", { status: 400 });

    const eventType = eventObj.type;
    if (
      eventType === "checkout.session.completed" ||
      eventType === "checkout.session.async_payment_succeeded" ||
      eventType === "checkout.session.async_payment_failed"
    ) {
      const checkoutSession = eventObj.data.object as Stripe.Checkout.Session;
      const userId = checkoutSession.client_reference_id;
      const subscriptionId = checkoutSession.subscription as string;
      if (subscriptionId == null || userId == null) {
        return new Response("NOK", { status: 400 });
      }

      if (
        checkoutSession.payment_status === "paid" ||
        checkoutSession.payment_status === "no_payment_required"
      ) {
        await updateSTRSubscriptionStatus(subscriptionId, null, userId);
      }
    } else if (
      eventType === "customer.subscription.updated" ||
      eventType === "customer.subscription.deleted" ||
      eventType === "customer.subscription.pending_update_applied" ||
      eventType === "customer.subscription.pending_update_expired"
    ) {
      const subscription = eventObj.data.object as Stripe.Subscription;
      await updateSTRSubscriptionStatus(subscription.id, subscription, null);
    } else {
      return new Response("NOK", { status: 400 });
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    logError(error);
    return new Response("NOK", { status: 500 });
  }
};
