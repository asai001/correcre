export type MerchantUserRole = "MERCHANT";

export type MerchantUserStatus = "INVITED" | "ACTIVE" | "INACTIVE" | "DELETED";

export type MerchantUserItem = {
  merchantId: string;
  sk: `USER#${string}`;
  userId: string;
  cognitoSub?: string;
  lastName: string;
  firstName: string;
  lastNameKana?: string;
  firstNameKana?: string;
  email: string;
  phoneNumber?: string;
  roles: MerchantUserRole[];
  status: MerchantUserStatus;
  invitedAt?: string;
  joinedAt?: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
  gsi1pk?: `COGNITO_SUB#${string}`;
  gsi2pk: `EMAIL#${string}`;
};
