// 管理者アプリの Route Handler 共通の認可は @admin/lib/auth/api-authorize に集約した。
// 既存の呼び出し元のために従来名を残す。
export { authorizeAdminApiRequest as authorizeEmployeeManagementRequest } from "@admin/lib/auth/api-authorize";
