import "server-only";

import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { cookies } from "next/headers";

import { updateUserLastLoginAtByCognitoSub } from "@correcre/lib/dynamodb/user";
import { readRequiredServerEnv } from "@correcre/lib/env/server";

import { EMPLOYEE_SESSION_COOKIE_NAME } from "./constants";
import { getEmployeeCognitoConfig } from "./config";
import { type EmployeeSession, verifyEmployeeIdToken } from "./verify-token";

const cognitoClientCache = new Map<string, CognitoIdentityProviderClient>();

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
}

export async function signInEmployee(params: { email: string; password: string }) {
  const { region, clientId } = getEmployeeCognitoConfig();
  const cognitoClient = getCognitoClient(region);

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
    const error = new Error("Cognito requires a password change before sign-in.");
    error.name = "NewPasswordRequired";
    throw error;
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

  return session;
}

export async function getEmployeeSession(): Promise<EmployeeSession | null> {
  const cookieStore = await cookies();
  const idToken = cookieStore.get(EMPLOYEE_SESSION_COOKIE_NAME)?.value;

  if (!idToken) {
    return null;
  }

  return verifyEmployeeIdToken(idToken);
}
