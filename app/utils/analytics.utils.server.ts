import type { Event } from "mixpanel";
import { init } from "mixpanel";
import { getSessionData } from "./auth.utils.server";
import { logError } from "./logger.utils.server";

export type UserProfileUpdateParams =
  | {
      request: Request;
      updateType: "set";
      data: { [key: string]: string };
    }
  | { request: Request; updateType: "unset"; data: string[] };

const mixpanel = init(process.env.MIXPANEL_TOKEN!);
let batch: Event[] = [];

setInterval(() => sendTrackedEvents(), 5000);

export async function trackEvent(
  request: Request,
  eventName: string,
  data?: { [key: string]: string },
  userId?: string
) {
  try {
    const sessionData = await getSessionData(request);
    const collectAnalytics = sessionData?.collectAnalytics;
    userId = userId ?? sessionData?.userId;
    if (userId == null || collectAnalytics === false) return;

    const ip = request.headers.get("Fly-Client-IP");
    batch.push({ event: eventName, properties: { distinct_id: userId, ip, ...data } });

    if (batch.length < 500) return;
    sendTrackedEvents();
  } catch (error) {
    logError(error);
  }
}

export async function trackUserProfileUpdate(params: UserProfileUpdateParams) {
  try {
    if (params.data == null) return;
    const sessionData = await getSessionData(params.request);
    if (sessionData == null) return;
    const { userId, collectAnalytics } = sessionData;
    if (collectAnalytics === false) return;

    params.updateType === "set" && mixpanel.people.set(userId, params.data);
    params.updateType === "unset" && mixpanel.people.unset(userId, params.data);

    const ip = params.request.headers.get("Fly-Client-IP");
    mixpanel.people.set_once(userId, { ip });
  } catch (error) {
    logError(error);
  }
}

function sendTrackedEvents() {
  try {
    if (batch.length == 0) return;
    mixpanel.track_batch(batch, (error) => {
      batch = [];
      if (error == null) return;
      logError(error[0]);
    });
  } catch (error) {
    logError(error);
  }
}
