export type SupportInquirySource = "ADMIN" | "MERCHANT";

export type SupportInquiryCategory =
  | "LOGIN"
  | "ACCOUNT"
  | "MERCHANDISE"
  | "EXCHANGE"
  | "BILLING"
  | "DATA"
  | "SYSTEM"
  | "OTHER";

export type SupportInquiryStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED";

export type SupportInquirySubmitter = {
  userId: string;
  email: string;
  name?: string;
  companyId?: string;
  companyName?: string;
  merchantId?: string;
  merchantName?: string;
};

export type SupportInquiryItem = {
  pk: `INQUIRY#${string}`;
  inquiryId: string;
  source: SupportInquirySource;
  category: SupportInquiryCategory;
  subject: string;
  body: string;
  status: SupportInquiryStatus;
  submitter: SupportInquirySubmitter;
  currentUrl?: string;
  userAgent?: string;
  createdAt: string;
  updatedAt: string;
  statusUpdatedAt?: string;
  statusUpdatedBy?: string;
  notifiedAt?: string;
  notificationRecipients?: string[];
  notificationError?: string;
  gsi1pk: "SUPPORT_INQUIRY";
  gsi1sk: `CREATED_AT#${string}#INQUIRY#${string}`;
  gsi2pk: `STATUS#${SupportInquiryStatus}`;
  gsi2sk: `CREATED_AT#${string}#INQUIRY#${string}`;
};
