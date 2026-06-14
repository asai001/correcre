export type PointTransactionType =
  | "MISSION_REWARD"
  | "EXCHANGE_REQUEST"
  | "EXCHANGE_REFUND"
  | "ADMIN_ADJUSTMENT"
  | "OPERATOR_ADJUSTMENT";

export type PointTransactionSourceType =
  | "MISSION_REPORT"
  | "EXCHANGE_HISTORY"
  | "ADMIN_EMPLOYEE_MANAGEMENT"
  | "OPERATOR_USER_REGISTRATION";

export type PointTransactionActorType = "EMPLOYEE" | "ADMIN" | "OPERATOR" | "MERCHANT" | "SYSTEM";

export type PointTransaction = {
  pk: `COMPANY#${string}#USER#${string}`;
  sk: `OCCURRED_AT#${string}#TX#${string}`;
  companyId: string;
  userId: string;
  transactionId: string;
  occurredAt: string;
  yearMonth: string;
  type: PointTransactionType;
  deltaPoint: number;
  balanceAfter?: number;
  sourceType: PointTransactionSourceType;
  sourceId: string;
  actorType: PointTransactionActorType;
  actorUserId?: string;
  description?: string;
  createdAt: string;
  gsi1pk: `COMPANY#${string}`;
  gsi1sk: `OCCURRED_AT#${string}#USER#${string}#TX#${string}`;
};
