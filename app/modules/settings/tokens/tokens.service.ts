import { logError } from "~/utils/logger.utils.server";
import prisma from "../../../lib/prisma";
import * as argon2 from "argon2";
import { nanoid } from "nanoid";
import { isNullOrEmpty } from "~/utils/text.utils";

const INVALID_HASH = await argon2.hash("");

export async function createPersonalAccessToken(
  userId: string,
  name: string,
  expiresAt: Date,
  permissions: any
) {
  try {
    const [tokenId, token] = generateToken();
    const tokenHash = await argon2.hash(token);
    await prisma.personalAccessToken.create({
      data: {
        id: tokenId,
        userId,
        token: tokenHash,
        name,
        expiresAt,
        permissions,
      },
    });
    return { success: true, token: token };
  } catch (error) {
    logError(error);
    return { success: false, token: null };
  }
}

/**
 * Deletes a personal access token for a specified user.
 *
 * @param userId - The ID of the user whose personal access token is to be deleted.
 * @param tokenId - The ID of the personal access token to be deleted.
 * @returns A promise that resolves to true if the token was successfully deleted, or false if an error occurs.
 */

export async function deletePersonalAccessToken(userId: string, tokenId: string) {
  try {
    await prisma.personalAccessToken.deleteMany({
      where: {
        id: tokenId,
        userId,
      },
    });
    return true;
  } catch (error) {
    logError(error);
    return false;
  }
}

/**
 * Retrieves all personal access tokens for a given user, ordered by creation date in descending order.
 *
 * @param userId - The ID of the user whose personal access tokens are to be retrieved.
 * @returns A promise that resolves to an array of PersonalAccessToken objects or an empty array if an error occurs.
 */

export async function getAllPersonalAccessTokens(userId: string) {
  try {
    const tokens = await prisma.personalAccessToken.findMany({
      where: {
        userId,
      },
      select: {
        id: true,
        name: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return tokens;
  } catch (error) {
    logError(error);
    return [];
  }
}

export async function getPersonalAccessTokenById(userId: string, tokenId: string) {
  try {
    const token = await prisma.personalAccessToken.findUnique({
      where: {
        id: tokenId,
        userId,
      },
      select: {
        id: true,
        name: true,
        expiresAt: true,
        createdAt: true,
        permissions: true,
      },
    });
    return token;
  } catch (error) {
    logError(error);
    return null;
  }
}

/**
 * Retrieves user details based on a provided personal access token.
 *
 * @param token - The personal access token string to validate
 * @returns A Promise that resolves to either:
 *          - User details object containing id, emailId, userPreference and permissions if token is valid
 *          - null if token is invalid, expired or verification fails
 *
 * @throws Will return null if database query fails or other errors occur
 *
 * The function:
 * 1. Extracts token ID from the token string
 * 2. Queries database for unexpired token
 * 3. Verifies token hash using argon2
 * 4. Returns associated user details if verification succeeds
 */
export async function getUserByToken(token: string) {
  try {
    const tokenId = getIdFromToken(token);
    const result = await prisma.personalAccessToken.findFirst({
      where: {
        id: tokenId,
        expiresAt: { gt: new Date() },
      },
      select: {
        token: true,
        expiresAt: true,
        user: {
          select: {
            id: true,
            emailId: true,
            userPreference: true,
          },
        },
        permissions: true,
      },
    });

    let isValid = true;
    isValid &&= await argon2.verify(result?.token || INVALID_HASH, token);

    if (!isValid || !result) {
      return null;
    }

    const userDetails = { ...result.user, permissions: result.permissions };
    return userDetails || null;
  } catch (error) {
    logError(error);
    return null;
  }
}

/**
 * Generates a secure random token. The token is a 64-character long hex string
 * that is prefixed with "budgetsco_pat_". The token is suitable for use as a
 * Personal Access Token.
 *
 * @returns A secure random token.
 */
function generateToken(): [string, string] {
  const tokenId = nanoid(12);
  const token = nanoid(64);
  return [tokenId, `budgetsco_pat_${tokenId}_${token}`];
}

function getIdFromToken(token: string): string {
  if (isNullOrEmpty(token) || !token.startsWith("budgetsco_pat_")) {
    throw new Error("Invalid token");
  }
  const parts = token.split("_");
  if (parts.length < 4) {
    throw new Error("Invalid token");
  }
  return parts[2];
}

export async function updatePersonalAccessToken(
  userId: string,
  tokenId: string,
  name: string,
  expiresAt: Date,
  permissions: any
) {
  try {
    await prisma.personalAccessToken.update({
      where: {
        id: tokenId,
        userId,
      },
      data: {
        name,
        expiresAt,
        permissions,
      },
    });
    return true;
  } catch (error) {
    logError(error);
    return false;
  }
}
