import {
  acknowledgeGPBSubscriptionPurchase,
  getGPBSubscriptionDetails,
  getUserCancellationReason,
  isGPBSubscriptionActive,
} from "~/utils/gpb.payment.utils.server";
import { logError } from "~/utils/logger.utils.server";
import { isNullOrEmpty } from "~/utils/text.utils";
import prisma from "../../lib/prisma";
import { updatePaymentStatusInPreferences } from "../settings/settings.service";

export enum GPBNotificationType {
  SUBSCRIPTION_RECOVERED = 1,
  SUBSCRIPTION_RENEWED,
  SUBSCRIPTION_CANCELED,
  SUBSCRIPTION_PURCHASED,
  SUBSCRIPTION_ON_HOLD,
  SUBSCRIPTION_IN_GRACE_PERIOD,
  SUBSCRIPTION_RESTARTED,
  SUBSCRIPTION_PRICE_CHANGE_CONFIRMED,
  SUBSCRIPTION_DEFERRED,
  SUBSCRIPTION_PAUSED,
  SUBSCRIPTION_PAUSE_SCHEDULE_CHANGED,
  SUBSCRIPTION_REVOKED,
  SUBSCRIPTION_EXPIRED,
}

export type GPBSubscriptionState =
  | "SUBSCRIPTION_STATE_ACTIVE"
  | "SUBSCRIPTION_STATE_CANCELED"
  | "SUBSCRIPTION_STATE_IN_GRACE_PERIOD"
  | "SUBSCRIPTION_STATE_ON_HOLD"
  | "SUBSCRIPTION_STATE_PAUSED"
  | "SUBSCRIPTION_STATE_EXPIRED";

export interface GPBNotificaction {
  version: string;
  packageName: string;
  eventTimeMillis: string;
  subscriptionNotification: SubscriptionNotification;
}

export interface SubscriptionNotification {
  version: string;
  notificationType: GPBNotificationType;
  purchaseToken: string;
  subscriptionId: string;
}

export async function getGPBUserSubscription(userId: string) {
  try {
    const subscription = await prisma.gPBSubscription.findFirst({
      where: { userId, isLatest: true },
    });
    return subscription;
  } catch (error) {
    console.log(error);
    return null;
  }
}

export async function getSubscriptionByPurchaseToken(purchaseToken: string) {
  try {
    const subscription = await prisma.gPBSubscription.findFirst({
      where: { purchaseToken },
    });
    return subscription;
  } catch (error) {
    console.log(error);
    return null;
  }
}

export async function createGPBSubscription(
  userId: string,
  subscriptionId: string,
  purchaseToken: string
) {
  try {
    const duplicateSubscription = await prisma.gPBSubscription.findFirst({
      where: { purchaseToken },
    });
    if (duplicateSubscription) return false;

    const subscription = await getGPBSubscriptionDetails(purchaseToken);
    if (
      subscription == null ||
      subscription.data == null ||
      subscription.data.subscriptionState !== "SUBSCRIPTION_STATE_ACTIVE"
    ) {
      return false;
    }

    // reset isLatest flag for all purchaseTokens of current user
    await prisma.gPBSubscription.updateMany({
      where: { userId, isLatest: true },
      data: { isLatest: false },
    });

    let expiry = 0;
    if (
      subscription.data.lineItems != null &&
      subscription.data.lineItems[0].expiryTime != null
    ) {
      expiry = new Date(subscription.data.lineItems[0].expiryTime).getTime();
    }

    const tasks: any[] = [
      prisma.gPBSubscription.create({
        data: {
          userId,
          purchaseToken,
          isLatest: true,
          state: subscription.data.subscriptionState,
          expiry,
        },
      }),
    ];

    if (subscription.data.linkedPurchaseToken) {
      tasks.push(
        prisma.gPBSubscription.update({
          data: { isLatest: false },
          where: {
            purchaseToken: subscription.data.linkedPurchaseToken,
          },
        })
      );
    }

    await prisma.$transaction(tasks);
    await updatePaymentStatusInPreferences(userId, "GPB", true);

    const isAcknowledged = await acknowledgeGPBSubscriptionPurchase(
      subscriptionId,
      purchaseToken
    );

    return isAcknowledged;
  } catch (error) {
    console.log(error);
    return false;
  }
}

