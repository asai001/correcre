import "server-only";

import {
  ConfirmForgotPasswordCommand,
  CognitoIdentityProviderClient,
  ForgotPasswordCommand,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { cookies } from "next/headers";

import { updateUserLastLoginAtByCognitoSub } from "@correcre/lib/dynamodb/user";
import { readRequiredServerEnv } from "@correcre/lib/env/server";

import {
  EMPLOYEE_NEW_PASSWORD_CHALLENGE_COOKIE_NAME,
  EMPLOYEE_SESSION_COOKIE_NAME,
} from "./constants";
import { getEmployeeCognitoConfig } from "./config";
import { type EmployeeSession, verifyEmployeeIdToken } from "./verify-token";

const cognitoClientCache = new Map<string, CognitoIdentityProviderClient>();
const NEW_PASSWORD_CHALLENGE_COOKIE_TTL_MS = 10 * 60 * 1000;

export type PendingNewPasswordChallenge = {
  email: string;
  username: string;
  session: string;
};

type SignInEmployeeResult =
  | {
      status: "authenticated";
      session: EmployeeSession;
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

async function setEmployeeSessionCookie(session: EmployeeSession) {
  const cookieStore = await cookies();

  cookieStore.set({
    name: EMPLOYEE_SESSION_COOKIE_NAME,
    value: session.token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: session.expiresAt,
  });
}

async function syncEmployeeLastLoginAt(session: EmployeeSession) {
  const cognitoSub = session.payload.sub?.trim();

  if (!cognitoSub) {
    return;
  }

  const updatedUser = await updateUserLastLoginAtByCognitoSub(
    {
      region: readRequiredServerEnv("AWS_REGION"),
      tableName: readRequiredServerEnv("DDB_USER_TABLE_NAME"),
    },
    cognitoSub,
  );

  if (!updatedUser) {
    console.warn("Employee sign-in completed but no matching User record was found for Cognito sub.");
  }
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
    name: EMPLOYEE_NEW_PASSWORD_CHALLENGE_COOKIE_NAME,
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
    name: EMPLOYEE_NEW_PASSWORD_CHALLENGE_COOKIE_NAME,
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
  const encodedChallenge = cookieStore.get(EMPLOYEE_NEW_PASSWORD_CHALLENGE_COOKIE_NAME)?.value;

  if (!encodedChallenge) {
    return null;
  }

  return decodePendingNewPasswordChallenge(encodedChallenge);
}

export async function clearEmployeeSession() {
  const cookieStore = await cookies();

  cookieStore.set({
    name: EMPLOYEE_SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });

  await clearPendingNewPasswordChallenge();
}

export async function signInEmployee(params: { email: string; password: string }): Promise<SignInEmployeeResult> {
  const { region, clientId } = getEmployeeCognitoConfig();
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

  const session = await verifyEmployeeIdToken(idToken);

  if (!session) {
    const error = new Error("Failed to verify the ID token returned by Cognito.");
    error.name = "InvalidIdToken";
    throw error;
  }

  await setEmployeeSessionCookie(session);
  await syncEmployeeLastLoginAt(session);

  return { status: "authenticated", session };
}

export async function requestEmployeePasswordReset(params: { email: string }) {
  const { region, clientId } = getEmployeeCognitoConfig();
  const cognitoClient = getCognitoClient(region);

  await cognitoClient.send(
    new ForgotPasswordCommand({
      ClientId: clientId,
      Username: params.email,
    }),
  );
}

export async function getEmployeeSession(): Promise<EmployeeSession | null> {
  const cookieStore = await cookies();
  const idToken = cookieStore.get(EMPLOYEE_SESSION_COOKIE_NAME)?.value;

  if (!idToken) {
    return null;
  }

  return verifyEmployeeIdToken(idToken);
}

export async function confirmEmployeePasswordReset(params: { email: string; confirmationCode: string; newPassword: string }) {
  const { region, clientId } = getEmployeeCognitoConfig();
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

export async function completeEmployeeNewPassword(params: { newPassword: string }) {
  const challenge = await getPendingNewPasswordChallenge();

  if (!challenge) {
    const error = new Error("Pending new password challenge not found.");
    error.name = "NewPasswordChallengeExpired";
    throw error;
  }

  const { region, clientId } = getEmployeeCognitoConfig();
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

  const session = await verifyEmployeeIdToken(idToken);

  if (!session) {
    const error = new Error("Failed to verify the ID token returned by Cognito.");
    error.name = "InvalidIdToken";
    throw error;
  }

  await setEmployeeSessionCookie(session);
  await syncEmployeeLastLoginAt(session);
  await clearPendingNewPasswordChallenge();

  return session;
}
