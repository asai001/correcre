"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { toYYYYMMDDHHmm } from "@correcre/lib";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowUpRightFromSquare, faBuilding, faCirclePlus } from "@fortawesome/free-solid-svg-icons";
import { Alert, Button, MenuItem, TextField } from "@mui/material";

import AdminPageHeader from "@operator/components/AdminPageHeader";
import { createCompany } from "../api/client";
import type {
  CreateCompanyInput,
  OperatorCompanyPlan,
  OperatorCompanyStatus,
  OperatorCompanySummary,
} from "../model/types";

type CompanyRegistrationProps = {
  initialCompanies: OperatorCompanySummary[];
  operatorName: string;
};

type CompanyFormState = {
  name: string;
  status: OperatorCompanyStatus;
  plan: OperatorCompanyPlan;
  perEmployeeMonthlyFee: string;
  companyPointBalance: string;
  pointUnitLabel: string;
};

const statusOptions: Array<{ value: OperatorCompanyStatus; label: string }> = [
  { value: "ACTIVE", label: "有効" },
  { value: "TRIAL", label: "トライアル" },
  { value: "INACTIVE", label: "停止中" },
];

const planOptions: Array<{ value: OperatorCompanyPlan; label: string }> = [
  { value: "TRIAL", label: "TRIAL" },
  { value: "STANDARD", label: "STANDARD" },
  { value: "ENTERPRISE", label: "ENTERPRISE" },
];

function createInitialFormState(): CompanyFormState {
  return {
    name: "",
    status: "ACTIVE",
    plan: "STANDARD",
    perEmployeeMonthlyFee: "3000",
    companyPointBalance: "0",
    pointUnitLabel: "pt",
  };
}

function formatDateTime(value: string) {
  return toYYYYMMDDHHmm(new Date(value)).replace("T", " ");
}

function formatNumber(value: number) {
  return value.toLocaleString("ja-JP");
}

