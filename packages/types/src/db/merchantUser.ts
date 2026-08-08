// MERCHANT: 提携企業アプリへログインできる基本ロール（全ユーザーが持つ）。
// MERCHANT_ADMIN: 自社のユーザーを追加できる管理者ロール（MERCHANT と併せて持つ）。
export type MerchantUserRole = "MERCHANT" | "MERCHANT_ADMIN";

export type MerchantUserStatus = "PENDING" | "INVITED" | "ACTIVE" | "INACTIVE" | "DELETED";

export type MerchantUserItem = {
  merchantId: string;
  sk: `USER#${string}`;
  userId: string;
  cognitoSub?: string;
  lastName: string;
  firstName: string;
  lastNameKana?: string;
  firstNameKana?: string;
  email: string;
  phoneNumber?: string;
  roles: MerchantUserRole[];
  status: MerchantUserStatus;
  invitedAt?: string;
  joinedAt?: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
  gsi1pk?: `COGNITO_SUB#${string}`;
  gsi2pk: `EMAIL#${string}`;
};
