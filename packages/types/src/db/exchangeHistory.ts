// Legacy values "REQUESTED" / "COMPLETED" / "CANCELLED" remain readable for
// backward compatibility. New writes use the expanded set including the
// US-spelled "CANCELED" so the application code can normalize on load.
export type ExchangeHistoryStatus =
  | "REQUESTED"
  | "PREPARING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "REJECTED"
  | "CANCELED"
  | "CANCELLED";

export type ExchangeHistoryActorType = "EMPLOYEE" | "MERCHANT" | "OPERATOR" | "SYSTEM";

export type ExchangeHistoryStatusEvent = {
  status: ExchangeHistoryStatus;
  occurredAt: string;
  actorType: ExchangeHistoryActorType;
  actorId?: string;
  comment?: string;
};

export type ExchangeHistoryItem = {
  pk: `COMPANY#${string}#USER#${string}`;
  sk: `EXCHANGED_AT#${string}#EXCHANGE#${string}`;
  exchangeId: string;
  companyId: string;
  userId: string;
  merchandiseId?: string;
  merchandiseNameSnapshot: string;
  merchantId?: string;
  merchantNameSnapshot?: string;
  usedPoint: number;
  requiredPointSnapshot?: number;
  priceYenSnapshot?: number;
  pointHeld?: number;
  quantity?: number;
  status?: ExchangeHistoryStatus;
  history?: ExchangeHistoryStatusEvent[];
  exchangedAt: string;
  requestedAt?: string;
  completedAt?: string;
  canceledAt?: string;
  createdAt?: string;
  updatedAt?: string;
  gsi1pk: `COMPANY#${string}`;
  gsi1sk: `EXCHANGED_AT#${string}#USER#${string}#EXCHANGE#${string}`;
  gsi2pk?: `MERCHANT#${string}#STATUS#${ExchangeHistoryStatus}`;
  gsi2sk?: `EXCHANGED_AT#${string}#EXCHANGE#${string}`;
  gsi3pk?: `MERCHANT#${string}`;
  gsi3sk?: `EXCHANGED_AT#${string}#EXCHANGE#${string}`;
};
