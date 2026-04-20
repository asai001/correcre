"use client";

import Link from "next/link";
import { Fragment, startTransition, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, MenuItem, TextField } from "@mui/material";
import {
  CompanyPhilosophyFields,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@correcre/ui";
import {
  createCompanyFormStateFromCompany,
  createEmptyCompanyPhilosophyItem,
  getCompanyFormState,
  planOptions,
  statusOptions,
  toUpdateCompanyInput,
  type CompanyFormState,
} from "@correcre/lib/company-management-form";
import { toYYYYMMDDHHmm } from "@correcre/lib";
import AdminPageHeader from "@admin/components/AdminPageHeader";
import { createDepartment } from "@admin/features/employee-management/api/client";

import { updateAdminCompanyInfo } from "../api/client";
import type { AdminInfoData } from "../model/types";

type AdminInfoProps = {
  initialData: AdminInfoData;
  canEdit: boolean;
};

type CompanyDetailsFormState = {
  shortName: string;
};

function formatDateTime(value?: string) {
  if (!value) {
    return "-";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return toYYYYMMDDHHmm(date).replace("T", " ");
}

function normalizeOptionalText(value: string) {
  const normalizedValue = value.trim();
  return normalizedValue ? normalizedValue : undefined;
}

function createCompanyDetailsFormState(data: AdminInfoData["company"]): CompanyDetailsFormState {
  return {
    shortName: data.shortName ?? "",
  };
}

function InfoCard({
  title,
  description,
  children,
}: Readonly<{
  title: string;
  description: string;
  children: ReactNode;
}>) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/70">
      <div className="mb-5 border-b border-slate-100 pb-4">
        <h2 className="text-xl font-bold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      {children}
    </section>
  );
}

