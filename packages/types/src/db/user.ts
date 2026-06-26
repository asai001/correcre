export type DBUserRole = "EMPLOYEE" | "MANAGER" | "ADMIN" | "OPERATOR";

export type DBUserStatus = "INVITED" | "ACTIVE" | "INACTIVE" | "DELETED";

export type DBUserAddress = {
  postalCode?: string;
  prefecture?: string;
  city?: string;
  street?: string;
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
  // 招待メール（仮パスワード）を最後に送信した日時（ISO 8601）。招待メール再送のたびに更新する。
  // 未設定の場合は createdAt を仮パスワードの発行日時とみなして有効期限を計算する。
  invitationSentAt?: string;
  // 利用可能（反映済み）な保有ポイント残高。交換などで使えるのはこの残高のみ。
  currentPointBalance: number;
  // 今月ミッションで獲得した、まだ反映されていないポイント（翌月1日に currentPointBalance へ繰り入れる）。
  pendingPointBalance?: number;
  // pendingPointBalance が属する年月（YYYY-MM）。これより後の月になったら反映する。
  pendingPointYearMonth?: string;
  currentMonthCompletionRate: number;
  createdAt: string;
  updatedAt: string;
  gsi1pk?: `COGNITO_SUB#${string}`;
  gsi2pk: `EMAIL#${string}`;
  gsi3pk?: `COMPANY#${string}#DEPT#${string}`;
  gsi3sk?: `USER#${string}`;
};
