import type { EmployeeManagementSummary } from "../model/types";

export async function fetchEmployeeManagementSummary(
  companyId: string,
  adminUserId?: string,
  signal?: AbortSignal
): Promise<EmployeeManagementSummary> {
  const params = new URLSearchParams({ companyId });

  if (adminUserId) {
    params.set("adminUserId", adminUserId);
  }

  const res = await fetch(`/api/employee-management?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
    signal,
  });

  if (!res.ok) {
    console.error("fetchEmployeeManagementSummary error", res.status, await res.text());
    throw new Error("従業員管理データの取得に失敗しました");
  }

  return (await res.json()) as EmployeeManagementSummary;
}
