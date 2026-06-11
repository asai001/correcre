import type {
  Merchandise,
  Merchant,
  MerchantStatus,
  MerchantUserItem,
  MerchantUserStatus,
  StoreAddressMode,
} from "@correcre/types";

export type MerchantSummary = Merchant;

// 提携企業ごとの商品・交換に関する集計値（提携企業管理リストに表示する）。
export type MerchantStats = {
  merchantId: string;
  // 公開済み商品数（PUBLISHED）。
  publishedCount: number;
  // 非公開商品数（UNPUBLISHED と DRAFT）。
  unpublishedCount: number;
  // 対応中の商品数（準備中・対応中の交換件数）。
  inProgressCount: number;
  // 累計商品交換数（却下・キャンセルを除く成立した交換件数）。
  totalExchangeCount: number;
  // 累計で発生した金額（交換ポイント × 5円）。
  totalAmountYen: number;
};

// 運用者が確認する、提携企業が登録した商品の一覧表示用サマリー。
export type OperatorMerchandiseSummary = Merchandise & {
  cardImageViewUrl?: string;
  detailImageViewUrl?: string;
};

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

export type ResetMerchantUserEmailInput = {
  merchantId: string;
  userId: string;
  newEmail: string;
};

export type ResetMerchantUserPasswordInput = {
  merchantId: string;
  userId: string;
};

export type MerchantApplicationDecisionInput = {
  merchantId: string;
};

export type MerchantApplicationDetail = {
  merchant: Merchant;
  contactUser: {
    userId: string;
    lastName: string;
    firstName: string;
    lastNameKana?: string;
    firstNameKana?: string;
    email: string;
    phoneNumber?: string;
    status: MerchantUserStatus;
  } | null;
};

export type MerchantUser = MerchantUserItem;
