import type { SupportInquiryCategory } from "@correcre/types";

export type SubmitSupportInquiryInput = {
  category: SupportInquiryCategory;
  subject: string;
  body: string;
  currentUrl?: string;
};

export type SubmitSupportInquiryResult = {
  inquiryId: string;
  createdAt: string;
  notificationDelivered: boolean;
};
