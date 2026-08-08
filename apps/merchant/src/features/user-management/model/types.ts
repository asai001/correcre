import type { MerchantUserStatus } from "@correcre/types";

// 提携企業アプリのユーザー管理画面で表示するユーザー情報。
export type MerchantUserRow = {
  userId: string;
  lastName: string;
  firstName: string;
  email: string;
  phoneNumber?: string;
  status: MerchantUserStatus;
  isAdmin: boolean;
  invitedAt?: string;
  lastLoginAt?: string;
};

export type InviteMerchantUserInput = {
  lastName: string;
  firstName: string;
  lastNameKana?: string;
  firstNameKana?: string;
  email: string;
  phoneNumber?: string;
  isAdmin: boolean;
};
