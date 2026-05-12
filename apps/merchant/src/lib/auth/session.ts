import "server-only";

import {
  ConfirmForgotPasswordCommand,
  CognitoIdentityProviderClient,
  ForgotPasswordCommand,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { cookies } from "next/headers";

import {
  createSession,
  extractUserClaims,
  loadActiveSessionRecord,
  terminateSession,
  verifyCognitoIdToken,
  type CreatedSession,
} from "@correcre/lib/auth/session-store";
import { evaluateSessionToken } from "@correcre/lib/auth/session-validate";
import { verifySessionToken } from "@correcre/lib/auth/session-token";
import { updateMerchantUserLastLoginAtByCognitoSub } from "@correcre/lib/dynamodb/merchant-user";
import { readRequiredServerEnv } from "@correcre/lib/env/server";

import { MERCHANT_NEW_PASSWORD_CHALLENGE_COOKIE_NAME, MERCHANT_SESSION_COOKIE_NAME } from "./constants";
import { getMerchantCognitoConfig } from "./config";
import type { MerchantSession } from "./verify-token";

const cognitoClientCache = new Map<string, CognitoIdentityProviderClient>();
const NEW_PASSWORD_CHALLENGE_COOKIE_TTL_MS = 10 * 60 * 1000;

export type PendingNewPasswordChallenge = {
  email: string;
  username: string;
  session: string;
};

type SignInMerchantResult =
  | {
      status: "authenticated";
      session: MerchantSession;
    }
  | {
      status: "new_password_required";
    };

function getCognitoClient(region: string) {
  const cached = cognitoClientCache.get(region);

  if (cached) {
    return cached;
  }

  const client = new CognitoIdentityProviderClient({ region });
  cognitoClientCache.set(region, client);
  return client;
}

async function syncMerchantLastLoginAt(cognitoSub: string) {
  const trimmed = cognitoSub.trim();

  if (!trimmed) {
    return;
  }

  const updatedUser = await updateMerchantUserLastLoginAtByCognitoSub(
    {
      region: readRequiredServerEnv("AWS_REGION"),
      tableName: readRequiredServerEnv("DDB_MERCHANT_USER_TABLE_NAME"),
    },
    trimmed,
  );

  if (!updatedUser) {
    console.warn("Merchant sign-in completed but no matching MerchantUser record was found for Cognito sub.");
  }
}

async function setMerchantSessionCookie(created: CreatedSession) {
  const cookieStore = await cookies();

  cookieStore.set({
    name: MERCHANT_SESSION_COOKIE_NAME,
    value: created.token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: created.cookieExpiresAt,
  });
}

function encodePendingNewPasswordChallenge(challenge: PendingNewPasswordChallenge) {
  return Buffer.from(JSON.stringify(challenge), "utf8").toString("base64url");
}

function decodePendingNewPasswordChallenge(value: string): PendingNewPasswordChallenge | null {
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));

    if (
      typeof parsed?.email !== "string" ||
      typeof parsed?.username !== "string" ||
      typeof parsed?.session !== "string"
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

async function setPendingNewPasswordChallenge(challenge: PendingNewPasswordChallenge) {
  const cookieStore = await cookies();

  cookieStore.set({
    name: MERCHANT_NEW_PASSWORD_CHALLENGE_COOKIE_NAME,
    value: encodePendingNewPasswordChallenge(challenge),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(Date.now() + NEW_PASSWORD_CHALLENGE_COOKIE_TTL_MS),
  });
}

export async function clearPendingNewPasswordChallenge() {
  const cookieStore = await cookies();

  cookieStore.set({
    name: MERCHANT_NEW_PASSWORD_CHALLENGE_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });
}

export async function getPendingNewPasswordChallenge(): Promise<PendingNewPasswordChallenge | null> {
  const cookieStore = await cookies();
  const encodedChallenge = cookieStore.get(MERCHANT_NEW_PASSWORD_CHALLENGE_COOKIE_NAME)?.value;

  if (!encodedChallenge) {
    return null;
  }

  return decodePendingNewPasswordChallenge(encodedChallenge);
}

async function clearMerchantSessionCookie() {
  const cookieStore = await cookies();

  cookieStore.set({
    name: MERCHANT_SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });
}

export async function clearMerchantSession() {
  const cookieStore = await cookies();
  const existingToken = cookieStore.get(MERCHANT_SESSION_COOKIE_NAME)?.value;

  if (existingToken) {
    const payload = await verifySessionToken(existingToken);

    if (payload?.sid) {
      try {
        await terminateSession(payload.sid);
      } catch (error) {
        console.warn("Failed to delete merchant session record on logout.", error);
      }
    }
  }

  await clearMerchantSessionCookie();
  await clearPendingNewPasswordChallenge();
}

async function establishMerchantSession(params: { idToken: string; rememberMe: boolean }): Promise<MerchantSession> {
  const { clientId, issuer } = getMerchantCognitoConfig();
  const verification = await verifyCognitoIdToken({
    idToken: params.idToken,
    issuer,
    audience: clientId,
  });

  if (!verification) {
    const error = new Error("Failed to verify the ID token returned by Cognito.");
    error.name = "InvalidIdToken";
    throw error;
  }

  const userClaims = extractUserClaims(verification.claims);

  if (!userClaims) {
    const error = new Error("Cognito ID token did not contain a usable subject claim.");
    error.name = "InvalidIdToken";
    throw error;
  }

  const created = await createSession({
    role: "MERCHANT",
    claims: userClaims,
    rememberMe: params.rememberMe,
  });

  await setMerchantSessionCookie(created);
  await syncMerchantLastLoginAt(userClaims.cognitoSub);

  const evaluation = evaluateSessionToken(created.payload);

  if (evaluation.status === "expired") {
    throw new Error(`Newly issued session was already considered expired (${evaluation.reason}).`);
  }

  return evaluation.session;
}

export async function signInMerchant(params: {
  email: string;
  password: string;
  rememberMe?: boolean;
}): Promise<SignInMerchantResult> {
  const { region, clientId } = getMerchantCognitoConfig();
  const cognitoClient = getCognitoClient(region);
  await clearPendingNewPasswordChallenge();

  const response = await cognitoClient.send(
    new InitiateAuthCommand({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: clientId,
      AuthParameters: {
        USERNAME: params.email,
        PASSWORD: params.password,
      },
    }),
  );

  if (response.ChallengeName === "NEW_PASSWORD_REQUIRED") {
    const challengeSession = response.Session;

    if (!challengeSession) {
      const error = new Error("Cognito did not return a challenge session.");
      error.name = "MissingChallengeSession";
      throw error;
    }

    await setPendingNewPasswordChallenge({
      email: params.email,
      username: response.ChallengeParameters?.USER_ID_FOR_SRP ?? params.email,
      session: challengeSession,
    });

    return { status: "new_password_required" };
  }

  const idToken = response.AuthenticationResult?.IdToken;

  if (!idToken) {
    const error = new Error("Cognito did not return an ID token.");
    error.name = "MissingIdToken";
    throw error;
  }

  const session = await establishMerchantSession({ idToken, rememberMe: params.rememberMe ?? false });
  return { status: "authenticated", session };
}

export async function getMerchantSession(): Promise<MerchantSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(MERCHANT_SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const payload = await verifySessionToken(token);

  if (!payload || payload.role !== "MERCHANT") {
    return null;
  }

  const evaluation = evaluateSessionToken(payload);

  if (evaluation.status === "expired") {
    return null;
  }

  const record = await loadActiveSessionRecord(payload.sid);

  if (!record) {
    return null;
  }

  return evaluation.session;
}

export async function requestMerchantPasswordReset(params: { email: string }) {
  const { region, clientId } = getMerchantCognitoConfig();
  const cognitoClient = getCognitoClient(region);

  await cognitoClient.send(
    new ForgotPasswordCommand({
      ClientId: clientId,
      Username: params.email,
    }),
  );
}

export async function confirmMerchantPasswordReset(params: { email: string; confirmationCode: string; newPassword: string }) {
  const { region, clientId } = getMerchantCognitoConfig();
  const cognitoClient = getCognitoClient(region);

  await cognitoClient.send(
    new ConfirmForgotPasswordCommand({
      ClientId: clientId,
      Username: params.email,
      ConfirmationCode: params.confirmationCode,
      Password: params.newPassword,
    }),
  );
}

export async function completeMerchantNewPassword(params: {
  newPassword: string;
  rememberMe?: boolean;
}) {
  const challenge = await getPendingNewPasswordChallenge();

  if (!challenge) {
    const error = new Error("Pending new password challenge not found.");
    error.name = "NewPasswordChallengeExpired";
    throw error;
  }

  const { region, clientId } = getMerchantCognitoConfig();
  const cognitoClient = getCognitoClient(region);

  const response = await cognitoClient.send(
    new RespondToAuthChallengeCommand({
      ChallengeName: "NEW_PASSWORD_REQUIRED",
      ClientId: clientId,
      Session: challenge.session,
      ChallengeResponses: {
        USERNAME: challenge.username,
        NEW_PASSWORD: params.newPassword,
      },
    }),
  );

  const idToken = response.AuthenticationResult?.IdToken;

  if (!idToken) {
    const error = new Error("Cognito did not return an ID token after new password challenge.");
    error.name = "MissingIdToken";
    throw error;
  }

  const session = await establishMerchantSession({ idToken, rememberMe: params.rememberMe ?? false });
  await clearPendingNewPasswordChallenge();

  return session;
}
