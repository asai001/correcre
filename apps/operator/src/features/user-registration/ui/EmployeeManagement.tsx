"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { toYYYYMMDDHHmm } from "@correcre/lib";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBuilding,
  faDownload,
  faMagnifyingGlass,
  faPenToSquare,
  faPlus,
  faTrashCan,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import { Button, IconButton, InputAdornment, MenuItem, TablePagination, TextField } from "@mui/material";

import type { OperatorCompanySummary } from "@operator/features/company-registration/model/types";
import AdminPageHeader from "@operator/components/AdminPageHeader";
import Table, { type ColumnDef } from "@operator/components/Table";
import { downloadCsv } from "@operator/lib/csv";

import {
  createDepartment,
  createEmployee,
  deleteDepartment,
  deleteEmployee,
  renameDepartment,
  updateEmployee,
} from "../api/client";
import { useEmployeeManagementSummary } from "../hooks/useEmployeeManagementSummary";
import type {
  CreateEmployeeInput,
  EmployeeAuthLinkStatus,
  EmployeeManagementEmployee,
  EmployeeManagementRole,
  EmployeeManagementStatus,
  MutationResult,
  UpdateEmployeeInput,
} from "../model/types";
import DepartmentManagementDialog from "./DepartmentManagementDialog";
import EmployeeDeleteDialog from "./EmployeeDeleteDialog";
import EmployeeEditDialog from "./EmployeeEditDialog";
import EmployeeRegistrationDialog from "./EmployeeRegistrationDialog";

type EmployeeManagementProps = {
  companyId?: string;
  companyOptions: OperatorCompanySummary[];
  operatorName: string;
};

type StatCardProps = {
  label: string;
  value: string;
  description: string;
  accentClassName: string;
};

const roleLabelMap: Record<EmployeeManagementRole, string> = {
  EMPLOYEE: "従業員",
  MANAGER: "マネージャー",
  ADMIN: "管理者",
  OPERATOR: "運用者",
};

const roleBadgeClassMap: Record<EmployeeManagementRole, string> = {
  EMPLOYEE: "bg-slate-100 text-slate-700 border-slate-200",
  MANAGER: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ADMIN: "bg-violet-50 text-violet-700 border-violet-200",
  OPERATOR: "bg-cyan-50 text-cyan-700 border-cyan-200",
};

const statusLabelMap: Record<EmployeeManagementStatus, string> = {
  INVITED: "招待中",
  ACTIVE: "有効",
  SUSPENDED: "停止中",
};

const statusBadgeClassMap: Record<EmployeeManagementStatus, string> = {
  INVITED: "bg-amber-50 text-amber-700 border-amber-200",
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  SUSPENDED: "bg-rose-50 text-rose-700 border-rose-200",
};

const authLinkLabelMap: Record<EmployeeAuthLinkStatus, string> = {
  UNLINKED: "未連携",
  LINKED: "連携済み",
};

const authLinkBadgeClassMap: Record<EmployeeAuthLinkStatus, string> = {
  UNLINKED: "bg-orange-50 text-orange-700 border-orange-200",
  LINKED: "bg-cyan-50 text-cyan-700 border-cyan-200",
};

function formatDateTime(value?: string) {
  if (!value) {
    return "-";
  }

  return toYYYYMMDDHHmm(new Date(value)).replace("T", " ");
}

function formatDate(value?: string) {
  return value || "-";
}

function formatNumber(value: number) {
  return value.toLocaleString("ja-JP");
}

function formatPostalCode(postalCode?: string) {
  if (!postalCode) {
    return "-";
  }

  const digits = postalCode.replace(/\D/g, "");
  if (digits.length !== 7) {
    return postalCode;
  }

  return `${digits.slice(0, 3)}-${digits.slice(3)}`;
}

function formatAddress(employee: EmployeeManagementEmployee) {
  const address = employee.address;
  if (!address) {
    return "-";
  }

  return [address.prefecture, address.city, address.building].filter(Boolean).join(" ");
}

function StatCard({ label, value, description, accentClassName }: StatCardProps) {
  return (
    <div className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
      <div className={`h-1.5 w-16 rounded-full ${accentClassName}`} />
      <div className="mt-6 text-4xl font-bold text-slate-900">{value}</div>
      <div className="mt-2 text-base font-semibold text-slate-700">{label}</div>
      <div className="mt-1 text-sm text-slate-500">{description}</div>
    </div>
  );
}

