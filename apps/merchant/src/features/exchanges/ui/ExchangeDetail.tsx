"use client";

import { useState, useTransition } from "react";
import { Alert, Button, TextField } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faClock, faPaperPlane, faXmark } from "@fortawesome/free-solid-svg-icons";

import AdminPageHeader from "@merchant/components/AdminPageHeader";
import { getExchangeStatusBadge, getExchangeStatusLabel } from "@correcre/merchandise-public";
import type { ExchangeHistoryStatus } from "@correcre/types";

import { transitionExchange } from "../api/client";
import type { ExchangeDetail as ExchangeDetailType } from "../model/types";

type Props = {
  initial: ExchangeDetailType;
  merchantName: string;
};

const TRANSITION_BUTTONS: Record<
  ExchangeHistoryStatus,
  | {
      label: string;
      icon: typeof faCheck;
      color: "primary" | "success" | "warning" | "error" | "inherit";
      confirm?: string;
    }
  | undefined
> = {
  PREPARING: { label: "承認して準備に進める", icon: faPaperPlane, color: "primary" },
  IN_PROGRESS: { label: "対応を開始する", icon: faClock, color: "primary" },
  COMPLETED: { label: "完了にする", icon: faCheck, color: "success", confirm: "完了するとポイントが消費確定となります。よろしいですか？" },
  REJECTED: { label: "却下する", icon: faXmark, color: "error", confirm: "却下するとポイントが従業員に返却されます。よろしいですか？" },
  CANCELED: { label: "キャンセルする", icon: faXmark, color: "warning", confirm: "キャンセルするとポイントが従業員に返却されます。よろしいですか？" },
  REQUESTED: undefined,
  CANCELLED: undefined,
};

function formatDateTime(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPoint(value: number) {
  return `${value.toLocaleString("ja-JP")}pt`;
}

const ACTOR_LABEL: Record<string, string> = {
  EMPLOYEE: "従業員",
  MERCHANT: "提携企業",
  OPERATOR: "運用者",
  SYSTEM: "システム",
};

export default function ExchangeDetail({ initial, merchantName }: Props) {
  const [detail, setDetail] = useState(initial);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<ExchangeHistoryStatus | null>(null);
  const [, startTransition] = useTransition();

  const badge = getExchangeStatusBadge(detail.status);

  const handleTransition = (nextStatus: ExchangeHistoryStatus) => {
    const button = TRANSITION_BUTTONS[nextStatus];
    if (button?.confirm && typeof window !== "undefined" && !window.confirm(button.confirm)) {
      return;
    }

    setError(null);
    setNotice(null);
    setPendingStatus(nextStatus);

    startTransition(async () => {
      try {
        const updated = await transitionExchange(detail.exchangeId, {
          nextStatus,
          comment: comment.trim() || undefined,
        });
        setDetail(updated);
        setComment("");
        setNotice(`状態を「${getExchangeStatusLabel(nextStatus)}」に更新しました。`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "状態の更新に失敗しました。");
      } finally {
        setPendingStatus(null);
      }
    });
  };

  return (
    <div className="space-y-6 pb-10">
      <AdminPageHeader
        title="交換詳細"
        adminName={merchantName}
        subtitle="状態遷移とポイント精算"
        backHref="/exchanges"
      />

      {error ? <Alert severity="error">{error}</Alert> : null}
      {notice ? <Alert severity="success">{notice}</Alert> : null}

      <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <div className="h-24 w-24 overflow-hidden rounded-2xl bg-slate-100">
              {detail.merchandiseImageViewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={detail.merchandiseImageViewUrl}
                  alt={detail.merchandiseName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">画像なし</div>
              )}
            </div>
            <div>
              <div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}>{badge.label}</span>
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900">{detail.merchandiseName}</div>
              <div className="mt-1 text-sm text-slate-500">交換ID: {detail.exchangeId}</div>
            </div>
          </div>
          <div className="text-right text-slate-700">
            <div className="text-xs text-slate-500">使用ポイント</div>
            <div className="text-3xl font-bold">{formatPoint(detail.usedPoint)}</div>
            <div className="mt-1 text-xs text-slate-500">保留中: {formatPoint(detail.pointHeld)}</div>
          </div>
        </div>

        <dl className="mt-6 grid gap-4 text-sm md:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold text-slate-500">申請者</dt>
            <dd className="mt-1 text-slate-900">{detail.userName ?? detail.userId}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-slate-500">所属企業 ID</dt>
            <dd className="mt-1 text-slate-900">{detail.companyId}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-slate-500">申請日時</dt>
            <dd className="mt-1 text-slate-900">{formatDateTime(detail.requestedAt ?? detail.exchangedAt)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-slate-500">最終更新</dt>
            <dd className="mt-1 text-slate-900">{formatDateTime(detail.updatedAt)}</dd>
          </div>
          {detail.completedAt ? (
            <div>
              <dt className="text-xs font-semibold text-slate-500">完了日時</dt>
              <dd className="mt-1 text-slate-900">{formatDateTime(detail.completedAt)}</dd>
            </div>
          ) : null}
          {detail.canceledAt ? (
            <div>
              <dt className="text-xs font-semibold text-slate-500">キャンセル日時</dt>
              <dd className="mt-1 text-slate-900">{formatDateTime(detail.canceledAt)}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      {detail.allowedNextStatuses.length > 0 ? (
        <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
          <h2 className="text-lg font-bold text-slate-900">状態を更新する</h2>
          <p className="mt-1 text-sm text-slate-500">
            選択した次の状態に応じて、自動でタイムスタンプとポイント精算が行われます。
          </p>

          <TextField
            className="!mt-4"
            label="コメント（任意）"
            placeholder="従業員には表示されません。社内向けのメモとして履歴に残します。"
            fullWidth
            multiline
            minRows={2}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
          />

          <div className="mt-5 flex flex-wrap gap-3">
            {detail.allowedNextStatuses.map((nextStatus) => {
              const button = TRANSITION_BUTTONS[nextStatus];
              if (!button) return null;
              return (
                <Button
                  key={nextStatus}
                  variant="contained"
                  color={button.color}
                  onClick={() => handleTransition(nextStatus)}
                  disabled={pendingStatus !== null}
                  className="!rounded-full !px-5"
                  startIcon={<FontAwesomeIcon icon={button.icon} />}
                >
                  {button.label}
                </Button>
              );
            })}
          </div>
        </section>
      ) : (
        <section className="rounded-[28px] bg-white p-6 text-sm text-slate-500 shadow-lg shadow-slate-200/70">
          この交換は終了状態です。これ以上の状態変更はできません。
        </section>
      )}

      <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
        <h2 className="text-lg font-bold text-slate-900">状態遷移ログ</h2>
        {detail.history.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">履歴がまだありません。</p>
        ) : (
          <ol className="mt-4 space-y-3">
            {detail.history.map((event, index) => {
              const eventBadge = getExchangeStatusBadge(event.status);
              return (
                <li
                  key={`${event.occurredAt}-${index}`}
                  className="flex flex-col gap-2 rounded-2xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${eventBadge.className}`}>
                      {eventBadge.label}
                    </span>
                    <span className="ml-3 text-sm text-slate-700">
                      {ACTOR_LABEL[event.actorType] ?? event.actorType}
                      {event.actorId ? ` (${event.actorId})` : ""}
                    </span>
                    {event.comment ? (
                      <div className="mt-2 whitespace-pre-wrap text-xs text-slate-500">{event.comment}</div>
                    ) : null}
                  </div>
                  <div className="text-xs text-slate-500">{formatDateTime(event.occurredAt)}</div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
