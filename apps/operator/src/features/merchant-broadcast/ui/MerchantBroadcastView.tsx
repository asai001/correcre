"use client";

import { useMemo, useRef, useState } from "react";

import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from "@mui/material";

import {
  MERCHANT_BROADCAST_BODY_MAX_LENGTH,
  MERCHANT_BROADCAST_MAX_RECIPIENTS,
  MERCHANT_BROADCAST_PLACEHOLDERS,
  MERCHANT_BROADCAST_SUBJECT_MAX_LENGTH,
  buildMerchantBroadcastSubject,
  buildMerchantBroadcastText,
} from "@correcre/lib/merchant-broadcast";
import type { MerchantStatus } from "@correcre/types";

import AdminPageHeader from "@operator/components/AdminPageHeader";

import { sendMerchantBroadcast } from "../api/client";
import type { MerchantBroadcastHistory, MerchantBroadcastMode, MerchantBroadcastPageData } from "../model/types";

type Props = {
  data: MerchantBroadcastPageData;
  operatorName: string;
};

type Feedback = {
  type: "success" | "error" | "warning";
  text: string;
};

type MerchandiseFilter = "all" | "none" | "unpublished";

const STATUS_LABELS: Record<MerchantStatus, string> = {
  PENDING: "申請中",
  ACTIVE: "登録済",
  INACTIVE: "停止中",
  REJECTED: "却下",
};

const STATUS_FILTER_OPTIONS: MerchantStatus[] = ["ACTIVE", "PENDING", "INACTIVE"];

const MERCHANDISE_FILTER_OPTIONS: { value: MerchandiseFilter; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "none", label: "商品・サービス未登録" },
  { value: "unpublished", label: "公開中の商品・サービスなし" },
];

// 前回の一斉送信からこの日数以内なら、送りすぎの注意を出す
const RECENT_BROADCAST_WARNING_DAYS = 7;

const DEFAULT_SUBJECT = "【コレクレ】";
const DEFAULT_BODY = `${MERCHANT_BROADCAST_PLACEHOLDERS.merchantName}
${MERCHANT_BROADCAST_PLACEHOLDERS.recipientName} 様

いつもコレクレをご利用いただき、ありがとうございます。
コレクレ 運営事務局です。

`;

function formatDateTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function daysSince(iso: string) {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return null;
  return Math.floor((Date.now() - time) / (24 * 60 * 60 * 1000));
}

function statusBadgeClassName(status: MerchantStatus) {
  switch (status) {
    case "ACTIVE":
      return "bg-emerald-50 text-emerald-700";
    case "PENDING":
      return "bg-amber-50 text-amber-700";
    default:
      return "bg-slate-100 text-slate-500";
  }
}

