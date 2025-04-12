import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { randomUUID } from "crypto";
import { logError } from "~/utils/logger.utils.server";
import { isNullOrEmpty } from "~/utils/text.utils";
import { updateIsPasskeyPresentPreference } from "../settings.service";
import prisma from "../../../lib/prisma";

const RP_NAME = "budgetsco";
// const RP_ID = "localhost";
// const origin = `http://${RP_ID}:3000`;
const RP_ID = "budgetsco.fly.dev";
const origin = "https://budgetsco.fly.dev";

setInterval(async () => {
  //delete passkey challenges older than 2 minutes
  try {
    const { count } = await prisma.passkeyChallenge.deleteMany({
      where: {
        createdAt: {
          lt: Date.now() - 2 * 60 * 1000,
        },
      },
    });
    if (count > 0) {
      console.log(`Deleted ${count} passkey challenges`);
    }
  } catch (error) {
    logError(error);
  }
}, 60000);

export async function getAllPasskeys(userId: string) {
  try {
    return await prisma.passkey.findMany({
      where: {
        userId,
      },
      select: {
        id: true,
        createdAt: true,
        displayName: true,
        lastUsed: true,
      },
    });
  } catch (error) {
    logError(error);
    return [];
  }
}

export async function updatePasskeyDisplayName(
  userId: string,
  passkeyId: string,
  displayName: string
) {
  try {
    if (isNullOrEmpty(displayName)) return false;
    await prisma.passkey.update({
      where: {
        id: passkeyId,
        userId,
      },
      data: {
        displayName,
      },
    });
    return true;
  } catch (error) {
    logError(error);
    return false;
  }
}

export async function deletePasskey(userId: string, passkeyId: string) {
  try {
    const deletedPasskey = await prisma.passkey.delete({
      where: {
        id: passkeyId,
        userId,
      },
    });
    if (deletePasskey == null) return false;
    await prisma.passkeyTransport.deleteMany({
      where: {
        id: deletedPasskey.id,
      },
    });

    const passkeyCount = await prisma.passkey.count({ where: { userId } });
    if (passkeyCount === 0) {
      await updateIsPasskeyPresentPreference(userId, false);
    }

    return true;
  } catch (error) {
    logError(error);
    return false;
  }
}

export async function getRegistrationOptions(
  userId: string,
  emailId: string | undefined
) {
  try {
    const userPasskeys = await prisma.passkey.findMany({
      select: {
        id: true,
        transports: { select: { transport: true } },
      },
      where: {
        userId,
      },
    });

    const registrationOptions = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: RP_ID,
      userName: emailId ?? userId,
      attestationType: "none",
      excludeCredentials: userPasskeys.map((passkey) => ({
        id: passkey.id,
        transports: passkey.transports.map(
          (t) => t.transport
        ) as AuthenticatorTransport[],
      })),
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
      },
    });

    await prisma.passkeyChallenge.create({
      data: {
        webAuthnUserID: registrationOptions.user.id,
        userId: userId,
        challenge: registrationOptions.challenge,
        createdAt: Date.now(),
      },
    });

    return registrationOptions;
  } catch (error) {
    logError(error);
    return null;
  }
}

export async function verifyRegistration(userId: string, body: RegistrationResponseJSON) {
  try {
    const passkeyChallenge = await prisma.passkeyChallenge.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    if (passkeyChallenge == null) return false;
    const { webAuthnUserID, challenge } = passkeyChallenge;

    const verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: RP_ID,
      requireUserVerification: true,
    });

    if (verification.verified === false) return false;

    const { registrationInfo } = verification;
    if (registrationInfo == null) return false;

    const { credential, credentialDeviceType, credentialBackedUp } = registrationInfo;

    const passkey = {
      userId,
      webAuthnUserID,
      id: credential.id,
      publicKey: Buffer.from(credential.publicKey),
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      createdAt: Date.now(),
    };

    const passkeyTransports =
      credential.transports?.map((t) => ({
        transport: t.toString(),
        id: credential.id,
      })) ?? [];

    await Promise.allSettled([
      prisma.passkey.create({ data: passkey }),
      prisma.passkeyTransport.createMany({ data: passkeyTransports }),
      prisma.passkeyChallenge.delete({ where: { webAuthnUserID } }),
      updateIsPasskeyPresentPreference(userId, true),
    ]);

    return verification.verified;
  } catch (error) {
    logError(error);
    return false;
  }
}

export async function getAuthenticationOptions() {
  try {
    const authenticationOptions = await generateAuthenticationOptions({
      rpID: RP_ID,
    });

    const webAuthnUserID = randomUUID();
    await prisma.passkeyChallenge.create({
      data: {
        webAuthnUserID,
        challenge: authenticationOptions.challenge,
        createdAt: Date.now(),
      },
    });

    return { webAuthnUserID, authenticationOptions };
  } catch (error) {
    logError(error);
    return null;
  }
}

export async function verifyPasskey(
  webAuthnUserID: string,
  body: AuthenticationResponseJSON
) {
  try {
    const passkey = await prisma.passkey.findUnique({
      where: { id: body.id },
      select: {
        id: true,
        userId: true,
        publicKey: true,
        transports: { select: { transport: true } },
      },
    });
    if (passkey == null) return null;

    const passkeyChallenge = await prisma.passkeyChallenge.findFirst({
      where: { webAuthnUserID },
      select: { challenge: true },
      orderBy: { createdAt: "desc" },
    });
    if (passkeyChallenge == null) return null;
    const { challenge } = passkeyChallenge;

    const verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: RP_ID,
      credential: {
        id: passkey.id,
        publicKey: passkey.publicKey,
        counter: 0,
        transports: passkey.transports.map(
          (t) => t.transport
        ) as AuthenticatorTransport[],
      },
    });

    const tasks: Promise<any>[] = [
      prisma.passkeyChallenge.delete({ where: { webAuthnUserID } }),
    ];
    if (verification.verified) {
      tasks.push(
        prisma.passkey.update({
          where: { id: passkey.id },
          data: {
            lastUsed: Date.now(),
          },
        })
      );
    }

    await Promise.allSettled(tasks);

    return verification.verified ? passkey.userId : null;
  } catch (error) {
    logError(error);
    return null;
  }
}
