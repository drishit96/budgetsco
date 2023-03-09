import prisma from "../../../lib/prisma";
import crypto from "crypto";
import { logError } from "~/utils/logger.utils.server";
import { verifyAuthenticatorToken } from "~/utils/auth.utils.server";
import { base64ToBuffer, bufferToBase64 } from "~/utils/text.utils";
import { updateIsMFAOnPreference } from "../settings.service";

export async function encryptAndSaveMFASecret(userId: string, secret: string) {
  try {
    const encoder = new TextEncoder();
    const iv = crypto.webcrypto.getRandomValues(new Uint8Array(16));
    const key = await get2FASecret();

    const encryptedSecret = await crypto.webcrypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      key,
      encoder.encode(secret)
    );

    await Promise.allSettled([
      updateIsMFAOnPreference(userId, true),
      prisma.user.update({
        where: { id: userId },
        data: { mfaSecret: bufferToBase64(encryptedSecret) + "$$" + bufferToBase64(iv) },
      }),
    ]);

    return true;
  } catch (error) {
    logError(error);
  }
}

export async function verify2FAToken(userId: string, token: string) {
  try {
    const data = await prisma.user.findUnique({
      where: { id: userId },
      select: { mfaSecret: true },
    });
    if (data == null || data.mfaSecret == null) return false;

    const decoder = new TextDecoder();
    const key = await get2FASecret();
    const [secret, iv] = data.mfaSecret.split("$$");

    const decryptedSecret = await crypto.webcrypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64ToBuffer(iv) },
      key,
      base64ToBuffer(secret)
    );

    return verifyAuthenticatorToken(token, decoder.decode(decryptedSecret));
  } catch (error) {
    logError(error);
  }
}

export async function disable2FA(userId: string) {
  try {
    await Promise.allSettled([
      updateIsMFAOnPreference(userId, false),
      prisma.user.update({
        where: { id: userId },
        data: { mfaSecret: undefined },
      }),
    ]);
  } catch (error) {
    logError(error);
  }
}

function get2FASecret() {
  const encoder = new TextEncoder();
  return crypto.webcrypto.subtle.importKey(
    "raw",
    encoder.encode(process.env.MFA_KEY!),
    "AES-GCM",
    true,
    ["encrypt", "decrypt"]
  );
}
