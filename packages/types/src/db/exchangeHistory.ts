export type ExchangeHistoryStatus = "REQUESTED" | "COMPLETED" | "CANCELLED";

export type ExchangeHistoryItem = {
  pk: `COMPANY#${string}#USER#${string}`;
  sk: `EXCHANGED_AT#${string}#EXCHANGE#${string}`;
  exchangeId: string;
  companyId: string;
  userId: string;
  merchandiseId?: string;
  merchandiseNameSnapshot: string;
  usedPoint: number;
  quantity?: number;
  status?: ExchangeHistoryStatus;
  exchangedAt: string;
  createdAt?: string;
  gsi1pk: `COMPANY#${string}`;
  gsi1sk: `EXCHANGED_AT#${string}#USER#${string}#EXCHANGE#${string}`;
};
