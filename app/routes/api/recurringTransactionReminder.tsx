import crypto from "crypto";
import type { NotificationToken } from "~/generated/prisma/client";
import type { LoaderFunction } from "react-router";
import { subHours } from "date-fns";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import type { Message } from "firebase-admin/messaging";
import {
  getDueTransactionCountPerUser,
  markAsNotified,
} from "~/modules/recurring/recurring.service";
import { deleteInvalidTokens, getNotificationTokens } from "~/modules/user/user.service";
import { getBatch } from "~/utils/array.utils";
import { logError, logWarn } from "~/utils/logger.utils.server";

let cachedExpectedHash: Buffer | null = null;

function getExpectedHash(): Buffer | null {
  if (!cachedExpectedHash && process.env.CRON_SECRET) {
    cachedExpectedHash = crypto
      .createHash("sha256")
      .update(process.env.CRON_SECRET)
      .digest();
  }
  return cachedExpectedHash;
}

function isAuthorizedCronRequest(request: Request): boolean {
  const expectedHash = getExpectedHash();
  if (!expectedHash) {
    logWarn("Recurring reminder cron rejected: CRON_SECRET is not configured");
    return false;
  }

  const providedToken = request.headers.get("x-cron-key")?.trim();
  if (!providedToken) {
    logWarn("Recurring reminder cron rejected: missing x-cron-key header");
    return false;
  }

  const providedHash = crypto.createHash("sha256").update(providedToken).digest();
  return crypto.timingSafeEqual(providedHash, expectedHash);
}

export let loader: LoaderFunction = async ({ request }): Promise<any> => {
  try {
    if (request.method !== "GET") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    if (!isAuthorizedCronRequest(request)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dateNow = new Date();
    const oneHourAgo = subHours(dateNow, 1);
    const dueTransactions = await getDueTransactionCountPerUser(oneHourAgo, dateNow);
    if (dueTransactions == null || dueTransactions.length == 0) {
      return Response.json({ done: true });
    }

    const userIdDueTransactionCountMap = new Map<string, number>();
    dueTransactions.forEach((transaction) => {
      if (!userIdDueTransactionCountMap.has(transaction.userId)) {
        userIdDueTransactionCountMap.set(transaction.userId, transaction._count.userId);
      }
    });

    const notificationTokens = await getNotificationTokens(
      dueTransactions.map((m) => m.userId),
    );
    if (notificationTokens == null || notificationTokens.length == 0) {
      return Response.json({ noTokens: true });
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
      dateNow,
    );

    return Response.json({ notificationsSent });
  } catch (error) {
    logError(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
};

async function sendNotificationsInBatches(
  allNotificationTokens: NotificationToken[],
  userIdDueTransactionCountMap: Map<string, number>,
  startDate: Date,
  endDate: Date,
) {
  try {
    const notificationTokenBatches = [...getBatch(allNotificationTokens, 500)];
    for (const notificationTokens of notificationTokenBatches) {
      const messages: Message[] = [];
      for (const notificationToken of notificationTokens) {
        const pendingDueCount = userIdDueTransactionCountMap.get(
          notificationToken.userId,
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
