export type SessionRole = "ADMIN" | "EMPLOYEE" | "OPERATOR" | "MERCHANT";

export type DBSessionItem = {
  pk: `SESSION#${string}`;
  sessionId: string;
  role: SessionRole;
  cognitoSub: string;
  email?: string;
  name?: string;
  cognitoUsername?: string;
  loginAt: string;
  lastActiveAt: string;
  rememberMe: boolean;
  idleMs: number;
  absoluteMs: number | null;
  revokedAt?: string;
  ipAddress?: string;
  userAgent?: string;
  ttl: number;
  gsi1pk: `COGNITO_SUB#${string}`;
  gsi1sk: `CREATED_AT#${string}`;
};