export default function CompanyRegistration({ initialCompanies, operatorName }: CompanyRegistrationProps) {
  const [companies, setCompanies] = useState(initialCompanies);
  const [form, setForm] = useState<CompanyFormState>(() => createInitialFormState());
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const parsedMonthlyFee = Number.parseInt(form.perEmployeeMonthlyFee, 10);
  const parsedCompanyPointBalance = Number.parseInt(form.companyPointBalance, 10);

  const validation = useMemo(
    () => ({
      name: !form.name.trim(),
      perEmployeeMonthlyFee: !Number.isInteger(parsedMonthlyFee) || parsedMonthlyFee < 0,
      companyPointBalance: !Number.isInteger(parsedCompanyPointBalance) || parsedCompanyPointBalance < 0,
      pointUnitLabel: !form.pointUnitLabel.trim(),
    }),
    [form.name, form.pointUnitLabel, parsedCompanyPointBalance, parsedMonthlyFee],
  );

  const hasValidationError = Object.values(validation).some(Boolean);

  const handleSubmit = async () => {
    setHasSubmitted(true);

    if (hasValidationError || submitting) {
      return;
    }

    const input: CreateCompanyInput = {
      name: form.name.trim(),
      status: form.status,
      plan: form.plan,
      perEmployeeMonthlyFee: parsedMonthlyFee,
      companyPointBalance: parsedCompanyPointBalance,
      pointUnitLabel: form.pointUnitLabel.trim(),
    };

    try {
      setSubmitting(true);
      setError(null);
      const createdCompany = await createCompany(input);

      setCompanies((current) => [createdCompany, ...current.filter((company) => company.companyId !== createdCompany.companyId)]);
      setForm(createInitialFormState());
      setHasSubmitted(false);
      setNotice(`企業「${createdCompany.legalName}」を登録しました。companyId は自動採番されています。`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "企業の登録に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-5">
      <AdminPageHeader
        title="企業登録"
        adminName={operatorName}
        backHref="/dashboard"
        subtitle="運用対象の企業を追加します。companyId は登録時に UUID で自動採番されます。"
      />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <div className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
              <FontAwesomeIcon icon={faCirclePlus} className="text-lg" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">新しい企業を登録</h2>
              <p className="text-sm text-slate-500">
                会社名と契約条件を入力してください。companyId は入力不要で、自動的に発番されます。
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {error ? <Alert severity="error">{error}</Alert> : null}
            {notice ? <Alert severity="success">{notice}</Alert> : null}

            <TextField
              label="会社名"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              fullWidth
              required
              error={hasSubmitted && validation.name}
              helperText={hasSubmitted && validation.name ? "会社名を入力してください。" : "正式名称を入力してください。"}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <TextField
                select
                label="ステータス"
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({ ...current, status: event.target.value as OperatorCompanyStatus }))
                }
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
                value={form.plan}
                onChange={(event) =>
                  setForm((current) => ({ ...current, plan: event.target.value as OperatorCompanyPlan }))
                }
                fullWidth
              >
                {planOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <TextField
                label="月額単価（円）"
                type="number"
                value={form.perEmployeeMonthlyFee}
                onChange={(event) => setForm((current) => ({ ...current, perEmployeeMonthlyFee: event.target.value }))}
                fullWidth
                required
                error={hasSubmitted && validation.perEmployeeMonthlyFee}
                helperText={
                  hasSubmitted && validation.perEmployeeMonthlyFee
                    ? "0 以上の整数で入力してください。"
                    : "税込みの月額単価を入力してください。"
                }
              />
              <TextField
                label="初期保有ポイント"
                type="number"
                value={form.companyPointBalance}
                onChange={(event) => setForm((current) => ({ ...current, companyPointBalance: event.target.value }))}
                fullWidth
                required
                error={hasSubmitted && validation.companyPointBalance}
                helperText={
                  hasSubmitted && validation.companyPointBalance
                    ? "0 以上の整数で入力してください。"
                    : "企業に付与する初期ポイント残高です。"
                }
              />
            </div>

            <TextField
              label="ポイント単位"
              value={form.pointUnitLabel}
              onChange={(event) => setForm((current) => ({ ...current, pointUnitLabel: event.target.value }))}
              fullWidth
              required
              error={hasSubmitted && validation.pointUnitLabel}
              helperText={
                hasSubmitted && validation.pointUnitLabel
                  ? "ポイント単位を入力してください。"
                  : "通常は pt のままで問題ありません。"
              }
            />

            <Button
              variant="contained"
              fullWidth
              onClick={handleSubmit}
              disabled={submitting}
              sx={{
                mt: 1,
                borderRadius: "16px",
                py: 1.5,
                backgroundColor: "#0f766e",
                "&:hover": {
                  backgroundColor: "#115e59",
                },
              }}
            >
              {submitting ? "登録中..." : "企業を登録"}
            </Button>
          </div>
        </div>

        <div className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
          <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <FontAwesomeIcon icon={faBuilding} className="text-lg" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">登録済み企業</h2>
                <p className="text-sm text-slate-500">登録後はそのままユーザー管理画面へ移動できます。</p>
              </div>
            </div>
            <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600">
              全 {companies.length} 社
            </div>
          </div>

          {companies.length ? (
            <div className="mt-5 grid gap-4">
              {companies.map((company) => (
                <div
                  key={company.companyId}
                  className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-5 shadow-sm shadow-slate-200/50"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="text-xs font-semibold tracking-[0.22em] text-slate-400">{company.companyId}</div>
                      <div className="mt-2 text-xl font-bold text-slate-900">{company.companyName}</div>
                      {company.legalName !== company.companyName ? (
                        <div className="mt-1 text-sm text-slate-500">{company.legalName}</div>
                      ) : null}
                    </div>
                    <Link
                      href={`/user-registration?companyId=${encodeURIComponent(company.companyId)}`}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
                    >
                      ユーザー管理へ
                      <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="text-xs" />
                    </Link>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 text-sm">
                    <span className="rounded-full bg-white px-3 py-1 text-slate-700">{company.plan}</span>
                    <span className="rounded-full bg-white px-3 py-1 text-slate-700">{company.status}</span>
                    <span className="rounded-full bg-white px-3 py-1 text-slate-700">登録ユーザー {company.employeeCount} 人</span>
                    <span className="rounded-full bg-white px-3 py-1 text-slate-700">
                      有効ユーザー {company.activeEmployeeCount} 人
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 text-slate-700">
                      保有ポイント {formatNumber(company.companyPointBalance)}
                      {company.pointUnitLabel}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm text-slate-500 md:grid-cols-2">
                    <div>月額単価 {formatNumber(company.perEmployeeMonthlyFee)} 円</div>
                    <div>最終更新 {formatDateTime(company.updatedAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-14 text-center text-sm text-slate-500">
              まだ企業が登録されていません。左のフォームから最初の企業を登録してください。
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
