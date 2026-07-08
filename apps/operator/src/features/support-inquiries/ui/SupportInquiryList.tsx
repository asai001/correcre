"use client";

import { useMemo, useState, useTransition } from "react";
import { Alert, MenuItem, TextField } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHeadset } from "@fortawesome/free-solid-svg-icons";

import type { SupportInquiryItem, SupportInquirySource, SupportInquiryStatus } from "@correcre/types";

import AdminPageHeader from "@operator/components/AdminPageHeader";

import { saveSupportInquiryStatus } from "../api/client";
import {
  SUPPORT_INQUIRY_CATEGORY_LABELS,
  SUPPORT_INQUIRY_SOURCE_LABELS,
  SUPPORT_INQUIRY_STATUS_LABELS,
  type SupportInquiryListData,
} from "../model/types";

type Props = {
  data: SupportInquiryListData;
  operatorName: string;
};

type FilterSource = SupportInquirySource | "ALL";
type FilterStatus = SupportInquiryStatus | "ALL";

const SOURCE_FILTER_OPTIONS: Array<{ value: FilterSource; label: string }> = [
  { value: "ALL", label: "すべての送信元" },
  { value: "ADMIN", label: SUPPORT_INQUIRY_SOURCE_LABELS.ADMIN },
  { value: "MERCHANT", label: SUPPORT_INQUIRY_SOURCE_LABELS.MERCHANT },
];

const STATUS_FILTER_OPTIONS: Array<{ value: FilterStatus; label: string }> = [
  { value: "ALL", label: "すべての状況" },
  { value: "OPEN", label: SUPPORT_INQUIRY_STATUS_LABELS.OPEN },
  { value: "IN_PROGRESS", label: SUPPORT_INQUIRY_STATUS_LABELS.IN_PROGRESS },
  { value: "RESOLVED", label: SUPPORT_INQUIRY_STATUS_LABELS.RESOLVED },
];

const STATUS_BADGE_CLASS: Record<SupportInquiryStatus, string> = {
  OPEN: "bg-rose-50 text-rose-700 border-rose-100",
  IN_PROGRESS: "bg-amber-50 text-amber-700 border-amber-100",
  RESOLVED: "bg-emerald-50 text-emerald-700 border-emerald-100",
};

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getOrganizationName(item: SupportInquiryItem) {
  return item.submitter.companyName || item.submitter.merchantName || item.submitter.companyId || item.submitter.merchantId || "-";
}

