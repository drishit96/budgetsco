import type { NotificationToken } from "@prisma/client";
import type { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { subHours } from "date-fns";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import type { Message } from "firebase-admin/lib/messaging/messaging-api";
import {
  getDueTransactionCountPerUser,
  markAsNotified,
} from "~/modules/recurring/recurring.service";
import { deleteInvalidTokens, getNotificationTokens } from "~/modules/user/user.service";
import { getBatch } from "~/utils/array.utils";
import { logError } from "~/utils/logger.utils.server";

export let loader: LoaderFunction = async (): Promise<any> => {
  try {
    const dateNow = new Date();
    const oneHourAgo = subHours(dateNow, 1);
    const dueTransactions = await getDueTransactionCountPerUser(oneHourAgo, dateNow);
    if (dueTransactions == null || dueTransactions.length == 0) {
      return json({ done: true });
    }

    const userIdDueTransactionCountMap = new Map<string, number>();
    dueTransactions.forEach((transaction) => {
      if (!userIdDueTransactionCountMap.has(transaction.userId)) {
        userIdDueTransactionCountMap.set(transaction.userId, transaction._count.userId);
      }
    });

    const notificationTokens = await getNotificationTokens(
      dueTransactions.map((m) => m.userId)
    );
    if (notificationTokens == null || notificationTokens.length == 0) {
      return json({ noTokens: true });
    }

    if (getApps().length == 0) {
      initializeApp({
        credential: cert(JSON.parse(process.env.FIREBASE_ADMIN_KEY!)),
      });
    }

    const notificationsSent = await sendNotificationsInBatches(
      notificationTokens,
      userIdDueTransactionCountMap,
      oneHourAgo,
      dateNow
    );

    return json({ notificationsSent });
  } catch (error) {
    logError(error);
    return json({ error });
  }
};

async function sendNotificationsInBatches(
  allNotificationTokens: NotificationToken[],
  userIdDueTransactionCountMap: Map<string, number>,
  startDate: Date,
  endDate: Date
) {
  try {
    const notificationTokenBatches = [...getBatch(allNotificationTokens, 500)];
    for (const notificationTokens of notificationTokenBatches) {
      const messages: Message[] = [];
      for (const notificationToken of notificationTokens) {
        const pendingDueCount = userIdDueTransactionCountMap.get(
          notificationToken.userId
        );
        if (pendingDueCount == null || pendingDueCount == 0) continue;
        messages.push({
          data: {
            title:
              pendingDueCount > 1 ? `${pendingDueCount} Payments due` : "1 Payment due",
            body: "Tap here to check your pending payments",
          },
          token: notificationToken.token,
        });
      }

      const batchResponse = await getMessaging().sendEach(messages);
      if (batchResponse.failureCount > 0) {
        let invalidTokens: string[] = [];
        let index = 0;
        for (const response of batchResponse.responses) {
          if (response.error?.code == "messaging/registration-token-not-registered") {
            invalidTokens.push(notificationTokens[index].token);
          } else {
            console.log(response.error?.toJSON());
          }
          index += 1;
        }

        invalidTokens.length && (await deleteInvalidTokens(invalidTokens));
      }

      if (batchResponse.successCount > 0) {
        const notifiedUsers = new Set<string>();
        let index = 0;
        for (const response of batchResponse.responses) {
          if (response.success) {
            notifiedUsers.add(notificationTokens[index].userId);
          }
          index += 1;
        }

        console.log("Notified users: ", Array.from(notifiedUsers));

        notifiedUsers.size &&
          (await markAsNotified(Array.from(notifiedUsers.values()), startDate, endDate));
      }
    }
    return true;
  } catch (error) {
    logError(error);
    return false;
  }
}