export default function MerchantBroadcastView({ data, operatorName }: Props) {
  const [statusFilter, setStatusFilter] = useState<Set<MerchantStatus>>(() => new Set<MerchantStatus>(["ACTIVE"]));
  const [merchandiseFilter, setMerchandiseFilter] = useState<MerchandiseFilter>("all");
  const [keyword, setKeyword] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [body, setBody] = useState(DEFAULT_BODY);
  const [history, setHistory] = useState<MerchantBroadcastHistory[]>(data.history);
  const [sendingMode, setSendingMode] = useState<MerchantBroadcastMode | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const visibleTargets = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return data.targets.filter((target) => {
      if (!statusFilter.has(target.status)) return false;
      if (merchandiseFilter === "none" && target.merchandiseCount > 0) return false;
      if (merchandiseFilter === "unpublished" && target.publishedMerchandiseCount > 0) return false;
      if (
        normalizedKeyword &&
        !target.merchantName.toLowerCase().includes(normalizedKeyword) &&
        !target.merchantId.toLowerCase().includes(normalizedKeyword)
      ) {
        return false;
      }
      return true;
    });
  }, [data.targets, statusFilter, merchandiseFilter, keyword]);

  const selectedTargets = useMemo(
    () => data.targets.filter((target) => selectedIds.has(target.merchantId)),
    [data.targets, selectedIds],
  );
  const recipientCount = useMemo(
    () => new Set(selectedTargets.flatMap((target) => target.recipientEmails)).size,
    [selectedTargets],
  );
  const selectableVisibleTargets = visibleTargets.filter((target) => target.recipientEmails.length > 0);
  const allVisibleSelected =
    selectableVisibleTargets.length > 0 &&
    selectableVisibleTargets.every((target) => selectedIds.has(target.merchantId));

  const previewTarget = selectedTargets.find((target) => target.recipientEmails.length > 0) ?? selectedTargets[0];
  const previewRecipient = {
    merchantName: previewTarget?.merchantName ?? "（提携企業名）",
    recipientName: previewTarget?.sampleRecipientName ?? "（担当者名）",
  };
  const previewSubject = buildMerchantBroadcastSubject({ subject, recipient: previewRecipient });
  const previewText = buildMerchantBroadcastText({
    body,
    recipient: previewRecipient,
    merchantAppUrl: data.merchantAppUrl,
  });

  const latestBroadcast = history[0];
  const latestBroadcastDays = latestBroadcast ? daysSince(latestBroadcast.sentAt) : null;
  const showRecentWarning = latestBroadcastDays !== null && latestBroadcastDays < RECENT_BROADCAST_WARNING_DAYS;

  const trimmedSubject = subject.trim();
  const contentError = !trimmedSubject
    ? "件名を入力してください。"
    : trimmedSubject.length > MERCHANT_BROADCAST_SUBJECT_MAX_LENGTH
      ? `件名は${MERCHANT_BROADCAST_SUBJECT_MAX_LENGTH}文字以内で入力してください。`
      : !body.trim()
        ? "本文を入力してください。"
        : body.length > MERCHANT_BROADCAST_BODY_MAX_LENGTH
          ? `本文は${MERCHANT_BROADCAST_BODY_MAX_LENGTH}文字以内で入力してください。`
          : null;
  const selectionError = !selectedTargets.length
    ? "送信先の提携企業を選択してください。"
    : recipientCount === 0
      ? "選択した提携企業に送信できるメールアドレスがありません。"
      : recipientCount > MERCHANT_BROADCAST_MAX_RECIPIENTS
        ? `1回に送信できるのは${MERCHANT_BROADCAST_MAX_RECIPIENTS}件までです。提携企業を分けて送信してください。`
        : null;
  const sending = sendingMode !== null;

  const toggleStatus = (status: MerchantStatus) => {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  };

  const toggleSelected = (merchantId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(merchantId)) {
        next.delete(merchantId);
      } else {
        next.add(merchantId);
      }
      return next;
    });
  };

  const toggleAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const target of selectableVisibleTargets) {
        if (allVisibleSelected) {
          next.delete(target.merchantId);
        } else {
          next.add(target.merchantId);
        }
      }
      return next;
    });
  };

  const insertPlaceholder = (placeholder: string) => {
    const textarea = bodyRef.current;
    if (!textarea) {
      setBody((prev) => prev + placeholder);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const nextBody = body.slice(0, start) + placeholder + body.slice(end);
    setBody(nextBody);
    requestAnimationFrame(() => {
      textarea.focus();
      const cursor = start + placeholder.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  };

  const submit = async (mode: MerchantBroadcastMode) => {
    setSendingMode(mode);
    setFeedback(null);
    setConfirmError(null);

    try {
      const result = await sendMerchantBroadcast({
        mode,
        subject: trimmedSubject,
        body,
        merchantIds: selectedTargets.map((target) => target.merchantId),
      });

      if (mode === "test") {
        setFeedback({ type: "success", text: `テストメールを ${data.operatorEmail} に送信しました。` });
        return;
      }

      setConfirmOpen(false);
      if (result.history) {
        setHistory((prev) => [result.history!, ...prev]);
      }
      setSelectedIds(new Set());

      const messages = [`${result.sentCount}件のメールを送信しました。`];
      if (result.failedEmails.length) {
        messages.push(`送信に失敗した宛先（${result.failedEmails.length}件）: ${result.failedEmails.join(", ")}`);
      }
      if (!result.historySaved) {
        messages.push("送信履歴の保存に失敗しました（メールは送信済みです）。");
      }
      setFeedback({
        type: result.failedEmails.length || !result.historySaved ? "warning" : "success",
        text: messages.join(" "),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "メールの送信に失敗しました。";
      if (mode === "send") {
        setConfirmError(message);
      } else {
        setFeedback({ type: "error", text: message });
      }
    } finally {
      setSendingMode(null);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <AdminPageHeader
        title="提携企業 一斉メール"
        adminName={operatorName}
        subtitle="新機能のお知らせや登録のお願いを、提携企業へまとめて送信します"
        backHref="/dashboard"
      />

      {feedback ? (
        <p
          role="status"
          className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-700"
              : feedback.type === "warning"
                ? "bg-amber-50 text-amber-800"
                : "bg-rose-50 text-rose-700"
          }`}
        >
          {feedback.text}
        </p>
      ) : null}

      {showRecentWarning && latestBroadcast ? (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span className="font-semibold">
            前回の一斉送信は{latestBroadcastDays === 0 ? "今日" : `${latestBroadcastDays}日前`}です
          </span>
          （{formatDateTime(latestBroadcast.sentAt)}「{latestBroadcast.subject}」）。
          短い間隔で何度も送ると、迷惑メール扱いや受信拒否につながるおそれがあります。
        </p>
      ) : null}

      {/* 1. 送信先 */}
      <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">1. 送信先の提携企業を選ぶ</h2>
            <p className="mt-1 text-xs text-slate-500">
              選択した提携企業のログインユーザー（停止・削除済みを除く）と、登録された連絡先メールアドレスに 1 通ずつ送信します。
              他社のメールアドレスが宛先に表示されることはありません。
            </p>
          </div>
          <div className="text-right text-sm text-slate-600">
            <span className="font-bold text-slate-900">{selectedTargets.length}</span> 社選択 ／ 宛先{" "}
            <span className="font-bold text-slate-900">{recipientCount}</span> 件
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">状態</span>
            {STATUS_FILTER_OPTIONS.map((status) => {
              const active = statusFilter.has(status);
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => toggleStatus(status)}
                  aria-pressed={active}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    active
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {STATUS_LABELS[status]}
                </button>
              );
            })}
            <span className="ml-2 text-xs font-semibold text-slate-500">商品登録</span>
            <select
              value={merchandiseFilter}
              onChange={(event) => setMerchandiseFilter(event.target.value as MerchandiseFilter)}
              aria-label="商品・サービスの登録状況で絞り込む"
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 outline-none focus:border-slate-400"
            >
              {MERCHANDISE_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <input
            type="search"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="提携企業名・IDで検索"
            aria-label="提携企業名・IDで検索"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 lg:w-72"
          />
        </div>

        <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
              <tr>
                <th className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleAllVisible}
                    disabled={!selectableVisibleTargets.length || sending}
                    aria-label="表示中の提携企業をすべて選択"
                    className="h-4 w-4 cursor-pointer accent-slate-900"
                  />
                </th>
                <th className="px-4 py-3">提携企業</th>
                <th className="px-4 py-3">状態</th>
                <th className="px-4 py-3 text-right">商品・サービス（公開中／登録数）</th>
                <th className="px-4 py-3 text-right">宛先</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleTargets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-400">
                    条件に合う提携企業がありません。
                  </td>
                </tr>
              ) : (
                visibleTargets.map((target) => {
                  const hasRecipients = target.recipientEmails.length > 0;
                  const checked = selectedIds.has(target.merchantId);
                  return (
                    <tr key={target.merchantId} className={checked ? "bg-sky-50/60" : undefined}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSelected(target.merchantId)}
                          disabled={(!hasRecipients && !checked) || sending}
                          aria-label={`${target.merchantName} を選択`}
                          className="h-4 w-4 cursor-pointer accent-slate-900 disabled:cursor-not-allowed"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{target.merchantName}</div>
                        <div className="text-xs text-slate-400">{target.merchantId}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClassName(target.status)}`}
                        >
                          {STATUS_LABELS[target.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">
                        {target.publishedMerchandiseCount} ／ {target.merchandiseCount}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {hasRecipients ? (
                          <span className="text-slate-700" title={target.recipientEmails.join("\n")}>
                            {target.recipientEmails.length}件
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-rose-500">送信先なし</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 2. 作成 */}
      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
          <h2 className="text-lg font-bold text-slate-900">2. メールを作成する</h2>

          <label className="mt-4 block text-sm font-semibold text-slate-600" htmlFor="broadcast-subject">
            件名
          </label>
          <input
            id="broadcast-subject"
            type="text"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            maxLength={MERCHANT_BROADCAST_SUBJECT_MAX_LENGTH}
            disabled={sending}
            className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
          />
          <p className="mt-1 text-right text-xs text-slate-400">
            {subject.length} / {MERCHANT_BROADCAST_SUBJECT_MAX_LENGTH}
          </p>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <label className="text-sm font-semibold text-slate-600" htmlFor="broadcast-body">
              本文
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400">差し込み:</span>
              {Object.values(MERCHANT_BROADCAST_PLACEHOLDERS).map((placeholder) => (
                <button
                  key={placeholder}
                  type="button"
                  onClick={() => insertPlaceholder(placeholder)}
                  disabled={sending}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300"
                >
                  {placeholder}
                </button>
              ))}
            </div>
          </div>
          <textarea
            id="broadcast-body"
            ref={bodyRef}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={MERCHANT_BROADCAST_BODY_MAX_LENGTH}
            disabled={sending}
            rows={16}
            className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-slate-400"
          />
          <p className="mt-1 flex justify-between gap-3 text-xs text-slate-400">
            <span>
              {MERCHANT_BROADCAST_PLACEHOLDERS.merchantName} と {MERCHANT_BROADCAST_PLACEHOLDERS.recipientName}{" "}
              は宛先ごとに置き換わります。末尾には配信元の案内と提携企業向け画面の URL が自動で付きます。
            </span>
            <span className="shrink-0">
              {body.length} / {MERCHANT_BROADCAST_BODY_MAX_LENGTH}
            </span>
          </p>
        </div>

        <div className="flex flex-col rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
          <h2 className="text-lg font-bold text-slate-900">プレビュー</h2>
          <p className="mt-1 text-xs text-slate-500">
            {previewTarget
              ? `「${previewTarget.merchantName}」宛ての場合の表示です。`
              : "提携企業を選択すると、その企業宛ての内容で差し込み文字が表示されます。"}
          </p>
          <div className="mt-4 flex-1 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="border-b border-slate-200 pb-2 text-sm">
              <span className="text-slate-400">件名: </span>
              <span className="font-semibold text-slate-900">{previewSubject || "（未入力）"}</span>
            </div>
            <pre className="mt-3 whitespace-pre-wrap break-words font-sans text-sm leading-6 text-slate-800">
              {previewText}
            </pre>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            {contentError || selectionError ? (
              <p className="text-xs font-semibold text-amber-600 sm:mr-auto">{contentError ?? selectionError}</p>
            ) : null}
            <button
              type="button"
              onClick={() => void submit("test")}
              disabled={sending || Boolean(contentError) || !selectedTargets.length}
              title={`${data.operatorEmail} に 1 通だけ送信します`}
              className="rounded-full border border-slate-300 px-6 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300"
            >
              {sendingMode === "test" ? "送信中…" : "自分にテスト送信"}
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmError(null);
                setConfirmOpen(true);
              }}
              disabled={sending || Boolean(contentError) || Boolean(selectionError)}
              className="rounded-full bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              送信内容を確認する
            </button>
          </div>
        </div>
      </section>

      {/* 送信履歴 */}
      <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
        <h2 className="text-lg font-bold text-slate-900">送信履歴</h2>
        {data.historyUnavailable ? (
          <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            送信履歴を読み込めませんでした。時間をおいて再読み込みしてください。
          </p>
        ) : history.length === 0 ? (
          <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-400">まだ一斉メールは送信されていません。</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100 rounded-2xl border border-slate-200">
            {history.map((item) => (
              <li key={item.broadcastId}>
                <details className="group px-4 py-3">
                  <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-900">{item.subject}</div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        {formatDateTime(item.sentAt)} ／ {item.sentByName} ／ {item.merchantNames.length}社
                      </div>
                    </div>
                    <div className="text-xs text-slate-600">
                      送信 {item.sentCount} / {item.recipientCount} 件
                      {item.failedEmails.length ? (
                        <span className="ml-2 font-semibold text-rose-600">失敗 {item.failedEmails.length}件</span>
                      ) : null}
                    </div>
                  </summary>
                  <div className="mt-3 space-y-2 text-xs text-slate-600">
                    <div>
                      <span className="font-semibold">送信先:</span> {item.merchantNames.join("、")}
                    </div>
                    {item.failedEmails.length ? (
                      <div className="text-rose-600">
                        <span className="font-semibold">送信失敗:</span> {item.failedEmails.join(", ")}
                      </div>
                    ) : null}
                    <pre className="whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-3 font-sans text-sm leading-6 text-slate-800">
                      {item.body}
                    </pre>
                    <button
                      type="button"
                      onClick={() => {
                        setSubject(item.subject);
                        setBody(item.body);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      disabled={sending}
                      className="rounded-full border border-slate-300 px-4 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      この内容を作成欄にコピー
                    </button>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog
        open={confirmOpen}
        onClose={sending ? undefined : () => setConfirmOpen(false)}
        fullWidth
        maxWidth="sm"
        slotProps={{ paper: { sx: { borderRadius: "20px", p: 1 } } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <div className="text-xl font-bold text-slate-900">一斉メールを送信</div>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            送信したメールは取り消せません。内容と送信先をご確認ください。
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: "8px !important" }}>
          <Stack spacing={2}>
            {confirmError ? <Alert severity="error">{confirmError}</Alert> : null}
            <Alert severity="info" sx={{ "& .MuiAlert-message": { width: "100%" } }}>
              <div className="flex flex-col gap-1.5 text-sm">
                <div>
                  <span className="font-semibold">件名:</span> {trimmedSubject}
                </div>
                <div>
                  <span className="font-semibold">送信先:</span> {selectedTargets.length}社 ／ {recipientCount}件
                </div>
                <div className="max-h-32 overflow-y-auto text-slate-600">
                  {selectedTargets.map((target) => target.merchantName).join("、")}
                </div>
              </div>
            </Alert>
            {showRecentWarning ? (
              <Alert severity="warning">
                前回の一斉送信は{latestBroadcastDays === 0 ? "今日" : `${latestBroadcastDays}日前`}です。送信間隔にご注意ください。
              </Alert>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmOpen(false)} disabled={sending} sx={{ color: "#475569" }}>
            キャンセル
          </Button>
          <Button
            variant="contained"
            onClick={() => void submit("send")}
            disabled={sending}
            sx={{ borderRadius: "999px", px: 3, bgcolor: "#0f172a", "&:hover": { bgcolor: "#334155" } }}
          >
            {sendingMode === "send" ? "送信中…" : `${recipientCount}件に送信する`}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
