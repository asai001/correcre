import "server-only";

import { randomBytes } from "node:crypto";
import {
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
  AdminResetUserPasswordCommand,
  AdminUpdateUserAttributesCommand,
  type AttributeType,
} from "@aws-sdk/client-cognito-identity-provider";
import type { DBUserRole, MerchantUserRole } from "@correcre/types";

import { getCognitoIdentityProviderClient } from "./client";

export type CognitoUserPoolConfig = {
  region: string;
  userPoolId: string;
};

export type CognitoCreatableRole = DBUserRole | MerchantUserRole;

export type CreateCognitoUserInput = {
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  roles: readonly CognitoCreatableRole[];
};

export type CreatedCognitoUser = {
  cognitoSub: string;
  username: string;
};

export type ResendCognitoUserInvitationInput = {
  username: string;
  roles: readonly CognitoCreatableRole[];
};

// Cognito の仮パスワード有効期限（日数）。infra/lib/cognito.ts の tempPasswordValidity と
// 必ず一致させること。
export const TEMP_PASSWORD_VALIDITY_DAYS = 7;

const TEMP_PASSWORD_VALIDITY_MS = TEMP_PASSWORD_VALIDITY_DAYS * 24 * 60 * 60 * 1000;

// 招待（仮パスワード発行）からの有効期限を返す。invitationSentAt は再送のたびに更新され、
// 未設定（再送していない／旧データ）の場合は作成日時 createdAt を発行日時とみなす。
export function getInvitationExpiresAt(user: { invitationSentAt?: string; createdAt: string }): Date {
  const base = user.invitationSentAt ?? user.createdAt;
  return new Date(new Date(base).getTime() + TEMP_PASSWORD_VALIDITY_MS);
}

// 招待中ユーザーの仮パスワードが有効期限切れかどうかを返す。
export function isInvitationExpired(
  user: { invitationSentAt?: string; createdAt: string },
  now: Date = new Date(),
): boolean {
  return now.getTime() >= getInvitationExpiresAt(user).getTime();
}

function getCognitoClient(region: string) {
  return getCognitoIdentityProviderClient(region);
}

function getAttributeValue(attributes: AttributeType[] | undefined, name: string) {
  return attributes?.find((attribute) => attribute.Name === name)?.Value?.trim();
}

function createTemporaryPassword() {
  return `Tmp${randomBytes(8).toString("hex")}A1`;
}

function serializeRoles(roles: readonly CognitoCreatableRole[]) {
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

// 既存ユーザーへ招待メール（仮パスワード）を再送する。MessageAction=RESEND により新しい
// 仮パスワードが発行され、有効期限がリセットされる。FORCE_CHANGE_PASSWORD（初回パスワード
// 未設定）のユーザーにのみ有効で、それ以外は Cognito 側でエラーになる。
export async function resendCognitoUserInvitation(
  config: CognitoUserPoolConfig,
  input: ResendCognitoUserInvitationInput,
): Promise<void> {
  const client = getCognitoClient(config.region);
  const serializedRoles = serializeRoles(input.roles);

  await client.send(
    new AdminCreateUserCommand({
      UserPoolId: config.userPoolId,
      Username: input.username,
      MessageAction: "RESEND",
      DesiredDeliveryMediums: ["EMAIL"],
      // CustomMessage Lambda が招待メール内のログイン URL をロールから解決するため引き継ぐ。
      ClientMetadata: serializedRoles
        ? {
            roles: serializedRoles,
          }
        : undefined,
    }),
  );
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

export async function updateCognitoUserEmail(
  config: CognitoUserPoolConfig,
  input: { username: string; newEmail: string },
): Promise<void> {
  const client = getCognitoClient(config.region);

  await client.send(
    new AdminUpdateUserAttributesCommand({
      UserPoolId: config.userPoolId,
      Username: input.username,
      UserAttributes: [
        { Name: "email", Value: input.newEmail },
        { Name: "email_verified", Value: "true" },
      ],
    }),
  );
}

export async function resetCognitoUserPassword(
  config: CognitoUserPoolConfig,
  input: { username: string },
): Promise<void> {
  const client = getCognitoClient(config.region);

  await client.send(
    new AdminResetUserPasswordCommand({
      UserPoolId: config.userPoolId,
      Username: input.username,
    }),
  );
}
