import type { ActionFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { createGPBSubscription } from "~/modules/subscriptions/gpb.subscriptions.service";
import { getUserIdFromSession } from "~/utils/auth.utils.server";
import { isNullOrEmpty } from "~/utils/text.utils";

export let action: ActionFunction = async ({ request }) => {
  try {
    const userId = await getUserIdFromSession(request);
    if (userId == null) return redirect("/auth/login");

    const body = await request.json();
    const subscriptionId = body.subscriptionId;
    const purchaseToken = body.purchaseToken;

    if (isNullOrEmpty(subscriptionId) || isNullOrEmpty(purchaseToken)) {
      return { acknowledged: false };
    }

    const acknowledged = await createGPBSubscription(
      userId,
      subscriptionId,
      purchaseToken
    );

    return { acknowledged };
  } catch (error) {
    return { acknowledged: false };
  }
};
