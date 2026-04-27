export type MerchantStatus = "ACTIVE" | "INACTIVE";

export type StoreAddressMode = "same_company" | "no_store" | "other";

export type Merchant = {
  merchantId: string;
  name: string;
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

  createdAt: string;
  updatedAt: string;
};
