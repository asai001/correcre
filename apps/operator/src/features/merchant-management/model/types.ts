import type {
  ExchangeHistoryStatus,
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
  // 累計交換手数料（運用者の手数料収入）。
  totalExchangeFeeYen: number;
  // 累計支払額（提携企業への支払額）。
  totalPayableYen: number;
};

// 提携企業ごとの月次収支（売上・交換手数料・支払額）。
export type MerchantMonthlyFinanceItemRow = {
  merchandiseId: string;
  merchandiseName: string;
  exchangeCount: number;
  salesYen: number;
};

export type MerchantMonthlyFinanceRow = {
  month: string; // YYYY-MM
  exchangeCount: number;
  salesYen: number;
  // 交換手数料（運用者の手数料収入）。
  exchangeFeeYen: number;
  // 提携企業への支払額（売上 − 交換手数料）。
  payableYen: number;
  items: MerchantMonthlyFinanceItemRow[];
};

// 提携企業サマリー画面用：商品・交換の集計値と月ごとの収支。
export type MerchantSummaryDetail = {
  merchantId: string;
  merchantName: string;
  status: MerchantStatus;
  // 適用される交換手数料率（%、既定値解決済み）。
  exchangeFeePercent: number;
  stats: MerchantStats;
  // 直近12か月の月次収支（新しい月が先頭）。
  monthly: MerchantMonthlyFinanceRow[];
};

export type MerchantOverallStats = Omit<MerchantStats, "merchantId"> & {
  registeredMerchantCount: number;
  activeMerchantCount: number;
  inactiveMerchantCount: number;
  rejectedMerchantCount: number;
  pendingMerchantCount: number;
};

// 提携企業サマリー画面用：全体の集計値、月次収支、企業別概況。
export type MerchantOverallSummary = {
  stats: MerchantOverallStats;
  monthly: MerchantMonthlyFinanceRow[];
  merchants: MerchantSummaryDetail[];
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
  // 自社ユーザーを追加できる管理者ロール（MERCHANT_ADMIN）を持つかどうか。
  isAdmin: boolean;
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
  // 交換手数料率（%）。未指定の場合は既定値（5%）を適用する。
  exchangeFeePercent?: number;
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
  // true の場合、管理者（MERCHANT_ADMIN）として招待する。
  isAdmin?: boolean;
};

export type UpdateMerchantUserRoleInput = {
  merchantId: string;
  userId: string;
  isAdmin: boolean;
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

// 提携企業の削除で影響を受ける交換と、その申請者の連絡先。削除後も申請者へ連絡できるよう画面に残す。
export type MerchantDeletionExchange = {
  exchangeId: string;
  status: ExchangeHistoryStatus;
  merchandiseName: string;
  usedPoint: number;
  exchangedAt: string;
  applicantName: string;
  applicantEmail?: string;
  companyName?: string;
};

// 削除前の確認内容。
export type MerchantDeletionPreview = {
  merchantId: string;
  merchantName: string;
  status: MerchantStatus;
  openExchanges: MerchantDeletionExchange[];
  merchandiseCount: number;
  publishedMerchandiseCount: number;
  userCount: number;
};

export type DeleteMerchantInput = {
  merchantId: string;
  // 誤操作防止のため、提携企業名をそのまま入力してもらう
  confirmName: string;
  // 対応中の交換が残っていてもキャンセルして削除する
  force: boolean;
  // キャンセルした交換の申請者にお知らせメールを送る
  notifyApplicants: boolean;
};

export type DeleteMerchantResult = {
  merchantId: string;
  merchantName: string;
  cancelledExchanges: (MerchantDeletionExchange & { notified: boolean })[];
};