export default function AdminInfo({ initialData, canEdit }: AdminInfoProps) {
  const router = useRouter();
  const [companyForm, setCompanyForm] = useState<CompanyFormState>(() =>
    createCompanyFormStateFromCompany(initialData.editableCompany),
  );
  const [companyDetails, setCompanyDetails] = useState<CompanyDetailsFormState>(() =>
    createCompanyDetailsFormState(initialData.company),
  );
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [departmentName, setDepartmentName] = useState("");
  const [departmentError, setDepartmentError] = useState<string | null>(null);
  const [departmentSubmitting, setDepartmentSubmitting] = useState(false);
  const [expandedDepartmentIds, setExpandedDepartmentIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setCompanyForm(createCompanyFormStateFromCompany(initialData.editableCompany));
    setCompanyDetails(createCompanyDetailsFormState(initialData.company));
    setExpandedDepartmentIds({});
  }, [initialData]);

  const { validation } = useMemo(() => getCompanyFormState(companyForm), [companyForm]);
  const hasCompanyFormValidationError = validation.name || validation.philosophyItems.some((item) => item.label || item.content);
  const readOnlyMessage =
    "既存の権限制御に合わせ、この画面は現在閲覧のみです。編集が必要な場合は運用者権限のあるアカウントで操作してください。";

  const handleSaveCompanyInfo = async () => {
    if (!canEdit) {
      return;
    }

    setHasSubmitted(true);
    setError(null);
    setNotice(null);

    if (hasCompanyFormValidationError) {
      setError("入力内容を確認してください");
      return;
    }

    try {
      setSubmitting(true);
      const baseCompanyForm: CompanyFormState = {
        ...companyForm,
        perEmployeeMonthlyFee: String(initialData.editableCompany.perEmployeeMonthlyFee),
        companyPointBalance: String(initialData.editableCompany.companyPointBalance),
        pointUnitLabel: initialData.editableCompany.pointUnitLabel,
      };

      await updateAdminCompanyInfo({
        ...toUpdateCompanyInput(
          initialData.editableCompany.companyId,
          baseCompanyForm,
          initialData.editableCompany.perEmployeeMonthlyFee,
          initialData.editableCompany.companyPointBalance,
        ),
        shortName: normalizeOptionalText(companyDetails.shortName),
        contactName: initialData.company.contactName,
        contactEmail: initialData.company.contactEmail,
        contactPhone: initialData.company.contactPhone,
        billingEmail: initialData.company.billingEmail,
        logoImageUrl: initialData.company.logoImageUrl,
        primaryColor: initialData.company.primaryColor,
        pointConversionRate: initialData.company.pointConversionRate ?? null,
      });

      setNotice("各種情報を更新しました");
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "各種情報の更新に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddPhilosophyItem = () => {
    if (!canEdit) {
      return;
    }

    setCompanyForm((current) => ({
      ...current,
      philosophyItems: [...current.philosophyItems, createEmptyCompanyPhilosophyItem()],
    }));
  };

  const handleChangePhilosophyItem = (
    itemId: string,
    nextItem: Partial<CompanyFormState["philosophyItems"][number]>,
  ) => {
    if (!canEdit) {
      return;
    }

    setCompanyForm((current) => ({
      ...current,
      philosophyItems: current.philosophyItems.map((item) => (item.id === itemId ? { ...item, ...nextItem } : item)),
    }));
  };

  const handleRemovePhilosophyItem = (itemId: string) => {
    if (!canEdit) {
      return;
    }

    setCompanyForm((current) => ({
      ...current,
      philosophyItems: current.philosophyItems.filter((item) => item.id !== itemId),
    }));
  };

  const handleCreateDepartment = async () => {
    if (!canEdit) {
      return;
    }

    const normalizedDepartmentName = departmentName.trim();

    if (!normalizedDepartmentName) {
      setDepartmentError("部署名を入力してください");
      return;
    }

    try {
      setDepartmentSubmitting(true);
      setDepartmentError(null);
      setNotice(null);

      const result = await createDepartment(initialData.company.companyId, { name: normalizedDepartmentName });

      if (!result.ok) {
        setDepartmentError(result.error);
        return;
      }

      setDepartmentName("");
      setNotice(`部署「${normalizedDepartmentName}」を追加しました`);
      startTransition(() => {
        router.refresh();
      });
    } finally {
      setDepartmentSubmitting(false);
    }
  };

  const handleToggleDepartment = (departmentId: string) => {
    setExpandedDepartmentIds((current) => ({
      ...current,
      [departmentId]: !current[departmentId],
    }));
  };

  return (
    <div className="space-y-6 pb-5">
      <AdminPageHeader
        title="各種情報画面"
        adminName={initialData.account.name}
        subtitle="理念体系、会社情報、ポイント設定、部署、ミッション定義をまとめて確認します。"
      />

      {!canEdit ? <Alert severity="info">{readOnlyMessage}</Alert> : null}
      {notice ? <Alert severity="success">{notice}</Alert> : null}
      {error ? <Alert severity="error">{error}</Alert> : null}

      <Tabs defaultValue="philosophy">
        <TabsList className="bg-slate-100/90">
          <TabsTrigger
            value="philosophy"
            className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white data-[state=active]:shadow-[0_12px_24px_-16px_rgba(8,145,178,0.9)]"
          >
            理念体系
          </TabsTrigger>
          <TabsTrigger
            value="company"
            className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white data-[state=active]:shadow-[0_12px_24px_-16px_rgba(8,145,178,0.9)]"
          >
            会社情報
          </TabsTrigger>
          <TabsTrigger
            value="points"
            className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white data-[state=active]:shadow-[0_12px_24px_-16px_rgba(8,145,178,0.9)]"
          >
            ポイント設定
          </TabsTrigger>
          <TabsTrigger
            value="departments"
            className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white data-[state=active]:shadow-[0_12px_24px_-16px_rgba(8,145,178,0.9)]"
          >
            部署一覧
          </TabsTrigger>
          <TabsTrigger
            value="missions"
            className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white data-[state=active]:shadow-[0_12px_24px_-16px_rgba(8,145,178,0.9)]"
          >
            ミッション項目
          </TabsTrigger>
        </TabsList>

        <TabsContent value="philosophy">
          <InfoCard
            title="理念体系の編集"
            description="運用者画面と同じ理念体系コンポーネントを再利用しています。ミッション、ビジョン、バリュー、クレドなどを柔軟に管理できます。"
          >
            {!canEdit ? <Alert severity="info">{readOnlyMessage}</Alert> : null}

            <div className={!canEdit ? "pointer-events-none opacity-70" : undefined}>
              <CompanyPhilosophyFields
                items={companyForm.philosophyItems}
                validation={validation.philosophyItems}
                hasSubmitted={hasSubmitted}
                onAdd={handleAddPhilosophyItem}
                onChangeItem={handleChangePhilosophyItem}
                onRemoveItem={handleRemovePhilosophyItem}
              />
            </div>

            {canEdit ? (
              <div className="mt-5 flex justify-end">
                <Button variant="contained" onClick={handleSaveCompanyInfo} disabled={submitting}>
                  {submitting ? "保存中..." : "理念体系を保存"}
                </Button>
              </div>
            ) : null}
          </InfoCard>
        </TabsContent>

        <TabsContent value="company">
          <InfoCard
            title="会社情報"
            description="会社名、表示名、契約状態などの基本情報を確認できます。必要な項目だけ段階的に運用へ載せられるよう、空欄のままでも保存できます。"
          >
            {!canEdit ? <Alert severity="info">{readOnlyMessage}</Alert> : null}

            <div className="grid gap-4 md:grid-cols-2">
              <TextField
                label="会社ID"
                value={initialData.company.companyId}
                fullWidth
                slotProps={{ input: { readOnly: true } }}
              />
              <TextField
                label="最終更新日時"
                value={formatDateTime(initialData.company.updatedAt)}
                fullWidth
                slotProps={{ input: { readOnly: true } }}
              />
              <TextField
                label="会社名"
                value={companyForm.name}
                onChange={(event) => setCompanyForm((current) => ({ ...current, name: event.target.value }))}
                required
                disabled={!canEdit}
                error={hasSubmitted && validation.name}
                helperText={hasSubmitted && validation.name ? "会社名を入力してください" : " "}
                fullWidth
              />
              <TextField
                label="表示名"
                value={companyDetails.shortName}
                onChange={(event) => setCompanyDetails((current) => ({ ...current, shortName: event.target.value }))}
                disabled={!canEdit}
                helperText="ダッシュボードなどで表示する短い会社名です。未入力の場合は会社名を使用します。"
                fullWidth
              />
              <TextField
                select
                label="ステータス"
                value={companyForm.status}
                disabled
                fullWidth
              >
                {statusOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="プラン"
                value={companyForm.plan}
                disabled
                fullWidth
              >
                {planOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </div>

            {canEdit ? (
              <div className="mt-5 flex justify-end">
                <Button variant="contained" onClick={handleSaveCompanyInfo} disabled={submitting}>
                  {submitting ? "保存中..." : "会社情報を保存"}
                </Button>
              </div>
            ) : null}
          </InfoCard>
        </TabsContent>

        <TabsContent value="points">
          <InfoCard
            title="ポイント設定"
            description="会社ポイント残高、ポイント単位、月額単価を確認できます。"
          >
            {!canEdit ? <Alert severity="info">{readOnlyMessage}</Alert> : null}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <TextField
                label="会社ポイント残高"
                type="number"
                value={companyForm.companyPointBalance}
                disabled
                fullWidth
              />
              <TextField
                label="ポイント単位"
                value={companyForm.pointUnitLabel}
                disabled
                fullWidth
              />
              <TextField
                label="月額単価"
                type="number"
                value={companyForm.perEmployeeMonthlyFee}
                disabled
                fullWidth
              />
            </div>
          </InfoCard>
        </TabsContent>

        <TabsContent value="departments">
          <InfoCard
            title="部署一覧"
            description="部署マスタを一覧で確認できます。各行を開くと、その部署に所属する従業員一覧も確認できます。"
          >
            {!canEdit ? <Alert severity="info">{readOnlyMessage}</Alert> : null}

            {canEdit ? (
              <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_160px]">
                <TextField
                  label="新しい部署名"
                  value={departmentName}
                  onChange={(event) => setDepartmentName(event.target.value)}
                  fullWidth
                />
                <Button variant="contained" onClick={handleCreateDepartment} disabled={departmentSubmitting}>
                  {departmentSubmitting ? "追加中..." : "部署を追加"}
                </Button>
              </div>
            ) : null}

            {departmentError ? <Alert severity="error">{departmentError}</Alert> : null}

            {initialData.departments.length ? (
              <div className="mt-4 rounded-2xl border border-slate-200">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>部署名</TableHead>
                      <TableHead className="text-center">状態</TableHead>
                      <TableHead className="text-center">所属人数</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {initialData.departments.map((department) => {
                      const isExpanded = Boolean(expandedDepartmentIds[department.departmentId]);

                      return (
                        <Fragment key={department.departmentId}>
                          <TableRow className={isExpanded ? "bg-slate-50/70" : undefined}>
                            <TableCell>
                              <button
                                type="button"
                                onClick={() => handleToggleDepartment(department.departmentId)}
                                aria-expanded={isExpanded}
                                className="flex w-full items-center gap-3 text-left"
                              >
                                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition">
                                  <svg
                                    viewBox="0 0 20 20"
                                    fill="none"
                                    aria-hidden="true"
                                    className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                                  >
                                    <path
                                      d="M7 5.5L12 10L7 14.5"
                                      stroke="currentColor"
                                      strokeWidth="1.75"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                </span>
                                <span className="font-medium text-slate-900">{department.name}</span>
                              </button>
                            </TableCell>
                            <TableCell className="text-center">{department.status}</TableCell>
                            <TableCell className="text-center">{department.employeeCount} 人</TableCell>
                          </TableRow>
                          {isExpanded ? (
                            <TableRow className="hover:bg-transparent">
                              <TableCell colSpan={3} className="bg-slate-50 px-6 py-4">
                                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                  <div className="text-sm font-semibold text-slate-700">所属従業員一覧</div>
                                  {department.employees.length ? (
                                    <ul className="mt-3 space-y-2">
                                      {department.employees.map((employee) => (
                                        <li
                                          key={employee.userId}
                                          className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
                                        >
                                          <div className="font-medium text-slate-900">{employee.name}</div>
                                          <div className="mt-1 text-xs text-slate-500">{employee.email}</div>
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <div className="mt-3 text-sm text-slate-500">所属従業員はいません。</div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : null}
                        </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
                まだ部署は登録されていません。
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <Link
                href="/employee-management"
                className="inline-flex items-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
              >
                ユーザー管理で詳細を見る
              </Link>
            </div>
          </InfoCard>
        </TabsContent>

        <TabsContent value="missions">
          <InfoCard
            title="ミッション項目一覧"
            description="現在有効なミッション定義を一覧表示します。将来の編集機能追加に備え、ここを管理画面の確認起点として残しています。"
          >
            {/* TODO: ミッション編集 API が整い次第、この画面に編集導線を追加する */}
            {initialData.missions.length ? (
              <div className="rounded-2xl border border-slate-200">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>項目名</TableHead>
                      <TableHead className="text-center">カテゴリ</TableHead>
                      <TableHead className="text-center">点数</TableHead>
                      <TableHead className="text-center">回数</TableHead>
                      <TableHead className="text-center">入力項目数</TableHead>
                      <TableHead className="text-center">状態</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {initialData.missions.map((mission) => (
                      <TableRow key={`${mission.missionId}-${mission.version}`}>
                        <TableCell>
                          <div className="font-medium text-slate-900">{mission.title}</div>
                          <div className="mt-1 text-xs text-slate-500">{mission.description}</div>
                        </TableCell>
                        <TableCell className="text-center">{mission.category}</TableCell>
                        <TableCell className="text-center">{mission.score} 点</TableCell>
                        <TableCell className="text-center">{mission.monthlyCount} 回</TableCell>
                        <TableCell className="text-center">{mission.fields.length} 項目</TableCell>
                        <TableCell className="text-center">{mission.enabled ? "有効" : "無効"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
                ミッション定義はまだ登録されていません。
              </div>
            )}
          </InfoCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