export async function updateSubscriptionStatus(purchaseToken: string) {
  try {
    if (isNullOrEmpty(purchaseToken)) return false;

    const subscription = await getGPBSubscriptionDetails(purchaseToken);
    if (subscription == null || subscription.data.subscriptionState == null) {
      throw new Error("subscription not found from google api");
    }

    const existingSubscription = await getSubscriptionByPurchaseToken(purchaseToken);
    if (existingSubscription == null) {
      // no susbcription found with given purchase token,
      // so we have to try to retreive userId from linkedPurchaseToken
      if (subscription.data.linkedPurchaseToken) {
        const previousSubscription = await getSubscriptionByPurchaseToken(
          subscription.data.linkedPurchaseToken
        );
        if (previousSubscription == null) {
          throw new Error(
            "Cannot find linked purchase, so cannot not link new purcaseToken to any user." +
              "Current Token: " +
              purchaseToken +
              ", Linked Token: " +
              subscription.data.linkedPurchaseToken
          );
        }
        await Promise.all([
          updatePaymentStatusInPreferences(
            previousSubscription.userId,
            "GPB",
            isGPBSubscriptionActive(subscription.data)
          ),
          prisma.gPBSubscription.create({
            data: {
              userId: previousSubscription?.userId,
              purchaseToken,
              isLatest: true,
              state: subscription.data.subscriptionState as GPBSubscriptionState,
            },
          }),
          prisma.gPBSubscription.update({
            data: { isLatest: false },
            where: { purchaseToken: subscription.data.linkedPurchaseToken },
          }),
        ]);
        return true;
      } else {
        throw new Error("No linked purchase, cannot link new purcaseToken to any user");
      }
    }

    if (!existingSubscription.isLatest) return false;

    const subscriptionState = subscription.data.subscriptionState as GPBSubscriptionState;

    if (subscriptionState === "SUBSCRIPTION_STATE_CANCELED") {
      if (
        subscription.data.lineItems == null ||
        subscription.data.lineItems[0].expiryTime == null
      ) {
        return false;
      }
      const expiry = new Date(subscription.data.lineItems[0].expiryTime);
      const cancelReason = getUserCancellationReason(subscription.data);

      if (expiry < new Date()) {
        // subscription is cancelled and expiry date is in the past
        await Promise.all([
          updatePaymentStatusInPreferences(existingSubscription.userId, "GPB", false),
          prisma.gPBSubscription.update({
            data: { state: subscriptionState, cancelReason },
            where: { purchaseToken },
          }),
        ]);
        return true;
      } else {
        // subscription is cancelled but expiry is in the future, so status remains active
        await Promise.all([
          updatePaymentStatusInPreferences(existingSubscription.userId, "GPB", true),
          prisma.gPBSubscription.update({
            data: {
              state: subscriptionState,
              expiry: expiry.getTime(),
              cancelReason,
            },
            where: { purchaseToken },
          }),
        ]);
        return true;
      }
    } else if (
      subscriptionState === "SUBSCRIPTION_STATE_ACTIVE" ||
      subscriptionState === "SUBSCRIPTION_STATE_IN_GRACE_PERIOD"
    ) {
      if (
        subscription.data.lineItems == null ||
        subscription.data.lineItems[0].expiryTime == null
      ) {
        throw new Error("no line items / expiryTime in subscription");
      }
      const expiry = new Date(subscription.data.lineItems[0].expiryTime);
      await Promise.all([
        updatePaymentStatusInPreferences(existingSubscription.userId, "GPB", true),
        prisma.gPBSubscription.update({
          data: {
            state: subscriptionState,
            expiry: expiry.getTime(),
          },
          where: { purchaseToken },
        }),
      ]);
      return true;
    } else if (
      subscriptionState === "SUBSCRIPTION_STATE_ON_HOLD" ||
      subscriptionState === "SUBSCRIPTION_STATE_EXPIRED" ||
      subscriptionState === "SUBSCRIPTION_STATE_PAUSED"
    ) {
      await Promise.all([
        updatePaymentStatusInPreferences(existingSubscription.userId, "GPB", false),
        prisma.gPBSubscription.update({
          data: { state: subscriptionState },
          where: { purchaseToken },
        }),
      ]);
      return true;
    }
    return false;
  } catch (error) {
    logError(error);
    return false;
  }
}
