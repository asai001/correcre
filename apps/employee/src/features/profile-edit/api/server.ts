import "server-only";

import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { buildUserByEmailGsiPk, buildUserSk, listUsersByEmail } from "@correcre/lib/dynamodb/user";
import { getDynamoDocumentClient } from "@correcre/lib/dynamodb/client";
import { readRequiredServerEnv } from "@correcre/lib/env/server";

import type { DBUserAddress, DBUserItem } from "@correcre/types";
import type { EditableEmployeeProfile, UpdateOwnProfileInput } from "../model/types";

type RuntimeConfig = {
  region: string;
  userTableName: string;
};

type NormalizedProfileInput = {
  lastName: string;
  firstName: string;
  lastNameKana: string;
  firstNameKana: string;
  email: string;
  phoneNumber?: string;
  address?: DBUserAddress;
};

function getRuntimeConfig(): RuntimeConfig {
  return {
    region: readRequiredServerEnv("AWS_REGION"),
    userTableName: readRequiredServerEnv("DDB_USER_TABLE_NAME"),
  };
}

function normalizeOptionalText(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidKana(value: string) {
  return /^[ァ-ヶー－\s　]+$/.test(value);
}

function isValidPhoneNumber(phoneNumber: string) {
  const digits = phoneNumber.replace(/\D/g, "");
  return /^[0-9-]+$/.test(phoneNumber) && digits.length >= 10 && digits.length <= 11;
}

async function assertUniqueEmail(config: RuntimeConfig, email: string, currentUserId: string) {
  const existingUsers = (await listUsersByEmail(
    {
      region: config.region,
      tableName: config.userTableName,
    },
    email,
  )).filter((user) => user.status !== "DELETED" && user.userId !== currentUserId);

  if (existingUsers.length > 0) {
    throw new Error("同じメールアドレスのユーザーがすでに登録されています");
  }
}

function buildAddress(input: Pick<UpdateOwnProfileInput, "postalCodeFirstHalf" | "postalCodeSecondHalf" | "prefecture" | "city" | "building">) {
  const postalCodeFirstHalf = input.postalCodeFirstHalf?.trim() ?? "";
  const postalCodeSecondHalf = input.postalCodeSecondHalf?.trim() ?? "";
  const prefecture = input.prefecture?.trim() ?? "";
  const city = input.city?.trim() ?? "";
  const building = normalizeOptionalText(input.building);
  const hasAnyAddressField = [postalCodeFirstHalf, postalCodeSecondHalf, prefecture, city, building].some(Boolean);

  if (!hasAnyAddressField) {
    return undefined;
  }

  const hasAnyPostalCodeField = Boolean(postalCodeFirstHalf || postalCodeSecondHalf);
  if (hasAnyPostalCodeField && (!/^\d{3}$/.test(postalCodeFirstHalf) || !/^\d{4}$/.test(postalCodeSecondHalf))) {
    throw new Error("郵便番号は 3 桁と 4 桁の数字で入力してください");
  }

  return {
    postalCode: hasAnyPostalCodeField ? `${postalCodeFirstHalf}${postalCodeSecondHalf}` : undefined,
    prefecture: prefecture || undefined,
    city: city || undefined,
    building,
  } satisfies DBUserAddress;
}

function normalizeProfileInput(input: UpdateOwnProfileInput): NormalizedProfileInput {
  const lastName = input.lastName.trim();
  const firstName = input.firstName.trim();
  const lastNameKana = input.lastNameKana.trim();
  const firstNameKana = input.firstNameKana.trim();
  const email = input.email.trim().toLowerCase();
  const phoneNumber = normalizeOptionalText(input.phoneNumber);

  if (!lastName || !firstName || !lastNameKana || !firstNameKana || !email) {
    throw new Error("必須項目を入力してください");
  }

  if (!isValidKana(lastNameKana) || !isValidKana(firstNameKana)) {
    throw new Error("フリガナは全角カタカナで入力してください");
  }

  if (!isValidEmail(email)) {
    throw new Error("メールアドレスの形式が正しくありません");
  }

  if (phoneNumber && !isValidPhoneNumber(phoneNumber)) {
    throw new Error("電話番号は 10 桁または 11 桁の数字で入力してください");
  }

  return {
    lastName,
    firstName,
    lastNameKana,
    firstNameKana,
    email,
    phoneNumber,
    address: buildAddress(input),
  };
}

function toEditableEmployeeProfile(
  user: Pick<DBUserItem, "lastName" | "firstName" | "lastNameKana" | "firstNameKana" | "email" | "phoneNumber" | "address">,
): EditableEmployeeProfile {
  return {
    lastName: user.lastName.trim(),
    firstName: user.firstName.trim(),
    lastNameKana: user.lastNameKana?.trim() ?? "",
    firstNameKana: user.firstNameKana?.trim() ?? "",
    email: user.email.trim(),
    phoneNumber: normalizeOptionalText(user.phoneNumber),
    address: user.address,
  };
}

export async function updateOwnProfileInDynamo(currentUser: DBUserItem, input: UpdateOwnProfileInput): Promise<EditableEmployeeProfile> {
  const config = getRuntimeConfig();
  const normalizedInput = normalizeProfileInput(input);

  await assertUniqueEmail(config, normalizedInput.email, currentUser.userId);

  const now = new Date().toISOString();
  const client = getDynamoDocumentClient(config.region);
  const setExpressions = [
    "lastName = :lastName",
    "firstName = :firstName",
    "lastNameKana = :lastNameKana",
    "firstNameKana = :firstNameKana",
    "email = :email",
    "updatedAt = :updatedAt",
    "gsi2pk = :gsi2pk",
  ];
  const removeExpressions: string[] = [];
  const expressionAttributeValues: Record<string, unknown> = {
    ":lastName": normalizedInput.lastName,
    ":firstName": normalizedInput.firstName,
    ":lastNameKana": normalizedInput.lastNameKana,
    ":firstNameKana": normalizedInput.firstNameKana,
    ":email": normalizedInput.email,
    ":updatedAt": now,
    ":gsi2pk": buildUserByEmailGsiPk(normalizedInput.email),
  };

  if (normalizedInput.phoneNumber) {
    setExpressions.push("phoneNumber = :phoneNumber");
    expressionAttributeValues[":phoneNumber"] = normalizedInput.phoneNumber;
  } else {
    removeExpressions.push("phoneNumber");
  }

  if (normalizedInput.address) {
    setExpressions.push("address = :address");
    expressionAttributeValues[":address"] = normalizedInput.address;
  } else {
    removeExpressions.push("address");
  }

  await client.send(
    new UpdateCommand({
      TableName: config.userTableName,
      Key: {
        companyId: currentUser.companyId,
        sk: buildUserSk(currentUser.userId),
      },
      UpdateExpression: `${setExpressions.length ? `SET ${setExpressions.join(", ")}` : ""}${removeExpressions.length ? ` REMOVE ${removeExpressions.join(", ")}` : ""}`,
      ExpressionAttributeValues: expressionAttributeValues,
    }),
  );

  return toEditableEmployeeProfile({
    ...currentUser,
    lastName: normalizedInput.lastName,
    firstName: normalizedInput.firstName,
    lastNameKana: normalizedInput.lastNameKana,
    firstNameKana: normalizedInput.firstNameKana,
    email: normalizedInput.email,
    phoneNumber: normalizedInput.phoneNumber,
    address: normalizedInput.address,
  });
}
