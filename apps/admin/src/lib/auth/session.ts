import "server-only";

import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { cookies } from "next/headers";

import { ADMIN_SESSION_COOKIE_NAME } from "./constants";
import { getAdminCognitoConfig } from "./config";
import { type AdminSession, verifyAdminIdToken } from "./verify-token";

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

async function setAdminSessionCookie(session: AdminSession) {
  const cookieStore = await cookies();

  cookieStore.set({
    name: ADMIN_SESSION_COOKIE_NAME,
    value: session.token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: session.expiresAt,
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();

  cookieStore.set({
    name: ADMIN_SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });
}

export async function signInAdmin(params: { email: string; password: string }) {
  const { region, clientId } = getAdminCognitoConfig();
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

  const session = await verifyAdminIdToken(idToken);

  if (!session) {
    const error = new Error("Failed to verify the ID token returned by Cognito.");
    error.name = "InvalidIdToken";
    throw error;
  }

  await setAdminSessionCookie(session);

  return session;
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const idToken = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value;

  if (!idToken) {
    return null;
  }

  return verifyAdminIdToken(idToken);
}
