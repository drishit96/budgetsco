import { ActionFunction } from "@remix-run/node";
import { EventNames } from "~/lib/anaytics.contants";
import { parseCurrencyPreferenceInput } from "~/modules/settings/settings.schema";
import { updateCurrencyPreference } from "~/modules/settings/settings.service";
import { trackEvent, trackUserProfileUpdate } from "~/utils/analytics.utils.server";
import { getSessionData } from "~/utils/auth.utils.server";
import { logError } from "~/utils/logger.utils.server";
import { isNullOrEmpty } from "~/utils/text.utils";

export let action: ActionFunction = async ({ request }) => {
  try {
    const sessionData = await getSessionData(request);
    if (sessionData == null || sessionData.userId == null) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId, currency: oldCurrency } = sessionData;

    if (request.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    const body = await request.json();

    const { errors, userPreferences } = parseCurrencyPreferenceInput({
      currency: body.currency,
    });
    if (errors) {
      return Response.json({ error: errors }, { status: 400 });
    }

    if (isNullOrEmpty(userPreferences.currency)) {
      return { success: true };
    }

    await updateCurrencyPreference(userId, userPreferences.currency);
    trackEvent(request, EventNames.CURRENCY_CHANGED, {
      oldCurrency: oldCurrency ?? "Not set",
      newCurrency: userPreferences.currency,
    });
    trackUserProfileUpdate({
      request,
      updateType: "set",
      data: { currency: userPreferences.currency },
    });

    return { success: true };
  } catch (error) {
    logError(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
};
