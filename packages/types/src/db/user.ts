export type DBUserRole = "EMPLOYEE" | "MANAGER" | "ADMIN" | "OPERATOR";

export type DBUserStatus = "INVITED" | "ACTIVE" | "INACTIVE" | "DELETED";

export type DBUserAddress = {
  postalCode?: string;
  prefecture?: string;
  city?: string;
  building?: string;
};

export type DBUserItem = {
  companyId: string;
  sk: `USER#${string}`;
  userId: string;
  cognitoSub?: string;
  lastName: string;
  firstName: string;
  lastNameKana?: string;
  firstNameKana?: string;
  email: string;
  phoneNumber?: string;
  address?: DBUserAddress;
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
