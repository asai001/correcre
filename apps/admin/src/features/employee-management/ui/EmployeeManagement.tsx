"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { toYYYYMMDDHHmm } from "@correcre/lib";
import AdminPageHeader from "@admin/components/AdminPageHeader";
import Table, { type ColumnDef } from "@admin/components/Table";
import { useEmployeeManagementSummary } from "../hooks/useEmployeeManagementSummary";
import type { EmployeeManagementEmployee, EmployeeManagementRole } from "../model/types";
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

function formatDateTime(value?: string) {
  if (!value) {
    return "-";
  }

  return toYYYYMMDDHHmm(new Date(value)).replace("T", " ");
}

function formatDate(value?: string) {
  if (!value) {
    return "-";
  }

  return value;
}

function formatNumber(value: number) {
  return value.toLocaleString("ja-JP");
}

function escapeCsvField(value: string | number) {
  const normalized = String(value).replaceAll('"', '""');
  return `"${normalized}"`;
}

function downloadCsv(filename: string, rows: Array<Array<string | number>>) {
  const csv = `\uFEFF${rows.map((row) => row.map(escapeCsvField).join(",")).join("\r\n")}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.click();

  window.URL.revokeObjectURL(url);
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
  onPlaceholderAction: (actionLabel: string, employeeName?: string) => void
): ColumnDef<EmployeeManagementEmployee>[] {
  return [
    {
      id: "name",
      label: "名前",
      width: "20%",
      render: (row) => (
        <div className="min-w-[150px]">
          <div className="font-semibold text-slate-900">{row.name}</div>
          <div className="mt-1 text-xs text-slate-500">
            {row.userId} / 入社日 {formatDate(row.joinedAt)}
          </div>
        </div>
      ),
    },
    {
      id: "department",
      label: "部署 / 権限",
      width: "18%",
      render: (row) => (
        <div className="flex min-w-[170px] flex-wrap gap-2">
          <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
            {row.department}
          </span>
          {row.roles.map((role) => (
            <span
              key={`${row.userId}-${role}`}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${roleBadgeClassMap[role]}`}
            >
              {roleLabelMap[role]}
            </span>
          ))}
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
          <div className="mt-1 text-xs text-slate-500">最終ログイン {formatDateTime(row.lastLoginAt)}</div>
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
            onClick={() => onPlaceholderAction("編集", row.name)}
            sx={{ color: "#2563EB" }}
          >
            <FontAwesomeIcon icon={faPenToSquare} />
          </IconButton>
          <IconButton
            size="small"
            aria-label={`${row.name}を削除`}
            onClick={() => onPlaceholderAction("削除", row.name)}
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
  const { summary, loading, error } = useEmployeeManagementSummary(companyId, adminUserId);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(8);
  const [notice, setNotice] = useState<string | null>(null);
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const employees = useMemo(() => summary?.employees ?? [], [summary]);

  const departments = useMemo(
    () => ["all", ...new Set(employees.map((employee) => employee.department))],
    [employees]
  );

  const filteredEmployees = useMemo(() => {
    const normalizedQuery = deferredSearchQuery.trim().toLowerCase();

    return employees.filter((employee) => {
      const matchesDepartment = selectedDepartment === "all" || employee.department === selectedDepartment;
      if (!matchesDepartment) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const searchableValues = [
        employee.name,
        employee.userId,
        employee.department,
        employee.email,
        employee.phone,
        employee.address,
        ...employee.roles.map((role) => roleLabelMap[role]),
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
    const maxPage = Math.max(0, Math.ceil(filteredEmployees.length / rowsPerPage) - 1);
    if (page > maxPage) {
      setPage(maxPage);
    }
  }, [filteredEmployees.length, page, rowsPerPage]);

  const pagedEmployees = filteredEmployees.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const adminName = summary?.adminName ?? "システム管理者";

  if (loading) {
    return (
      <div className="space-y-6 pb-5">
        <AdminPageHeader title="従業員管理" adminName={adminName} />
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

  if (error || !summary) {
    return (
      <div className="space-y-6 pb-5">
        <AdminPageHeader title="従業員管理" adminName={adminName} />
        <div className="my-5 rounded-[28px] border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-700 shadow-sm">
          {error ?? "従業員管理データを表示できませんでした。"}
        </div>
      </div>
    );
  }

  const pointUnitLabel = summary.pointUnitLabel;
  const columns = getEmployeeColumns(pointUnitLabel, (actionLabel, employeeName) => {
    setNotice(`${employeeName ? `${employeeName}の` : ""}${actionLabel}機能は未接続です。画面モックとして実装しています。`);
  });
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
      <AdminPageHeader title="従業員管理" adminName={summary.adminName} />

      <section className="rounded-[28px] bg-white p-5 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.35)] lg:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-3">
            <Button
              variant="contained"
              startIcon={<FontAwesomeIcon icon={faPlus} />}
              onClick={() => setNotice("新規従業員登録機能は未接続です。画面モックとして実装しています。")}
              sx={{
                borderRadius: "14px",
                backgroundColor: "#2563EB",
                px: 2.5,
                py: 1.25,
              }}
            >
              新規従業員登録
            </Button>
            <Button
              variant="contained"
              startIcon={<FontAwesomeIcon icon={faBuilding} />}
              onClick={() => setNotice("部署管理機能は未接続です。画面モックとして実装しています。")}
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
                      "部署",
                      "権限",
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
                      employee.department,
                      employee.roles.map((role) => roleLabelMap[role]).join(" / "),
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
              placeholder="名前・メール・部署で検索..."
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
              {departments
                .filter((department) => department !== "all")
                .map((department) => (
                  <MenuItem key={department} value={department}>
                    {department}
                  </MenuItem>
                ))}
            </TextField>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-500">
          <div className="rounded-full bg-slate-100 px-4 py-2">会社名 {summary.companyName}</div>
          <div className="rounded-full bg-slate-100 px-4 py-2">平均達成率 {summary.averageCompletionRate}%</div>
          <div className="rounded-full bg-slate-100 px-4 py-2">最終更新 {formatDateTime(summary.updatedAt)}</div>
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
          description="アクティブな所属部署の数"
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
              <h2 className="text-xl font-bold text-slate-900">従業員一覧</h2>
              <p className="text-sm text-slate-500">所属、連絡先、ポイント残高を一覧で確認できます。</p>
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
    </div>
  );
}
