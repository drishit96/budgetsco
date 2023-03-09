import { DBErrorDescriptions, DBErrors } from "~/lib/error.constant";
import { logError } from "~/utils/logger.utils.server";
import prisma from "../../lib/prisma";

export async function createUser(id: string, emailId: string) {
  try {
    await prisma.user.create({
      data: {
        id,
        emailId,
      },
    });
    return { success: true };
  } catch (error: any) {
    logError(error);
    if (error.code === DBErrors.P2002) {
      return {
        success: false,
        error: DBErrorDescriptions.P2002_DUPLICATE_EMAIL,
      };
    }
    return { success: false, error: DBErrorDescriptions.UNKNOWN };
  }
}

export async function saveNotificationToken(userId: string, notificationToken: string) {
  try {
    await prisma.notificationToken.create({
      data: {
        userId,
        token: notificationToken,
      },
    });
    return true;
  } catch (error) {
    logError(error);
    return false;
  }
}

export async function getNotificationTokens(userIds: string[]) {
  try {
    if (userIds == null || userIds.length == 0) return [];
    const notificationTokens = await prisma.notificationToken.findMany({
      where: { userId: { in: userIds } },
    });
    return notificationTokens;
  } catch (error) {
    logError(error);
    return [];
  }
}

export async function deleteInvalidTokens(tokens: string[]) {
  try {
    const { count: deletedCount } = await prisma.notificationToken.deleteMany({
      where: { token: { in: tokens } },
    });
    return deletedCount;
  } catch (error) {
    logError(error);
    return 0;
  }
}