export default function SupportInquiryList({ data, operatorName }: Props) {
  const [items, setItems] = useState(data.items);
  const [sourceFilter, setSourceFilter] = useState<FilterSource>("ALL");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("ALL");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const counts = useMemo(
    () => ({
      total: items.length,
      open: items.filter((item) => item.status === "OPEN").length,
      inProgress: items.filter((item) => item.status === "IN_PROGRESS").length,
      resolved: items.filter((item) => item.status === "RESOLVED").length,
    }),
    [items],
  );

  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        const sourceMatches = sourceFilter === "ALL" || item.source === sourceFilter;
        const statusMatches = statusFilter === "ALL" || item.status === statusFilter;
        return sourceMatches && statusMatches;
      }),
    [items, sourceFilter, statusFilter],
  );

  const handleStatusChange = (item: SupportInquiryItem, status: SupportInquiryStatus) => {
    if (item.status === status || updatingId) {
      return;
    }

    setFeedback(null);
    setUpdatingId(item.inquiryId);
    startTransition(async () => {
      try {
        const updated = await saveSupportInquiryStatus(item.inquiryId, status);
        setItems((current) => current.map((entry) => (entry.inquiryId === updated.inquiryId ? updated : entry)));
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "問い合わせの対応状況を更新できませんでした。");
      } finally {
        setUpdatingId(null);
      }
    });
  };

  return (
    <div className="space-y-6 pb-10">
      <AdminPageHeader
        title="問い合わせ一覧"
        adminName={operatorName}
        backHref="/dashboard"
        subtitle="企業側・提携企業側から届いた問い合わせを確認します"
      />

      {!data.tableAvailable ? (
        <Alert severity="warning">問い合わせテーブルが見つかりません。infra のデプロイ後に一覧を確認できます。</Alert>
      ) : null}
      {feedback ? <Alert severity="error">{feedback}</Alert> : null}

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
          <div className="text-sm font-semibold text-slate-500">総件数</div>
          <div className="mt-3 text-3xl font-bold text-slate-900">{counts.total.toLocaleString("ja-JP")}</div>
        </div>
        <div className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
          <div className="text-sm font-semibold text-slate-500">未対応</div>
          <div className="mt-3 text-3xl font-bold text-rose-600">{counts.open.toLocaleString("ja-JP")}</div>
        </div>
        <div className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
          <div className="text-sm font-semibold text-slate-500">対応中</div>
          <div className="mt-3 text-3xl font-bold text-amber-600">{counts.inProgress.toLocaleString("ja-JP")}</div>
        </div>
        <div className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
          <div className="text-sm font-semibold text-slate-500">解決</div>
          <div className="mt-3 text-3xl font-bold text-emerald-600">{counts.resolved.toLocaleString("ja-JP")}</div>
        </div>
      </section>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
          <FontAwesomeIcon icon={faHeadset} />
          表示中: {filteredItems.length.toLocaleString("ja-JP")}件
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <TextField
            select
            size="small"
            label="送信元"
            value={sourceFilter}
            onChange={(event) => setSourceFilter(event.target.value as FilterSource)}
            className="sm:w-48"
          >
            {SOURCE_FILTER_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="対応状況"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as FilterStatus)}
            className="sm:w-48"
          >
            {STATUS_FILTER_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="rounded-[28px] bg-white p-10 text-center text-sm text-slate-500 shadow-lg shadow-slate-200/70">
          条件に一致する問い合わせはありません。
        </div>
      ) : (
        <ul className="space-y-4">
          {filteredItems.map((item) => (
            <li key={item.inquiryId} className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_BADGE_CLASS[item.status]}`}>
                      {SUPPORT_INQUIRY_STATUS_LABELS[item.status]}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {SUPPORT_INQUIRY_SOURCE_LABELS[item.source]}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {SUPPORT_INQUIRY_CATEGORY_LABELS[item.category]}
                    </span>
                    <span className="text-xs text-slate-400">{formatDateTime(item.createdAt)}</span>
                  </div>
                  <h2 className="mt-4 break-words text-xl font-bold text-slate-900">{item.subject}</h2>
                  <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">{item.body}</p>
                </div>
                <TextField
                  select
                  size="small"
                  label="対応状況"
                  value={item.status}
                  disabled={isPending || updatingId === item.inquiryId}
                  onChange={(event) => handleStatusChange(item, event.target.value as SupportInquiryStatus)}
                  className="lg:w-40"
                >
                  {STATUS_FILTER_OPTIONS.filter((option) => option.value !== "ALL").map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              </div>

              <dl className="mt-5 grid gap-3 rounded-[20px] bg-slate-50 p-4 text-sm md:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold text-slate-400">問い合わせID</dt>
                  <dd className="mt-1 break-all font-mono text-slate-700">{item.inquiryId}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-slate-400">組織</dt>
                  <dd className="mt-1 text-slate-700">{getOrganizationName(item)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-slate-400">送信者</dt>
                  <dd className="mt-1 text-slate-700">
                    {item.submitter.name || item.submitter.email}
                    <span className="ml-2 text-slate-400">{item.submitter.email}</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-slate-400">通知</dt>
                  <dd className="mt-1 text-slate-700">
                    {item.notifiedAt ? `送信済み ${formatDateTime(item.notifiedAt)}` : item.notificationError ? "通知失敗" : "未送信"}
                  </dd>
                </div>
                {item.currentUrl ? (
                  <div className="md:col-span-2">
                    <dt className="text-xs font-semibold text-slate-400">送信元URL</dt>
                    <dd className="mt-1 break-all">
                      <a
                        href={item.currentUrl}
                        className="text-sm font-semibold text-blue-700 hover:underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {item.currentUrl}
                      </a>
                    </dd>
                  </div>
                ) : null}
              </dl>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
