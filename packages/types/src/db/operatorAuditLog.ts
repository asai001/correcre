export type OperatorAuditEventType =
  | "MERCHANT_USER_EMAIL_RESET"
  | "MERCHANT_USER_PASSWORD_RESET"
  | "MERCHANT_REGISTRATION_APPROVED"
  | "MERCHANT_REGISTRATION_REJECTED";

export type OperatorAuditEventResult = "SUCCESS" | "FAILURE" | "ROLLED_BACK";

export type OperatorAuditLogActor = {
  userId: string;
  email: string;
  cognitoSub?: string;
  displayName?: string;
};

export type OperatorAuditLogTarget = {
  merchantId: string;
  merchantName?: string;
  merchantUserId: string;
  merchantUserName?: string;
  beforeEmail?: string;
  afterEmail?: string;
};

export type OperatorAuditLogItem = {
  pk: `OPERATOR#${string}`;
  sk: `OCCURRED_AT#${string}#EVENT#${string}`;
  eventId: string;
  eventType: OperatorAuditEventType;
  occurredAt: string;
  result: OperatorAuditEventResult;
  actor: OperatorAuditLogActor;
  target: OperatorAuditLogTarget;
  errorMessage?: string;
  gsi1pk: `MERCHANT#${string}`;
  gsi1sk: `OCCURRED_AT#${string}#EVENT#${string}`;
};
