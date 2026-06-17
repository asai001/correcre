import type { StoreAddressMode } from "@correcre/types";

// 提携企業が自身で確認・編集できる会社情報。
// 設定項目は運用者側「提携企業を登録」フォームと同一（status / 交換手数料率は除く）に、
// 一覧表示用の displayName（表示名）を追加したもの。
export type MerchantCompanyInfo = {
  merchantId: string;
  name: string;
  displayName?: string;
  kanaName?: string;
  companyLocation: string;
  storeAddressMode: StoreAddressMode;
  storeAddressOther?: string;
  customerInquiryContact: string;
  contactPersonName: string;
  contactPersonPhone: string;
  contactEmail?: string;
  bankTransferAccount?: string;
  paymentCycle?: string;
  updatedAt: string;
};

export type UpdateMerchantCompanyInfoInput = {
  name: string;
  displayName?: string;
  kanaName?: string;
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
