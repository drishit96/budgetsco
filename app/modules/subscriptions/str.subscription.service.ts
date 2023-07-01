import type Stripe from "stripe";
import prisma from "../../lib/prisma";
import {
  getCustomerPortalSession,
  getSTRSubscriptionDetails,
} from "~/utils/str.payment.utils.server";
import type { STRSubscription } from "@prisma/client";
import { isNotNullAndEmpty } from "~/utils/text.utils";
import { updatePaymentStatusInPreferences } from "../settings/settings.service";
import { logError } from "~/utils/logger.utils.server";

export async function getSTRCustomerId(userId: string) {
  try {
    const record = await prisma.sTRSubscription.findUnique({
      where: { userId },
      select: { customerId: true },
    });
    return record?.customerId ?? null;
  } catch (error) {
    logError(error);
    return null;
  }
}

export async function getSTRSubscriptionData(userId: string) {
  try {
    const record = await prisma.sTRSubscription.findUnique({
      where: { userId },
      select: { subscriptionId: true },
    });
    if (record == null) return null;

    return getSTRSubscriptionDetails(record.subscriptionId);
  } catch (error) {
    logError(error);
    return null;
  }
}

export async function getSTRCustomerPortalSession(userId: string) {
  try {
    const customerId = await getSTRCustomerId(userId);
    if (customerId == null) return null;
    return getCustomerPortalSession(customerId);
  } catch (error) {
    logError(error);
    return null;
  }
}

export async function updateSTRSubscriptionStatus(
  subscriptionId: string,
  subscription: Stripe.Subscription | null,
  userId: string | null
) {
  try {
    if (subscriptionId == null) return false;
    if (subscription == null) {
      subscription = await getSTRSubscriptionDetails(subscriptionId);
    }
    if (subscription == null) return false;
    if (userId == null && subscription.id == null) return false;

    const expiry = getExpiryOfSubscription(subscription);
    const isActive =
      subscription.status === "active" || subscription.status === "trialing";

    let subscriptionFromDB: STRSubscription | null = null;
    if (isNotNullAndEmpty(userId)) {
      // userId is not null only on manual subscription purchase.
      // userId is null only on subscriptions renewals and changes.
      const customerId = getCustomerId(subscription.customer);
      await prisma.sTRSubscription.upsert({
        where: { userId },
        create: {
          userId,
          customerId,
          subscriptionId,
          state: subscription.status,
          expiry,
        },
        update: { userId, customerId, subscriptionId, state: subscription.status },
      });
    } else {
      subscriptionFromDB = await prisma.sTRSubscription.findFirst({
        where: { subscriptionId },
      });
      if (subscriptionFromDB == null) {
        throw new Error(`subscription not found: ${subscriptionId}`);
      }

      userId = subscriptionFromDB.userId;
      await prisma.sTRSubscription.update({
        where: { userId },
        data: {
          state: subscription.status,
          expiry,
          cancelAtExpiry: subscription.cancel_at_period_end,
        },
      });
    }
    await updatePaymentStatusInPreferences(userId, "STR", isActive);
  } catch (error) {
    logError(error);
    return false;
  }
}

function getExpiryOfSubscription(subscription: Stripe.Subscription): number {
  return (
    subscription.trial_end ?? subscription.cancel_at ?? subscription.current_period_end
  );
}

function getCustomerId(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer
): string {
  if (typeof customer === "string") return customer;
  return customer.id;
}
