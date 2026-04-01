export type DBUserRole = "EMPLOYEE" | "MANAGER" | "ADMIN";

export type DBUserStatus = "INVITED" | "ACTIVE" | "INACTIVE" | "DELETED";

export type DBUserItem = {
  companyId: string;
  sk: `USER#${string}`;
  userId: string;
  cognitoSub?: string;
  name: string;
  email: string;
  loginId: string;
  departmentId?: string;
  departmentName?: string;
  roles: DBUserRole[];
  status: DBUserStatus;
  joinedAt?: string;
  lastLoginAt?: string;
  currentPointBalance: number;
  currentMonthCompletionRate: number;
  createdAt: string;
  updatedAt: string;
  gsi1pk?: `COGNITO_SUB#${string}`;
  gsi2pk: `EMAIL#${string}`;
  gsi3pk?: `COMPANY#${string}#DEPT#${string}`;
  gsi3sk?: `USER#${string}`;
};
