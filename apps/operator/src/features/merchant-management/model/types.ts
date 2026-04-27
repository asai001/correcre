import type {
  Merchant,
  MerchantStatus,
  MerchantUserItem,
  MerchantUserStatus,
  StoreAddressMode,
} from "@correcre/types";

export type MerchantSummary = Merchant;

export type MerchantUserSummary = {
  merchantId: string;
  userId: string;
  lastName: string;
  firstName: string;
  email: string;
  phoneNumber?: string;
  status: MerchantUserStatus;
  invitedAt?: string;
  joinedAt?: string;
  lastLoginAt?: string;
};

export type CreateMerchantInput = {
  name: string;
  kanaName?: string;
  status?: MerchantStatus;
  companyLocation: string;
  storeAddressMode: StoreAddressMode;
  storeAddressOther?: string;
  customerInquiryContact: string;
  contactPersonName: string;
  contactPersonPhone: string;
  contactEmail?: string;
  bankTransferAccount?: string;
  paymentCycle?: string;
};

export type UpdateMerchantInput = CreateMerchantInput & {
  merchantId: string;
};

export type CreateMerchantUserInput = {
  merchantId: string;
  lastName: string;
  firstName: string;
  lastNameKana?: string;
  firstNameKana?: string;
  email: string;
  phoneNumber?: string;
};

export type MerchantUser = MerchantUserItem;
