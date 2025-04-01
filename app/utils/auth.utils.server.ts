import { cert, initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { createCookie } from "@remix-run/node";
import type { UserPreferenceResponse } from "~/modules/settings/settings.schema";
import { authenticator } from "otplib";
import { logError } from "./logger.utils.server";

function initializeFirebaseApp() {
  try {
    if (getApps().length == 0) {
      initializeApp({
        credential: cert(JSON.parse(process.env.FIREBASE_ADMIN_KEY!)),
      });
    }
  } catch (error) {
    logError(error);
  }
}

export async function getUserIdFromSession(request: Request) {
  const sessionData = await getSessionData(request);
  return sessionData?.userId;
}

export function getSessionCookieBuilder() {
  const cookieOptions: any = {
    expires: new Date(Date.now() + 432_000_000),
    httpOnly: true,
    maxAge: 432_000,
    path: "/",
    sameSite: "strict",
    secrets: [process.env.COOKIE_SECRET!],
    secure: true,
  };

  // Temp fix for webkit based browsers not able to set cookie
  // with sameSite: "strict" and secure: true options in localhost
  if (process.env.NODE_ENV !== "production") {
    delete cookieOptions.sameSite;
    delete cookieOptions.secure;
  }

  return createCookie("__session", cookieOptions);
}

export function getPartialSessionCookieBuilder() {
  return createCookie("__partial_session", {
    expires: new Date(Date.now() + 90_000),
    httpOnly: true,
    maxAge: 90,
    path: "/",
    sameSite: "strict",
    secrets: [process.env.COOKIE_SECRET!],
    secure: true,
  });
}

export function getPasskeyPartialSessionCookieBuilder() {
  return createCookie("__passkey_partial_session", {
    expires: new Date(Date.now() + 90_000),
    httpOnly: true,
    maxAge: 90,
    path: "/",
    sameSite: "strict",
    secrets: [process.env.COOKIE_SECRET!],
    secure: true,
  });
}

type SessionCookie = {
  session: string;
  prefs: UserPreferenceResponse;
};

export type UserSessionData = {
  userId: string;
  isEmailVerified?: boolean;
  emailId?: string;
  expiresOn: number;
} & UserPreferenceResponse & {
    updateLocalStore?: boolean;
    customCategories?: { [key: string]: string[] } | null;
  };

export async function getSessionData(request: Request): Promise<UserSessionData | null> {
  try {
    initializeFirebaseApp();
    const sessionCookie: SessionCookie = await getSessionCookieBuilder().parse(
      request.headers.get("Cookie")
    );
    if (sessionCookie == null) return null;
    const decodedToken = await getAuth().verifySessionCookie(sessionCookie.session);
    const userPreferences = sessionCookie.prefs;
    return {
      ...userPreferences,
      userId: decodedToken.uid,
      isEmailVerified: decodedToken.email_verified,
      emailId: decodedToken.email,
      expiresOn: decodedToken.exp,
    };
  } catch (error) {
    return null;
  }
}

export async function getUserDataFromIdToken(
  idToken: string,
  checkRevoked: boolean = false
) {
  initializeFirebaseApp();
  try {
    const decodedToken = await getAuth().verifyIdToken(idToken, checkRevoked);
    if (decodedToken == null) return null;
    return {
      userId: decodedToken.uid,
      emailId: decodedToken.email,
      isEmailVerified: decodedToken.email_verified,
      tokenExpiry: decodedToken.exp,
      isPasskeyLogin: decodedToken.isPasskeyLogin,
    };
  } catch (error) {
    console.log(error);
    return null;
  }
}

export async function getSessionCookie(
  idToken: string,
  userPreferences: UserPreferenceResponse
) {
  initializeFirebaseApp();
  const expiresIn = 60 * 60 * 24 * 5 * 1000;

  const session = await getAuth().createSessionCookie(idToken, {
    expiresIn,
  });

  return getSessionCookieBuilder().serialize({
    session,
    prefs: { ...userPreferences },
  });
}

export async function getUserPreferencesFromSessionCookie(request: Request) {
  initializeFirebaseApp();
  const sessionCookie: SessionCookie = await getSessionCookieBuilder().parse(
    request.headers.get("Cookie")
  );
  if (sessionCookie == null) return null;
  return sessionCookie.prefs;
}

export async function getSessionCookieWithUpdatedPreferences(
  request: Request,
  userPreferences: UserPreferenceResponse
) {
  initializeFirebaseApp();
  const sessionCookie: SessionCookie = await getSessionCookieBuilder().parse(
    request.headers.get("Cookie")
  );
  return getSessionCookieBuilder().serialize({
    session: sessionCookie.session,
    prefs: { ...userPreferences },
  });
}

type PartialSessionCookie = {
  userId: string;
  idToken: string;
};

export async function getPartialSessionCookie(userId: string, idToken: string) {
  return getPartialSessionCookieBuilder().serialize({
    userId,
    idToken,
  });
}

export async function getPasskeyPartialSessionCookie(webAuthnUserID: string) {
  return getPasskeyPartialSessionCookieBuilder().serialize({
    webAuthnUserID,
  });
}

export async function getPasskeyPartialSessionData(request: Request) {
  try {
    const partialSessionCookie: { webAuthnUserID: string } =
      await getPasskeyPartialSessionCookieBuilder().parse(request.headers.get("Cookie"));
    return partialSessionCookie;
  } catch (error) {
    return null;
  }
}

export async function getCustomToken(userId: string) {
  try {
    initializeFirebaseApp();
    return await getAuth().createCustomToken(userId, { isPasskeyLogin: true });
  } catch (error) {
    logError(error);
    return null;
  }
}

export async function getPartialSessionData(request: Request) {
  try {
    const partialSessionCookie: PartialSessionCookie =
      await getPartialSessionCookieBuilder().parse(request.headers.get("Cookie"));
    return partialSessionCookie;
  } catch (error) {
    return null;
  }
}

export async function generateAuthenticatorSecret(emailId: string) {
  const secret = authenticator.generateSecret();
  const uri = authenticator.keyuri(emailId, "budgetsco.fly.dev", secret);
  return { secret, uri };
}

export function verifyAuthenticatorToken(token: string, secret: string) {
  return authenticator.verify({ token, secret });
}
