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
  companyId: string;
  name: string;
  shortName: string;
  status: OperatorCompanyStatus;
  plan: OperatorCompanyPlan;
  perEmployeeMonthlyFee: string;
  companyPointBalance: string;
  pointUnitLabel: string;
};

const statusOptions: Array<{ value: OperatorCompanyStatus; label: string }> = [
  { value: "ACTIVE", label: "稼働中" },
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
    companyId: "",
    name: "",
    shortName: "",
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

function isValidCompanyId(value: string) {
  return /^[a-z][a-z0-9-]{1,31}$/.test(value);
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
      companyId: !isValidCompanyId(form.companyId.trim()),
      name: !form.name.trim(),
      perEmployeeMonthlyFee: !Number.isInteger(parsedMonthlyFee) || parsedMonthlyFee < 0,
      companyPointBalance: !Number.isInteger(parsedCompanyPointBalance) || parsedCompanyPointBalance < 0,
      pointUnitLabel: !form.pointUnitLabel.trim(),
    }),
    [form.companyId, form.name, form.pointUnitLabel, parsedMonthlyFee, parsedCompanyPointBalance],
  );

  const hasValidationError = Object.values(validation).some(Boolean);

  const handleSubmit = async () => {
    setHasSubmitted(true);

    if (hasValidationError || submitting) {
      return;
    }

    const input: CreateCompanyInput = {
      companyId: form.companyId.trim(),
      name: form.name.trim(),
      shortName: form.shortName.trim() || undefined,
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
      setNotice(`企業「${createdCompany.companyName}」を登録しました。`);
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
        subtitle="運用者が管理対象の企業を追加するための画面です。"
      />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <div className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
              <FontAwesomeIcon icon={faCirclePlus} className="text-lg" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">新しい企業を登録</h2>
              <p className="text-sm text-slate-500">companyId を起点に今後のユーザー管理・データ管理がぶら下がります。</p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {error ? <Alert severity="error">{error}</Alert> : null}
            {notice ? <Alert severity="success">{notice}</Alert> : null}

            <TextField
              label="companyId"
              value={form.companyId}
              onChange={(event) => setForm((current) => ({ ...current, companyId: event.target.value }))}
              fullWidth
              required
              error={hasSubmitted && validation.companyId}
              helperText={
                hasSubmitted && validation.companyId
                  ? "英小文字で始まる英小文字・数字・ハイフンの 2-32 文字で入力してください。"
                  : "例: efficient-tech"
              }
            />
            <TextField
              label="企業名"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              fullWidth
              required
              error={hasSubmitted && validation.name}
              helperText={hasSubmitted && validation.name ? "企業名を入力してください。" : "正式名称を登録します。"}
            />
            <TextField
              label="企業略称"
              value={form.shortName}
              onChange={(event) => setForm((current) => ({ ...current, shortName: event.target.value }))}
              fullWidth
              helperText="一覧表示用の短い表記が必要な場合のみ入力してください。"
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
                label="従業員あたり月額料金"
                type="number"
                value={form.perEmployeeMonthlyFee}
                onChange={(event) => setForm((current) => ({ ...current, perEmployeeMonthlyFee: event.target.value }))}
                fullWidth
                required
                error={hasSubmitted && validation.perEmployeeMonthlyFee}
                helperText={hasSubmitted && validation.perEmployeeMonthlyFee ? "0 以上の整数で入力してください。" : "円単位で入力します。"}
              />
              <TextField
                label="初期ポイント残高"
                type="number"
                value={form.companyPointBalance}
                onChange={(event) => setForm((current) => ({ ...current, companyPointBalance: event.target.value }))}
                fullWidth
                required
                error={hasSubmitted && validation.companyPointBalance}
                helperText={hasSubmitted && validation.companyPointBalance ? "0 以上の整数で入力してください。" : "会社保有ポイントの初期値です。"}
              />
            </div>

            <TextField
              label="ポイント単位"
              value={form.pointUnitLabel}
              onChange={(event) => setForm((current) => ({ ...current, pointUnitLabel: event.target.value }))}
              fullWidth
              required
              error={hasSubmitted && validation.pointUnitLabel}
              helperText={hasSubmitted && validation.pointUnitLabel ? "ポイント単位を入力してください。" : "通常は pt のままで構いません。"}
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
              合計 {companies.length} 社
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
                      <div className="mt-1 text-sm text-slate-500">{company.legalName}</div>
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
                    <span className="rounded-full bg-white px-3 py-1 text-slate-700">
                      従業員 {company.employeeCount} 名
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 text-slate-700">
                      稼働 {company.activeEmployeeCount} 名
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 text-slate-700">
                      残高 {formatNumber(company.companyPointBalance)}
                      {company.pointUnitLabel}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm text-slate-500 md:grid-cols-2">
                    <div>従業員あたり月額: {formatNumber(company.perEmployeeMonthlyFee)} 円</div>
                    <div>更新日時: {formatDateTime(company.updatedAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-14 text-center text-sm text-slate-500">
              まだ企業が登録されていません。左のフォームから最初の企業を追加してください。
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
