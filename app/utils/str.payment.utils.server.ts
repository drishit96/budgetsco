import constructorStripe from "stripe";
import { logError } from "./logger.utils.server";
const stripe = new constructorStripe(process.env.STRIPE_KEY_SECRET!, {
  apiVersion: "2022-11-15",
});

export function getValidatedEvent(requestBody: string, signature: string) {
  try {
    return stripe.webhooks.constructEvent(
      requestBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    logError(error);
    return null;
  }
}

export async function getCustomerPortalSession(customerId: string) {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
  });
  return session;
}

export async function getSTRSubscriptionDetails(subscriptionId: string) {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return subscription;
  } catch (error) {
    logError(error);
    return null;
  }
}