function buildExportRows(employees: EmployeeManagementEmployee[]) {
  return [
    [
      "氏名",
      "フリガナ",
      "ユーザーID",
      "部署",
      "権限",
      "状態",
      "Cognito連携",
      "メールアドレス",
      "電話番号",
      "郵便番号",
      "住所",
      "建物名・部屋番号",
      "ポイント",
      "達成率",
      "入社日",
      "最終ログイン",
    ],
    ...employees.map((employee) => [
      employee.name,
      employee.nameKana ?? "-",
      employee.userId,
      employee.departmentName ?? "-",
      employee.roles.map((role) => roleLabelMap[role]).join(" / "),
      statusLabelMap[employee.status],
      authLinkLabelMap[employee.authLinkStatus],
      employee.email,
      employee.phoneNumber ?? "-",
      formatPostalCode(employee.address?.postalCode),
      [employee.address?.prefecture, employee.address?.city].filter(Boolean).join(" ") || "-",
      employee.address?.building ?? "-",
      employee.pointBalance,
      `${employee.completionRate}%`,
      formatDate(employee.joinedAt),
      formatDateTime(employee.lastLoginAt),
    ]),
  ];
}

function getEmployeeColumns(
  pointUnitLabel: string,
  onEditEmployee: (employee: EmployeeManagementEmployee) => void,
  onDeleteEmployee: (employee: EmployeeManagementEmployee) => void,
): ColumnDef<EmployeeManagementEmployee>[] {
  return [
    {
      id: "name",
      label: "氏名",
      width: "24%",
      render: (row) => (
        <div className="min-w-[220px]">
          <div className="font-semibold text-slate-900">{row.name}</div>
          <div className="mt-1 text-xs text-slate-500">{row.nameKana || "-"}</div>
          <div className="mt-1 text-xs text-slate-500">
            {row.userId} / 入社日 {formatDate(row.joinedAt)}
          </div>
        </div>
      ),
    },
    {
      id: "departmentName",
      label: "部署 / 権限 / 状態",
      width: "28%",
      render: (row) => (
        <div className="flex min-w-[220px] flex-wrap gap-2">
          {row.departmentName ? (
            <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
              {row.departmentName}
            </span>
          ) : null}
          {row.roles.map((role) => (
            <span
              key={`${row.userId}-${role}`}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${roleBadgeClassMap[role]}`}
            >
              {roleLabelMap[role]}
            </span>
          ))}
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusBadgeClassMap[row.status]}`}>
            {statusLabelMap[row.status]}
          </span>
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${authLinkBadgeClassMap[row.authLinkStatus]}`}>
            {authLinkLabelMap[row.authLinkStatus]}
          </span>
        </div>
      ),
    },
    {
      id: "email",
      label: "連絡先",
      width: "28%",
      render: (row) => (
        <div className="min-w-[240px]">
          <div className="font-medium text-slate-900">{row.email}</div>
          <div className="mt-1 text-xs text-slate-500">電話番号: {row.phoneNumber || "-"}</div>
          <div className="mt-1 text-xs text-slate-500">住所: {formatAddress(row)}</div>
          <div className="mt-1 text-xs text-slate-500">
            {row.lastLoginAt ? `最終ログイン ${formatDateTime(row.lastLoginAt)}` : "最終ログインなし"}
          </div>
        </div>
      ),
    },
    {
      id: "pointBalance",
      label: "ポイント",
      align: "right",
      width: "12%",
      render: (row) => (
        <div className="min-w-[120px] text-right">
          <div className="font-bold text-emerald-600">
            {formatNumber(row.pointBalance)}
            {pointUnitLabel}
          </div>
          <div className="mt-1 text-xs text-slate-500">達成率 {row.completionRate}%</div>
        </div>
      ),
    },
    {
      id: "userId",
      label: "操作",
      align: "center",
      width: "8%",
      render: (row) => (
        <div className="flex items-center justify-center gap-1">
          <IconButton size="small" aria-label={`${row.name}を編集`} onClick={() => onEditEmployee(row)} sx={{ color: "#2563EB" }}>
            <FontAwesomeIcon icon={faPenToSquare} />
          </IconButton>
          <IconButton size="small" aria-label={`${row.name}を削除`} onClick={() => onDeleteEmployee(row)} sx={{ color: "#EF4444" }}>
            <FontAwesomeIcon icon={faTrashCan} />
          </IconButton>
        </div>
      ),
    },
  ];
}

export default function EmployeeManagement({ companyId, companyOptions, operatorName }: EmployeeManagementProps) {
  const router = useRouter();
  const activeCompany = useMemo(
    () => companyOptions.find((company) => company.companyId === companyId) ?? null,
    [companyId, companyOptions],
  );
  const selectedCompanyId = activeCompany?.companyId;
  const { summary, loading, error, reload } = useEmployeeManagementSummary(selectedCompanyId);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(8);
  const [notice, setNotice] = useState<string | null>(null);
  const [isRegistrationDialogOpen, setRegistrationDialogOpen] = useState(false);
  const [isDepartmentDialogOpen, setDepartmentDialogOpen] = useState(false);
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeManagementEmployee | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [updatingEmployee, setUpdatingEmployee] = useState(false);
  const [employeePendingDeletion, setEmployeePendingDeletion] = useState<EmployeeManagementEmployee | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingEmployee, setDeletingEmployee] = useState(false);
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const employees = useMemo(() => summary?.employees ?? [], [summary]);
  const departmentOptions = useMemo(() => summary?.departmentOptions ?? [], [summary]);
  const invitedEmployeeCount = useMemo(
    () => employees.filter((employee) => employee.status === "INVITED").length,
    [employees],
  );
  const unlinkedEmployeeCount = useMemo(
    () => employees.filter((employee) => employee.authLinkStatus === "UNLINKED").length,
    [employees],
  );

  const filteredEmployees = useMemo(() => {
    const normalizedQuery = deferredSearchQuery.trim().toLowerCase();

    return employees.filter((employee) => {
      const matchesDepartment = selectedDepartment === "all" || employee.departmentName === selectedDepartment;
      if (!matchesDepartment) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const searchableValues = [
        employee.name,
        employee.nameKana ?? "",
        employee.userId,
        employee.departmentName ?? "",
        employee.email,
        employee.phoneNumber ?? "",
        employee.address?.postalCode ?? "",
        employee.address?.prefecture ?? "",
        employee.address?.city ?? "",
        employee.address?.building ?? "",
        ...employee.roles.map((role) => roleLabelMap[role]),
        statusLabelMap[employee.status],
        authLinkLabelMap[employee.authLinkStatus],
      ]
        .join(" ")
        .toLowerCase();

      return searchableValues.includes(normalizedQuery);
    });
  }, [deferredSearchQuery, employees, selectedDepartment]);

  useEffect(() => {
    setPage(0);
  }, [deferredSearchQuery, selectedDepartment, selectedCompanyId]);

  useEffect(() => {
    if (selectedDepartment === "all") {
      return;
    }

    const departmentExists = departmentOptions.some((department) => department.name === selectedDepartment);
    if (!departmentExists) {
      setSelectedDepartment("all");
    }
  }, [departmentOptions, selectedDepartment]);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(filteredEmployees.length / rowsPerPage) - 1);
    if (page > maxPage) {
      setPage(maxPage);
    }
  }, [filteredEmployees.length, page, rowsPerPage]);

  const pagedEmployees = filteredEmployees.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const pointUnitLabel = summary?.pointUnitLabel ?? activeCompany?.pointUnitLabel ?? "pt";

  const handleCompanyChange = (nextCompanyId: string) => {
    setNotice(null);
    setSearchQuery("");
    setSelectedDepartment("all");
    setPage(0);
    router.push(`/user-registration?companyId=${encodeURIComponent(nextCompanyId)}`);
  };

  const handleRegisterEmployee = async (input: CreateEmployeeInput) => {
    if (!selectedCompanyId) {
      return;
    }

    try {
      setRegistering(true);
      setRegistrationError(null);
      const createdEmployee = await createEmployee(selectedCompanyId, input);

      setRegistrationDialogOpen(false);
      setSearchQuery("");
      setSelectedDepartment("all");
      setPage(0);
      setNotice(`${createdEmployee.name} を登録しました`);
      reload();
    } catch (err) {
      setRegistrationError(err instanceof Error ? err.message : "ユーザーの登録に失敗しました");
    } finally {
      setRegistering(false);
    }
  };

  const handleUpdateEmployee = async (input: UpdateEmployeeInput) => {
    if (!selectedCompanyId) {
      return;
    }

    try {
      setUpdatingEmployee(true);
      setEditError(null);
      const updatedEmployee = await updateEmployee(selectedCompanyId, input);

      setEditingEmployee(null);
      setNotice(`${updatedEmployee.name} を更新しました`);
      reload();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "ユーザー情報の更新に失敗しました");
    } finally {
      setUpdatingEmployee(false);
    }
  };

  const handleDeleteEmployee = async (userId: string): Promise<MutationResult> => {
    if (!selectedCompanyId) {
      return { ok: false, error: "会社が選択されていません" };
    }

    setDeletingEmployee(true);
    setDeleteError(null);

    try {
      const result = await deleteEmployee(selectedCompanyId, { userId });
      if (!result.ok) {
        setDeleteError(result.error);
        return result;
      }

      const deletedEmployeeName =
        employeePendingDeletion?.userId === userId
          ? employeePendingDeletion.name
          : employees.find((employee) => employee.userId === userId)?.name ?? userId;

      setEmployeePendingDeletion(null);
      setNotice(`${deletedEmployeeName} を削除しました`);
      reload();
      return result;
    } finally {
      setDeletingEmployee(false);
    }
  };

  const handleCreateDepartment = async (name: string): Promise<MutationResult> => {
    if (!selectedCompanyId) {
      return { ok: false, error: "会社が選択されていません" };
    }

    const result = await createDepartment(selectedCompanyId, { name });
    if (!result.ok) {
      return result;
    }

    setSelectedDepartment("all");
    setNotice(`部署「${name}」を追加しました`);
    reload();
    return result;
  };

  const handleRenameDepartment = async (currentName: string, nextName: string): Promise<MutationResult> => {
    if (!selectedCompanyId) {
      return { ok: false, error: "会社が選択されていません" };
    }

    const result = await renameDepartment(selectedCompanyId, { currentName, nextName });
    if (!result.ok) {
      return result;
    }

    setSelectedDepartment("all");
    setNotice(`部署名を「${nextName}」へ変更しました`);
    reload();
    return result;
  };

  const handleDeleteDepartment = async (name: string): Promise<MutationResult> => {
    if (!selectedCompanyId) {
      return { ok: false, error: "会社が選択されていません" };
    }

    const result = await deleteDepartment(selectedCompanyId, name);
    if (!result.ok) {
      return result;
    }

    setSelectedDepartment("all");
    setNotice(`部署「${name}」を削除しました`);
    reload();
    return result;
  };

  const companySelectorSection = (
    <section className="rounded-[28px] bg-white p-5 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.35)] lg:p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="text-sm font-semibold tracking-[0.18em] text-slate-400">TARGET COMPANY</div>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">対象会社の切り替え</h2>
          <p className="mt-2 text-sm leading-7 text-slate-500">
            会社を選ぶと、その会社に紐づくユーザー、部署、ポイント残高を表示します。
          </p>
        </div>

        <Link
          href="/company-registration"
          className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
        >
          <FontAwesomeIcon icon={faBuilding} />
          企業登録へ
        </Link>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,340px)_repeat(3,minmax(0,1fr))]">
        <TextField
          select
          label="対象会社"
          value={selectedCompanyId ?? ""}
          onChange={(event) => handleCompanyChange(event.target.value)}
          fullWidth
        >
          {companyOptions.map((company) => (
            <MenuItem key={company.companyId} value={company.companyId}>
              {company.companyName} ({company.companyId})
            </MenuItem>
          ))}
        </TextField>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
          <div className="text-sm font-semibold text-slate-500">選択中の会社</div>
          <div className="mt-2 text-lg font-bold text-slate-900">{activeCompany?.companyName ?? "-"}</div>
          <div className="mt-1 text-sm text-slate-500">{activeCompany?.companyId ?? "-"}</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
          <div className="text-sm font-semibold text-slate-500">プラン / ステータス</div>
          <div className="mt-2 text-lg font-bold text-slate-900">
            {activeCompany ? `${activeCompany.plan} / ${activeCompany.status}` : "-"}
          </div>
          <div className="mt-1 text-sm text-slate-500">
            月額単価 {formatNumber(activeCompany?.perEmployeeMonthlyFee ?? 0)} 円
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
          <div className="text-sm font-semibold text-slate-500">会社ポイント残高</div>
          <div className="mt-2 text-lg font-bold text-slate-900">
            {formatNumber(activeCompany?.companyPointBalance ?? 0)}
            {activeCompany?.pointUnitLabel ?? "pt"}
          </div>
          <div className="mt-1 text-sm text-slate-500">登録ユーザー {formatNumber(activeCompany?.employeeCount ?? 0)} 人</div>
        </div>
      </div>
    </section>
  );

  if (!companyOptions.length) {
    return (
      <div className="space-y-6 pb-5">
        <AdminPageHeader
          title="ユーザー管理"
          adminName={operatorName}
          backHref="/dashboard"
          subtitle="企業を選択して、ユーザー登録と部署管理を行います。"
        />

        <section className="rounded-[28px] bg-white p-8 shadow-lg shadow-slate-200/70">
          <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm">
              <FontAwesomeIcon icon={faBuilding} className="text-xl" />
            </div>
            <h2 className="mt-5 text-2xl font-bold text-slate-900">登録済みの会社がありません</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-500">
              先に会社を登録してください。companyId は自動採番されます。
            </p>
            <Link
              href="/company-registration"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              <FontAwesomeIcon icon={faPlus} />
              企業登録へ移動
            </Link>
          </div>
        </section>
      </div>
    );
  }

  if (loading && !summary) {
    return (
      <div className="space-y-6 pb-5">
        <AdminPageHeader
          title="ユーザー管理"
          adminName={operatorName}
          backHref="/dashboard"
          subtitle="企業を選択して、ユーザー登録と部署管理を行います。"
        />
        {companySelectorSection}
        <div className="h-32 animate-pulse rounded-[28px] bg-slate-200/70" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-40 animate-pulse rounded-[28px] bg-slate-200/70" />
          ))}
        </div>
        <div className="h-[420px] animate-pulse rounded-[28px] bg-slate-200/70" />
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="space-y-6 pb-5">
        <AdminPageHeader
          title="ユーザー管理"
          adminName={operatorName}
          backHref="/dashboard"
          subtitle="企業を選択して、ユーザー登録と部署管理を行います。"
        />
        {companySelectorSection}
        <div className="rounded-[28px] border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-700 shadow-sm">
          {error}
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="space-y-6 pb-5">
        <AdminPageHeader
          title="ユーザー管理"
          adminName={operatorName}
          backHref="/dashboard"
          subtitle="企業を選択して、ユーザー登録と部署管理を行います。"
        />
        {companySelectorSection}
      </div>
    );
  }

  const columns = getEmployeeColumns(pointUnitLabel, setEditingEmployee, setEmployeePendingDeletion);
  const footer = (
    <TablePagination
      component="div"
      count={filteredEmployees.length}
      page={page}
      onPageChange={(_event, nextPage) => setPage(nextPage)}
      rowsPerPage={rowsPerPage}
      onRowsPerPageChange={(event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
      }}
      rowsPerPageOptions={[8, 12, 24]}
      labelRowsPerPage="表示件数"
      labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
      sx={{ borderTop: "1px solid", borderColor: "grey.200" }}
    />
  );

  return (
    <div className="space-y-6 pb-5">
      <AdminPageHeader
        title="ユーザー管理"
        adminName={operatorName}
        backHref="/dashboard"
        subtitle="企業を選択して、ユーザー登録と部署管理を行います。"
      />

      {companySelectorSection}

      <section className="rounded-[28px] bg-white p-5 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.35)] lg:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-3">
            <Button
              variant="contained"
              startIcon={<FontAwesomeIcon icon={faPlus} />}
              onClick={() => {
                setRegistrationError(null);
                setRegistrationDialogOpen(true);
              }}
              sx={{ borderRadius: "14px", backgroundColor: "#2563EB", px: 2.5, py: 1.25 }}
            >
              ユーザー登録
            </Button>
            <Button
              variant="contained"
              startIcon={<FontAwesomeIcon icon={faBuilding} />}
              onClick={() => setDepartmentDialogOpen(true)}
              sx={{ borderRadius: "14px", backgroundColor: "#10B981", px: 2.5, py: 1.25 }}
            >
              部署管理
            </Button>
            <Button
              variant="contained"
              startIcon={<FontAwesomeIcon icon={faDownload} />}
              onClick={() =>
                downloadCsv(
                  `employee-management-${summary.companyId}-${new Date().toISOString().slice(0, 10)}.csv`,
                  buildExportRows(filteredEmployees),
                )
              }
              sx={{ borderRadius: "14px", backgroundColor: "#475569", px: 2.5, py: 1.25 }}
            >
              CSV 出力
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(0,340px)_220px]">
            <TextField
              size="small"
              fullWidth
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="氏名・フリガナ・メールアドレス・電話番号・部署で検索..."
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <FontAwesomeIcon icon={faMagnifyingGlass} className="text-slate-400" />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              select
              size="small"
              fullWidth
              value={selectedDepartment}
              onChange={(event) => setSelectedDepartment(event.target.value)}
            >
              <MenuItem value="all">全部署</MenuItem>
              {departmentOptions.map((departmentOption) => (
                <MenuItem key={departmentOption.name} value={departmentOption.name}>
                  {departmentOption.name}
                </MenuItem>
              ))}
            </TextField>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-500">
          <div className="rounded-full bg-slate-100 px-4 py-2">会社: {summary.companyName}</div>
          <div className="rounded-full bg-slate-100 px-4 py-2">平均達成率 {summary.averageCompletionRate}%</div>
          <div className="rounded-full bg-amber-50 px-4 py-2 text-amber-700">招待中 {invitedEmployeeCount} 人</div>
          <div className="rounded-full bg-orange-50 px-4 py-2 text-orange-700">未連携 {unlinkedEmployeeCount} 人</div>
          <div className="rounded-full bg-slate-100 px-4 py-2">更新 {formatDateTime(summary.updatedAt)}</div>
        </div>

        <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-4 text-sm text-indigo-900">
          User / Company / Department テーブルを使って管理しています。氏名は姓・名とフリガナ、連絡先は電話番号と住所まで保持します。
          ポイント調整は User.currentPointBalance と Company.companyPointBalance を同時に更新します。
        </div>

        {notice ? (
          <div className="mt-4 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-700">
            {notice}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="登録ユーザー数"
          value={`${summary.employeeCount}`}
          description="現在この会社で管理しているユーザー数"
          accentClassName="bg-gradient-to-r from-blue-500 to-cyan-400"
        />
        <StatCard
          label="部署数"
          value={`${summary.departmentCount}`}
          description="管理対象の有効な部署数"
          accentClassName="bg-gradient-to-r from-emerald-500 to-teal-400"
        />
        <StatCard
          label="ユーザーポイント"
          value={`${formatNumber(summary.totalEmployeePoints)}${pointUnitLabel}`}
          description="全ユーザーの currentPointBalance 合計"
          accentClassName="bg-gradient-to-r from-amber-500 to-orange-400"
        />
        <StatCard
          label="会社ポイント残高"
          value={`${formatNumber(summary.companyPointBalance)}${pointUnitLabel}`}
          description="Company.companyPointBalance"
          accentClassName="bg-gradient-to-r from-violet-500 to-fuchsia-400"
        />
      </section>

      <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
        <div className="mb-5 flex flex-col gap-4 border-b border-slate-100 pb-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <FontAwesomeIcon icon={faUsers} className="text-lg" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">ユーザー一覧</h2>
              <p className="text-sm text-slate-500">User テーブルに登録されているユーザー情報を表示しています。</p>
            </div>
          </div>

          <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600">
            {filteredEmployees.length} / {summary.employeeCount} 件を表示中
          </div>
        </div>

        {filteredEmployees.length ? (
          <Table columns={columns} rows={pagedEmployees} footer={footer} />
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
            条件に一致するユーザーが見つかりませんでした。
          </div>
        )}
      </section>

      <EmployeeRegistrationDialog
        open={isRegistrationDialogOpen}
        submitting={registering}
        error={registrationError}
        departmentOptions={departmentOptions}
        onClose={() => {
          if (!registering) {
            setRegistrationDialogOpen(false);
            setRegistrationError(null);
          }
        }}
        onSubmit={handleRegisterEmployee}
      />

      <EmployeeEditDialog
        open={Boolean(editingEmployee)}
        employee={editingEmployee}
        submitting={updatingEmployee}
        error={editError}
        pointUnitLabel={pointUnitLabel}
        departmentOptions={departmentOptions}
        onClose={() => {
          if (!updatingEmployee) {
            setEditingEmployee(null);
            setEditError(null);
          }
        }}
        onSubmit={handleUpdateEmployee}
      />

      <EmployeeDeleteDialog
        open={Boolean(employeePendingDeletion)}
        employee={employeePendingDeletion}
        submitting={deletingEmployee}
        error={deleteError}
        onClose={() => {
          if (!deletingEmployee) {
            setEmployeePendingDeletion(null);
            setDeleteError(null);
          }
        }}
        onSubmit={handleDeleteEmployee}
      />

      <DepartmentManagementDialog
        open={isDepartmentDialogOpen}
        departments={departmentOptions}
        onClose={() => setDepartmentDialogOpen(false)}
        onCreateDepartment={handleCreateDepartment}
        onRenameDepartment={handleRenameDepartment}
        onDeleteDepartment={handleDeleteDepartment}
      />
    </div>
  );
}
