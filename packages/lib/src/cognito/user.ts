import "server-only";

import { randomBytes } from "node:crypto";
import {
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
  CognitoIdentityProviderClient,
  type AttributeType,
} from "@aws-sdk/client-cognito-identity-provider";
import type { DBUserRole } from "@correcre/types";

export type CognitoUserPoolConfig = {
  region: string;
  userPoolId: string;
};

export type CreateCognitoUserInput = {
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  roles: DBUserRole[];
};

export type CreatedCognitoUser = {
  cognitoSub: string;
  username: string;
};

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

function getAttributeValue(attributes: AttributeType[] | undefined, name: string) {
  return attributes?.find((attribute) => attribute.Name === name)?.Value?.trim();
}

function createTemporaryPassword() {
  return `Tmp${randomBytes(8).toString("hex")}A1`;
}

function serializeRoles(roles: DBUserRole[]) {
  return Array.from(new Set(roles)).join(",");
}

export async function createCognitoUser(
  config: CognitoUserPoolConfig,
  input: CreateCognitoUserInput,
): Promise<CreatedCognitoUser> {
  const client = getCognitoClient(config.region);
  const serializedRoles = serializeRoles(input.roles);
  const userAttributes: AttributeType[] = [
    { Name: "email", Value: input.email },
    { Name: "email_verified", Value: "true" },
    { Name: "given_name", Value: input.firstName },
    { Name: "family_name", Value: input.lastName },
    { Name: "name", Value: input.fullName },
  ];

  const response = await client.send(
    new AdminCreateUserCommand({
      UserPoolId: config.userPoolId,
      Username: input.email,
      TemporaryPassword: createTemporaryPassword(),
      DesiredDeliveryMediums: ["EMAIL"],
      ClientMetadata: serializedRoles
        ? {
            roles: serializedRoles,
          }
        : undefined,
      UserAttributes: userAttributes,
    }),
  );

  const cognitoSub = getAttributeValue(response.User?.Attributes, "sub");

  if (!cognitoSub) {
    throw new Error("Cognito user creation did not return a sub.");
  }

  return {
    cognitoSub,
    username: response.User?.Username?.trim() || input.email,
  };
}

export async function deleteCognitoUser(config: CognitoUserPoolConfig, username: string): Promise<void> {
  const client = getCognitoClient(config.region);

  await client.send(
    new AdminDeleteUserCommand({
      UserPoolId: config.userPoolId,
      Username: username,
    }),
  );
}
