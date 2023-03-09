import type { UserPreferenceInput, UserPreferenceResponse } from "./settings.schema";
import { parseUserPreferenceResponse } from "./settings.schema";
import prisma from "../../lib/prisma";
import { getCustomCategories } from "../transaction/transaction.service";

export async function getUserPreferences(userId: string) {
  const userPreferences = await prisma.userPreference.findUnique({
    where: { userId },
  });
  return userPreferences == null ? null : parseUserPreferenceResponse(userPreferences);
}

export async function saveUserPreferences(
  userId: string,
  userPreferences: UserPreferenceInput
) {
  try {
    if (Object.getOwnPropertyNames(userPreferences).length == 0) return 0;
    const currentTime = new Date().getTime();
    await prisma.userPreference.upsert({
      where: { userId },
      create: {
        userId,
        ...userPreferences,
        lastModified: currentTime,
      },
      update: { ...userPreferences, lastModified: currentTime },
    });
    return currentTime;
  } catch (error) {
    console.log(error);
    return 0;
  }
}

export async function getUserPreferencesAfterTimestamp(
  timestamp: number,
  userId: string
): Promise<
  | (UserPreferenceResponse & { customCategories: { [key: string]: string[] } | null })
  | null
> {
  const userPreferences = await prisma.userPreference.findFirst({
    where: { userId, lastModified: { gt: timestamp } },
  });
  if (userPreferences == null) return null;
  const userPreferencesResponse = parseUserPreferenceResponse(userPreferences);
  const customCategories = await getCustomCategories(userId);
  return {
    ...userPreferencesResponse,
    customCategories,
  };
}

export async function updatePaymentStatusInPreferences(
  userId: string,
  paymentGateway: "GPB" | "STR",
  isActiveSubscription: boolean
) {
  try {
    const currentTime = new Date().getTime();
    await prisma.userPreference.update({
      data: { paymentGateway, isActiveSubscription, lastModified: currentTime },
      where: { userId },
    });
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
}

export async function updateCurrencyPreference(userId: string, currency: string) {
  try {
    const currentTime = new Date().getTime();
    await prisma.userPreference.update({
      data: { currency, lastModified: currentTime },
      where: { userId },
    });
    return currentTime;
  } catch (error) {
    console.log(error);
    return 0;
  }
}

export async function updateIsMFAOnPreference(userId: string, isMFAOn: boolean) {
  try {
    const currentTime = new Date().getTime();
    await prisma.userPreference.update({
      data: { isMFAOn, lastModified: currentTime },
      where: { userId },
    });
    return currentTime;
  } catch (error) {
    console.log(error);
    return 0;
  }
}

export async function saveBrowserPreferences(
  userId: string,
  timezone: string,
  locale: string
) {
  try {
    const currentTime = new Date().getTime();
    await prisma.userPreference.upsert({
      create: { userId, timezone, locale, lastModified: currentTime },
      update: { timezone, locale, lastModified: currentTime },
      where: { userId },
    });
    return currentTime;
  } catch (error) {
    console.log(error);
    return 0;
  }
}
