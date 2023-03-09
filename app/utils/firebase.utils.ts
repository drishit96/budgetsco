import type { FirebaseApp } from "firebase/app";
import { initializeApp } from "firebase/app";
import { getMessaging, getToken, isSupported } from "firebase/messaging";
import {
  applyActionCode,
  confirmPasswordReset,
  createUserWithEmailAndPassword,
  getAuth,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { firebaseConfig, VAPID_KEY } from "~/lib/ui.config";

let app: FirebaseApp = initializeApp(firebaseConfig);

export function getClientAuth() {
  const auth = getAuth(app);
  setPersistence(auth, { type: "NONE" });
  return auth;
}

export async function createFirebaseUser(email: string, password: string) {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      getClientAuth(),
      email,
      password
    );

    const idToken = await userCredential.user.getIdToken();
    return { idToken };
  } catch (error: any) {
    return { error: error?.code as string };
  }
}

export async function signInUser(email: string, password: string) {
  try {
    const userCredential = await signInWithEmailAndPassword(
      getClientAuth(),
      email,
      password
    );

    const idToken = await userCredential.user.getIdToken();
    return { idToken };
  } catch (error: any) {
    return { error: error?.code as string };
  }
}

export async function sendVerificationEmail() {
  try {
    const currentUser = getClientAuth().currentUser;
    if (currentUser == null) return false;
    await sendEmailVerification(currentUser);
    return true;
  } catch (error) {
    return false;
  }
}

export async function verifyEmailCode(code: string) {
  try {
    await applyActionCode(getClientAuth(), code);
    return true;
  } catch (error) {
    return false;
  }
}

export async function regenerateUserIdToken() {
  return getClientAuth().currentUser?.getIdToken(true) ?? "";
}

export async function sendResetPasswordEmail(emailId: string) {
  try {
    await sendPasswordResetEmail(getClientAuth(), emailId);
    return { isEmailSent: true, error: null };
  } catch (error: any) {
    return { isEmailSent: false, error: error.code };
  }
}

export async function resetToNewPassword(code: string, newPassword: string) {
  try {
    await confirmPasswordReset(getClientAuth(), code, newPassword);
    return true;
  } catch (error) {
    return false;
  }
}

export async function getFCMRegistrationToken(): Promise<{
  token: string | null;
  error: any;
}> {
  try {
    const isNotificationSupported = await isSupported();
    if (!isNotificationSupported) return { token: null, error: null };

    const messaging = getMessaging();
    const serviceWorkerRegistration = await navigator.serviceWorker.getRegistration();
    const currentToken = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration,
    });
    return { token: currentToken, error: null };
  } catch (error) {
    console.log(error);
    return { token: null, error };
  }
}

export function isNotificationSupported() {
  return isSupported();
}
