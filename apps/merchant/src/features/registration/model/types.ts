import type { StoreAddressMode } from "@correcre/types";

export type SubmitMerchantRegistrationInput = {
  name: string;
  kanaName?: string;
  companyLocation: string;
  storeAddressMode: StoreAddressMode;
  storeAddressOther?: string;
  customerInquiryContact: string;
  contactPersonName: string;
  contactPersonPhone: string;
  contactEmail: string;
  bankTransferAccount?: string;
  paymentCycle?: string;
  contactPersonLastName: string;
  contactPersonFirstName: string;
  contactPersonLastNameKana?: string;
  contactPersonFirstNameKana?: string;
};

export type SubmitMerchantRegistrationResult = {
  merchantId: string;
};
