export type MerchantStatus = "PENDING" | "ACTIVE" | "INACTIVE" | "REJECTED";

export type StoreAddressMode = "same_company" | "no_store" | "other";

export type Merchant = {
  merchantId: string;
  name: string;
  // 一覧（従業員向け商品・サービスカタログなど）に表示する名称。未設定の場合は name を表示する。
  displayName?: string;
  kanaName?: string;

  status: MerchantStatus;

  companyLocation: string;
  storeAddressMode: StoreAddressMode;
  storeAddressOther?: string;
  customerInquiryContact: string;

  contactPersonName: string;
  contactPersonPhone: string;
  contactEmail?: string;

  bankTransferAccount?: string;
  paymentCycle?: string;
  invoiceEmailSentMonths?: Record<string, string>;

  // 交換手数料率（%）。請求時に売上から差し引く手数料。未設定の場合は既定値（5%）を適用する。
  exchangeFeePercent?: number;

  createdAt: string;
  updatedAt: string;
};
