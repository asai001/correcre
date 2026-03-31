"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { toYYYYMMDDHHmm } from "@correcre/lib";
import AdminPageHeader from "@admin/components/AdminPageHeader";
import Table, { type ColumnDef } from "@admin/components/Table";
import { downloadCsv } from "@admin/lib/csv";
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
  EmployeeAuthLinkStatus,
  CreateEmployeeInput,
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
import {
  Button,
  IconButton,
  InputAdornment,
  MenuItem,
  TablePagination,
  TextField,
} from "@mui/material";

type EmployeeManagementProps = {
  companyId: string;
  adminUserId?: string;
};

type StatCardProps = {
  label: string;
  value: string;
  description: string;
  accentClassName: string;
};

const roleLabelMap: Record<EmployeeManagementRole, string> = {
  EMPLOYEE: "一般",
  MANAGER: "マネージャー",
  ADMIN: "管理者",
};

const roleBadgeClassMap: Record<EmployeeManagementRole, string> = {
  EMPLOYEE: "bg-slate-100 text-slate-700 border-slate-200",
  MANAGER: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ADMIN: "bg-violet-50 text-violet-700 border-violet-200",
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
  UNLINKED: "認証未連携",
  LINKED: "認証連携済み",
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

function getEmployeeColumns(
  pointUnitLabel: string,
  onEditEmployee: (employee: EmployeeManagementEmployee) => void,
  onDeleteEmployee: (employee: EmployeeManagementEmployee) => void
): ColumnDef<EmployeeManagementEmployee>[] {
  return [
    {
      id: "name",
      label: "名前",
      width: "20%",
      render: (row) => (
        <div className="min-w-[150px]">
          <div className="font-semibold text-slate-900">{row.name}</div>
          <div className="mt-1 text-xs text-slate-500">loginId {row.loginId}</div>
          <div className="mt-1 text-xs text-slate-500">
            {row.userId} / 入社日 {formatDate(row.joinedAt)}
          </div>
        </div>
      ),
    },
    {
      id: "departments",
      label: "部署 / 権限 / 状態",
      width: "22%",
      render: (row) => (
        <div className="flex min-w-[190px] flex-wrap gap-2">
          {row.departments.map((department) => (
            <span
              key={`${row.userId}-${department}`}
              className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700"
            >
              {department}
            </span>
          ))}
          {row.roles.map((role) => (
            <span
              key={`${row.userId}-${role}`}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${roleBadgeClassMap[role]}`}
            >
              {roleLabelMap[role]}
            </span>
          ))}
          <span
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusBadgeClassMap[row.status]}`}
          >
            {statusLabelMap[row.status]}
          </span>
          <span
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${authLinkBadgeClassMap[row.authLinkStatus]}`}
          >
            {authLinkLabelMap[row.authLinkStatus]}
          </span>
        </div>
      ),
    },
    {
      id: "email",
      label: "メールアドレス",
      width: "18%",
      render: (row) => (
        <div className="min-w-[220px]">
          <div className="font-medium text-slate-900">{row.email}</div>
          <div className="mt-1 text-xs text-slate-500">
            {row.lastLoginAt ? `最終ログイン ${formatDateTime(row.lastLoginAt)}` : "初回ログイン待ち"}
          </div>
        </div>
      ),
    },
    {
      id: "phone",
      label: "連絡先",
      width: "13%",
    },
    {
      id: "address",
      label: "住所",
      width: "17%",
    },
    {
      id: "pointBalance",
      label: "保有ポイント",
      align: "right",
      width: "10%",
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
          <IconButton
            size="small"
            aria-label={`${row.name}を編集`}
            onClick={() => onEditEmployee(row)}
            sx={{ color: "#2563EB" }}
          >
            <FontAwesomeIcon icon={faPenToSquare} />
          </IconButton>
          <IconButton
            size="small"
            aria-label={`${row.name}を削除`}
            onClick={() => onDeleteEmployee(row)}
            sx={{ color: "#EF4444" }}
          >
            <FontAwesomeIcon icon={faTrashCan} />
          </IconButton>
        </div>
      ),
    },
  ];
}

export default function EmployeeManagement({ companyId, adminUserId }: EmployeeManagementProps) {
  const { summary, loading, error, reload } = useEmployeeManagementSummary(companyId, adminUserId);
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
    [employees]
  );
  const unlinkedEmployeeCount = useMemo(
    () => employees.filter((employee) => employee.authLinkStatus === "UNLINKED").length,
    [employees]
  );

  const filteredEmployees = useMemo(() => {
    const normalizedQuery = deferredSearchQuery.trim().toLowerCase();

    return employees.filter((employee) => {
      const matchesDepartment =
        selectedDepartment === "all" || employee.departments.includes(selectedDepartment);

      if (!matchesDepartment) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const searchableValues = [
        employee.name,
        employee.userId,
        employee.loginId,
        employee.departments.join(" "),
        employee.email,
        employee.phone,
        employee.address,
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
  }, [deferredSearchQuery, selectedDepartment]);

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
  const adminName = summary?.adminName ?? "システム管理者";

  const handleOpenRegistrationDialog = () => {
    setRegistrationError(null);
    setRegistrationDialogOpen(true);
  };

  const handleCloseRegistrationDialog = () => {
    if (registering) {
      return;
    }

    setRegistrationDialogOpen(false);
    setRegistrationError(null);
  };

  const handleOpenEditDialog = (employee: EmployeeManagementEmployee) => {
    setEditingEmployee(employee);
    setEditError(null);
  };

  const handleCloseEditDialog = () => {
    if (updatingEmployee) {
      return;
    }

    setEditingEmployee(null);
    setEditError(null);
  };

  const handleOpenDeleteDialog = (employee: EmployeeManagementEmployee) => {
    setEmployeePendingDeletion(employee);
    setDeleteError(null);
  };

  const handleCloseDeleteDialog = () => {
    if (deletingEmployee) {
      return;
    }

    setEmployeePendingDeletion(null);
    setDeleteError(null);
  };

  const handleRegisterEmployee = async (input: CreateEmployeeInput) => {
    try {
      setRegistering(true);
      setRegistrationError(null);

      const createdEmployee = await createEmployee(companyId, input);

      setRegistrationDialogOpen(false);
      setSearchQuery("");
      setSelectedDepartment("all");
      setPage(0);
      setNotice(`${createdEmployee.name}を招待登録しました。認証連携は初回ログイン後に行う想定です。`);
      reload();
    } catch (err) {
      setRegistrationError(err instanceof Error ? err.message : "従業員の登録に失敗しました");
    } finally {
      setRegistering(false);
    }
  };

  const handleUpdateEmployee = async (input: UpdateEmployeeInput) => {
    try {
      setUpdatingEmployee(true);
      setEditError(null);

      const updatedEmployee = await updateEmployee(companyId, input);

      setEditingEmployee(null);
      setNotice(`${updatedEmployee.name}を更新しました。`);
      reload();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "従業員情報の更新に失敗しました");
    } finally {
      setUpdatingEmployee(false);
    }
  };

  const handleDeleteEmployee = async (userId: string): Promise<MutationResult> => {
    setDeletingEmployee(true);
    setDeleteError(null);

    try {
      const result = await deleteEmployee(companyId, { userId });
      if (!result.ok) {
        setDeleteError(result.error);
        return result;
      }

      const deletedEmployeeName =
        employeePendingDeletion?.userId === userId
          ? employeePendingDeletion.name
          : employees.find((employee) => employee.userId === userId)?.name ?? userId;

      setEmployeePendingDeletion(null);
      setNotice(`${deletedEmployeeName}を削除しました。`);
      reload();
      return result;
    } finally {
      setDeletingEmployee(false);
    }
  };

  const handleCreateDepartment = async (name: string): Promise<MutationResult> => {
    const result = await createDepartment(companyId, { name });
    if (!result.ok) {
      return result;
    }
    setSelectedDepartment("all");
    setNotice(`部署「${name}」を追加しました。`);
    reload();
    return result;
  };

  const handleRenameDepartment = async (currentName: string, nextName: string): Promise<MutationResult> => {
    const result = await renameDepartment(companyId, { currentName, nextName });
    if (!result.ok) {
      return result;
    }
    setSelectedDepartment("all");
    setNotice(`部署名を「${nextName}」へ更新しました。`);
    reload();
    return result;
  };

  const handleDeleteDepartment = async (name: string): Promise<MutationResult> => {
    const result = await deleteDepartment(companyId, name);
    if (!result.ok) {
      return result;
    }
    setSelectedDepartment("all");
    setNotice(`部署「${name}」を削除しました。`);
    reload();
    return result;
  };

  if (loading && !summary) {
    return (
      <div className="space-y-6 pb-5">
        <AdminPageHeader title="ユーザー登録・管理" adminName={adminName} />
        <div className="h-24 animate-pulse rounded-[28px] bg-slate-200/70" />
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
        <AdminPageHeader title="ユーザー登録・管理" adminName={adminName} />
        <div className="my-5 rounded-[28px] border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-700 shadow-sm">
          {error}
        </div>
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  const pointUnitLabel = summary.pointUnitLabel;
  const columns = getEmployeeColumns(pointUnitLabel, handleOpenEditDialog, handleOpenDeleteDialog);
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
        title="ユーザー登録・管理"
        adminName={summary.adminName}
        subtitle="運営用の事前招待登録と認証連携状況の確認"
      />

      <section className="rounded-[28px] bg-white p-5 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.35)] lg:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-3">
            <Button
              variant="contained"
              startIcon={<FontAwesomeIcon icon={faPlus} />}
              onClick={handleOpenRegistrationDialog}
              sx={{
                borderRadius: "14px",
                backgroundColor: "#2563EB",
                px: 2.5,
                py: 1.25,
              }}
            >
              ユーザーを招待登録
            </Button>
            <Button
              variant="contained"
              startIcon={<FontAwesomeIcon icon={faBuilding} />}
              onClick={() => setDepartmentDialogOpen(true)}
              sx={{
                borderRadius: "14px",
                backgroundColor: "#10B981",
                px: 2.5,
                py: 1.25,
              }}
            >
              部署管理
            </Button>
            <Button
              variant="contained"
              startIcon={<FontAwesomeIcon icon={faDownload} />}
              onClick={() =>
                downloadCsv(
                  `employee-management-${new Date().toISOString().slice(0, 10)}.csv`,
                  [
                    [
                      "名前",
                      "ユーザーID",
                      "ログインID",
                      "所属部署",
                      "権限",
                      "招待状態",
                      "認証連携",
                      "メールアドレス",
                      "連絡先",
                      "住所",
                      "保有ポイント",
                      "達成率",
                      "入社日",
                      "最終ログイン",
                    ],
                    ...filteredEmployees.map((employee) => [
                      employee.name,
                      employee.userId,
                      employee.loginId,
                      employee.departments.join(" / "),
                      employee.roles.map((role) => roleLabelMap[role]).join(" / "),
                      statusLabelMap[employee.status],
                      authLinkLabelMap[employee.authLinkStatus],
                      employee.email,
                      employee.phone,
                      employee.address,
                      employee.pointBalance,
                      `${employee.completionRate}%`,
                      formatDate(employee.joinedAt),
                      formatDateTime(employee.lastLoginAt),
                    ]),
                  ]
                )
              }
              sx={{
                borderRadius: "14px",
                backgroundColor: "#475569",
                px: 2.5,
                py: 1.25,
              }}
            >
              データエクスポート
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(0,340px)_220px]">
            <TextField
              size="small"
              fullWidth
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="名前・loginId・メール・部署で検索..."
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
          <div className="rounded-full bg-slate-100 px-4 py-2">会社名 {summary.companyName}</div>
          <div className="rounded-full bg-slate-100 px-4 py-2">平均達成率 {summary.averageCompletionRate}%</div>
          <div className="rounded-full bg-amber-50 px-4 py-2 text-amber-700">招待中 {invitedEmployeeCount} 名</div>
          <div className="rounded-full bg-orange-50 px-4 py-2 text-orange-700">認証未連携 {unlinkedEmployeeCount} 名</div>
          <div className="rounded-full bg-slate-100 px-4 py-2">最終更新 {formatDateTime(summary.updatedAt)}</div>
        </div>

        <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-4 text-sm text-indigo-900">
          この画面は、DynamoDB への手入力をやめて運営側が事前招待登録を行うための画面です。
          認証連携IDはここでは直接入力せず、初回ログイン後の連携で管理する前提にしています。
          登録時は `loginId` と `email` の重複をサーバー側でも検証します。
        </div>

        {notice && (
          <div className="mt-4 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-700">{notice}</div>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="総従業員数"
          value={`${summary.employeeCount}`}
          description="管理対象の従業員アカウント数"
          accentClassName="bg-gradient-to-r from-blue-500 to-cyan-400"
        />
        <StatCard
          label="部署数"
          value={`${summary.departmentCount}`}
          description="登録されている所属部署の数"
          accentClassName="bg-gradient-to-r from-emerald-500 to-teal-400"
        />
        <StatCard
          label="総保有ポイント"
          value={`${formatNumber(summary.totalEmployeePoints)}${pointUnitLabel}`}
          description="従業員全体の保有ポイント合計"
          accentClassName="bg-gradient-to-r from-amber-500 to-orange-400"
        />
        <StatCard
          label="企業保有ポイント"
          value={`${formatNumber(summary.companyPointBalance)}${pointUnitLabel}`}
          description="会社アカウントが保有している残高"
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
              <h2 className="text-xl font-bold text-slate-900">登録済みユーザー一覧</h2>
              <p className="text-sm text-slate-500">部署、権限、招待状態、認証連携状態を一覧で確認できます。</p>
            </div>
          </div>

          <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600">
            {filteredEmployees.length} / {summary.employeeCount} 名を表示中
          </div>
        </div>

        {filteredEmployees.length ? (
          <Table columns={columns} rows={pagedEmployees} footer={footer} />
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
            条件に一致する従業員が見つかりませんでした。検索条件か部署フィルタを調整してください。
          </div>
        )}
      </section>

      <EmployeeRegistrationDialog
        open={isRegistrationDialogOpen}
        submitting={registering}
        error={registrationError}
        departmentOptions={departmentOptions}
        onClose={handleCloseRegistrationDialog}
        onSubmit={handleRegisterEmployee}
      />

      <EmployeeEditDialog
        open={Boolean(editingEmployee)}
        employee={editingEmployee}
        submitting={updatingEmployee}
        error={editError}
        pointUnitLabel={pointUnitLabel}
        departmentOptions={departmentOptions}
        onClose={handleCloseEditDialog}
        onSubmit={handleUpdateEmployee}
      />

      <EmployeeDeleteDialog
        open={Boolean(employeePendingDeletion)}
        employee={employeePendingDeletion}
        submitting={deletingEmployee}
        error={deleteError}
        onClose={handleCloseDeleteDialog}
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
