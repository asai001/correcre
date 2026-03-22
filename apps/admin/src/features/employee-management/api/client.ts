import type {
  CreateDepartmentInput,
  CreateEmployeeInput,
  DeleteEmployeeInput,
  EmployeeManagementEmployee,
  EmployeeManagementSummary,
  MutationResult,
  RenameDepartmentInput,
  UpdateEmployeeInput,
} from "../model/types";

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

export async function createEmployee(
  companyId: string,
  input: CreateEmployeeInput
): Promise<EmployeeManagementEmployee> {
  const res = await fetch("/api/employee-management", {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      companyId,
      ...input,
    }),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "従業員の登録に失敗しました");
  }

  return (await res.json()) as EmployeeManagementEmployee;
}

export async function updateEmployee(
  companyId: string,
  input: UpdateEmployeeInput
): Promise<EmployeeManagementEmployee> {
  const res = await fetch("/api/employee-management", {
    method: "PATCH",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      companyId,
      ...input,
    }),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "従業員情報の更新に失敗しました");
  }

  return (await res.json()) as EmployeeManagementEmployee;
}

async function toMutationResult(
  request: Promise<Response>,
  fallbackMessage: string
): Promise<MutationResult> {
  try {
    const res = await request;

    if (res.ok) {
      return { ok: true };
    }

    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    return {
      ok: false,
      error: data?.error ?? fallbackMessage,
    };
  } catch (err) {
    console.error("employee management mutation request failed", err);
    return {
      ok: false,
      error: "通信に失敗しました。時間を置いて再度お試しください。",
    };
  }
}

export async function deleteEmployee(companyId: string, input: DeleteEmployeeInput): Promise<MutationResult> {
  return toMutationResult(
    fetch("/api/employee-management", {
      method: "DELETE",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        companyId,
        ...input,
      }),
    }),
    "従業員の削除に失敗しました"
  );
}

export async function createDepartment(companyId: string, input: CreateDepartmentInput): Promise<MutationResult> {
  return toMutationResult(
    fetch("/api/employee-management/departments", {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        companyId,
        ...input,
      }),
    }),
    "部署の追加に失敗しました"
  );
}

export async function renameDepartment(companyId: string, input: RenameDepartmentInput): Promise<MutationResult> {
  return toMutationResult(
    fetch("/api/employee-management/departments", {
      method: "PATCH",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        companyId,
        ...input,
      }),
    }),
    "部署名の更新に失敗しました"
  );
}

export async function deleteDepartment(companyId: string, name: string): Promise<MutationResult> {
  return toMutationResult(
    fetch("/api/employee-management/departments", {
      method: "DELETE",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        companyId,
        name,
      }),
    }),
    "部署の削除に失敗しました"
  );
}
