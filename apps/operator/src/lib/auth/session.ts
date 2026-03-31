import "server-only";

import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { cookies } from "next/headers";

import { OPERATOR_NEW_PASSWORD_CHALLENGE_COOKIE_NAME, OPERATOR_SESSION_COOKIE_NAME } from "./constants";
import { getOperatorCognitoConfig } from "./config";
import { type OperatorSession, verifyOperatorIdToken } from "./verify-token";

const cognitoClientCache = new Map<string, CognitoIdentityProviderClient>();
const NEW_PASSWORD_CHALLENGE_COOKIE_TTL_MS = 10 * 60 * 1000;

export type PendingNewPasswordChallenge = {
  email: string;
  username: string;
  session: string;
};

type SignInOperatorResult =
  | {
      status: "authenticated";
      session: OperatorSession;
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

async function setOperatorSessionCookie(session: OperatorSession) {
  const cookieStore = await cookies();

  cookieStore.set({
    name: OPERATOR_SESSION_COOKIE_NAME,
    value: session.token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: session.expiresAt,
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
    name: OPERATOR_NEW_PASSWORD_CHALLENGE_COOKIE_NAME,
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
    name: OPERATOR_NEW_PASSWORD_CHALLENGE_COOKIE_NAME,
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
  const encodedChallenge = cookieStore.get(OPERATOR_NEW_PASSWORD_CHALLENGE_COOKIE_NAME)?.value;

  if (!encodedChallenge) {
    return null;
  }

  return decodePendingNewPasswordChallenge(encodedChallenge);
}

export async function clearOperatorSession() {
  const cookieStore = await cookies();

  cookieStore.set({
    name: OPERATOR_SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });

  await clearPendingNewPasswordChallenge();
}

export async function signInOperator(params: { email: string; password: string }): Promise<SignInOperatorResult> {
  const { region, clientId } = getOperatorCognitoConfig();
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

  const session = await verifyOperatorIdToken(idToken);

  if (!session) {
    const error = new Error("Failed to verify the ID token returned by Cognito.");
    error.name = "InvalidIdToken";
    throw error;
  }

  await setOperatorSessionCookie(session);

  return { status: "authenticated", session };
}

export async function getOperatorSession(): Promise<OperatorSession | null> {
  const cookieStore = await cookies();
  const idToken = cookieStore.get(OPERATOR_SESSION_COOKIE_NAME)?.value;

  if (!idToken) {
    return null;
  }

  return verifyOperatorIdToken(idToken);
}

export async function completeOperatorNewPassword(params: { newPassword: string }) {
  const challenge = await getPendingNewPasswordChallenge();

  if (!challenge) {
    const error = new Error("Pending new password challenge not found.");
    error.name = "NewPasswordChallengeExpired";
    throw error;
  }

  const { region, clientId } = getOperatorCognitoConfig();
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

  const session = await verifyOperatorIdToken(idToken);

  if (!session) {
    const error = new Error("Failed to verify the ID token returned by Cognito.");
    error.name = "InvalidIdToken";
    throw error;
  }

  await setOperatorSessionCookie(session);
  await clearPendingNewPasswordChallenge();

  return session;
}
