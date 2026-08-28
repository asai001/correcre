"use client";

import { useMemo, useState, useTransition } from "react";
import { Alert, Button, TextField } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendarCheck, faPaperPlane, faPlus, faXmark } from "@fortawesome/free-solid-svg-icons";

import type { ScheduleStatus } from "@correcre/types";

import { previewScheduleCandidates, proposeSchedule, respondSchedule } from "../api/client";
import type {
  ExchangeDetail as ExchangeDetailType,
  ExchangeScheduleView,
  ScheduleCandidateView,
} from "../model/types";

type Props = {
  detail: ExchangeDetailType;
  onUpdated: (detail: ExchangeDetailType) => void;
};

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"] as const;

// "YYYY-MM-DD"（サーバー計算値）の表示整形。暦日の曜日はタイムゾーンに依存しない。
function formatDateJa(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const weekday = WEEKDAY_LABELS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
  return `${month}月${day}日(${weekday})`;
}

function formatDeadlineJa(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateTimeJa(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const SCHEDULE_STATUS_LABELS: Record<ScheduleStatus, { label: string; needsAction: boolean }> = {
  NOT_REQUIRED: { label: "日程調整なし", needsAction: false },
  AWAITING_PROPOSAL: { label: "候補日の提示待ち（要対応）", needsAction: true },
  AWAITING_SELECTION: { label: "従業員の選択待ち", needsAction: false },
  AWAITING_MERCHANT_RESPONSE: { label: "希望日への応答待ち（要対応）", needsAction: true },
  CONFIRMED: { label: "日程確定", needsAction: false },
  CANCELLED: { label: "日程調整終了", needsAction: false },
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  CANDIDATES_PROPOSED: "候補日を提示",
  CANDIDATE_SELECTED: "候補日を選択",
  DATE_REQUESTED: "希望日を申請",
  REQUEST_ACCEPTED: "希望日を承諾",
  REQUEST_REJECTED: "希望日に対応不可",
  CANDIDATES_REGENERATED: "候補日を再生成",
  DEADLINE_EXPIRED: "選択期限切れ",
  CONFIRMED: "日程確定",
  CANCELLED: "日程調整キャンセル",
};

const EVENT_ACTOR_LABELS: Record<string, string> = {
  MERCHANT: "提携企業",
  EMPLOYEE: "従業員",
  SYSTEM: "システム",
};

function CandidateRow({
  candidate,
  checked,
  onToggle,
  onRemove,
}: {
  candidate: ScheduleCandidateView;
  checked?: boolean;
  onToggle?: () => void;
  onRemove?: () => void;
}) {
  const interactive = Boolean(onToggle);
  const baseClass = checked
    ? "border-blue-500 bg-blue-50"
    : "border-slate-200 bg-white " + (interactive ? "opacity-60" : "");

  return (
    <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${baseClass}`}>
      {onToggle ? (
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="mt-1.5 h-4 w-4 accent-blue-600"
          aria-label={`${formatDateJa(candidate.arrivalDate)} 着を候補に含める`}
        />
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold text-slate-900">{formatDateJa(candidate.arrivalDate)} 着</div>
        <div className="mt-0.5 text-xs text-slate-500">
          発送 {formatDateJa(candidate.shipDate)}・{formatDeadlineJa(candidate.selectableUntil)} まで選択可能
        </div>
        {candidate.warnings.length > 0 ? (
          <div className="mt-1 flex flex-wrap gap-1">
            {candidate.warnings.map((warning) => (
              <span
                key={warning}
                className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800"
              >
                {warning}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className="mt-1 text-slate-400 hover:text-rose-600"
          aria-label="この候補を外す"
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>
      ) : null}
    </div>
  );
}

// 候補日提示フォーム（初回提示と、希望日応答での再提示の両方で使う）
function ProposalForm({
  detail,
  schedule,
  mode,
  onUpdated,
  onError,
  onNotice,
}: {
  detail: ExchangeDetailType;
  schedule: ExchangeScheduleView;
  mode: "propose" | "repropose";
  onUpdated: (detail: ExchangeDetailType) => void;
  onError: (message: string | null) => void;
  onNotice: (message: string | null) => void;
}) {
  // 叩き台（自動生成候補）は既定で全選択。除外はチェックを外すだけ。
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(schedule.draftCandidates.filter((candidate) => candidate.selectable).map((c) => c.arrivalDate)),
  );
  const [extraCandidates, setExtraCandidates] = useState<ScheduleCandidateView[]>([]);
  const [addDate, setAddDate] = useState("");
  const [note, setNote] = useState(schedule.merchantNote ?? "");
  const [adding, setAdding] = useState(false);
  const [pending, startTransition] = useTransition();

  const chosenDates = useMemo(() => {
    const dates = new Set<string>();
    for (const candidate of schedule.draftCandidates) {
      if (selected.has(candidate.arrivalDate)) dates.add(candidate.arrivalDate);
    }
    for (const candidate of extraCandidates) {
      dates.add(candidate.arrivalDate);
    }
    return Array.from(dates).sort();
  }, [schedule.draftCandidates, selected, extraCandidates]);

  const handleToggle = (arrivalDate: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(arrivalDate)) next.delete(arrivalDate);
      else next.add(arrivalDate);
      return next;
    });
  };

  const handleAdd = async () => {
    if (!addDate || adding) return;
    onError(null);
    setAdding(true);
    try {
      // 追加日の発送日・選択期限・警告はサーバーで計算する（フロントで日付計算はしない）
      const { candidates } = await previewScheduleCandidates(detail.exchangeId, [addDate]);
      const candidate = candidates[0];
      if (candidate) {
        setExtraCandidates((prev) => [
          ...prev.filter((entry) => entry.arrivalDate !== candidate.arrivalDate),
          candidate,
        ]);
        setAddDate("");
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : "候補日の確認に失敗しました。");
    } finally {
      setAdding(false);
    }
  };

  const handleSubmit = () => {
    onError(null);
    onNotice(null);
    startTransition(async () => {
      try {
        const updated =
          mode === "propose"
            ? await proposeSchedule(detail.exchangeId, {
                arrivalDates: chosenDates,
                merchantNote: note.trim() || undefined,
              })
            : await respondSchedule(detail.exchangeId, {
                action: "REPROPOSE",
                arrivalDates: chosenDates,
                merchantNote: note.trim() || undefined,
              });
        onUpdated(updated);
        onNotice("候補日を提示しました。従業員に選択を依頼しています。");
      } catch (err) {
        onError(err instanceof Error ? err.message : "候補日の提示に失敗しました。");
      }
    });
  };

  return (
    <div className="mt-4 space-y-3">
      {schedule.draftCandidates.length === 0 && extraCandidates.length === 0 ? (
        <Alert severity="warning">
          自動生成できる候補日がありません。休業日カレンダーを確認するか、下の入力から候補日を追加してください。
        </Alert>
      ) : null}

      {schedule.draftCandidates.map((candidate) => (
        <CandidateRow
          key={candidate.arrivalDate}
          candidate={candidate}
          checked={selected.has(candidate.arrivalDate)}
          onToggle={() => handleToggle(candidate.arrivalDate)}
        />
      ))}
      {extraCandidates.map((candidate) => (
        <CandidateRow
          key={candidate.arrivalDate}
          candidate={candidate}
          checked
          onRemove={() =>
            setExtraCandidates((prev) => prev.filter((entry) => entry.arrivalDate !== candidate.arrivalDate))
          }
        />
      ))}

      <div className="flex flex-wrap items-center gap-2">
        <TextField
          type="date"
          size="small"
          label="候補日を追加（到着日）"
          value={addDate}
          onChange={(event) => setAddDate(event.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <Button
          variant="outlined"
          onClick={handleAdd}
          disabled={!addDate || adding}
          className="!rounded-full"
          startIcon={<FontAwesomeIcon icon={faPlus} />}
        >
          {adding ? "確認中..." : "追加"}
        </Button>
        <span className="text-xs text-slate-500">
          発送可能曜日外・休業日でも追加できます（警告のみ表示されます）
        </span>
      </div>

      {schedule.availableTimeSlots.length > 0 ? (
        <Alert severity="info">
          選択できる時間帯: {schedule.availableTimeSlots.join(" / ")}（商品の設定から自動反映）
        </Alert>
      ) : null}

      <TextField
        label="従業員への連絡事項（任意）"
        fullWidth
        multiline
        minRows={2}
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />

      {/* space-y-3 の既定の間隔だと送信ボタンが連絡事項の入力欄に張り付くため、ここだけ広げる。 */}
      <div className="flex justify-end !mt-6">
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={pending || chosenDates.length === 0}
          className="!rounded-full !px-6"
          startIcon={<FontAwesomeIcon icon={faPaperPlane} />}
        >
          {chosenDates.length === 0
            ? "候補日を追加してください"
            : pending
              ? "送信中..."
              : `${chosenDates.length} 件の候補日を提示する`}
        </Button>
      </div>
    </div>
  );
}

// 希望日への応答（承諾 / 再提示 / 対応不可）
function RespondPanel({
  detail,
  schedule,
  onUpdated,
  onError,
  onNotice,
}: {
  detail: ExchangeDetailType;
  schedule: ExchangeScheduleView;
  onUpdated: (detail: ExchangeDetailType) => void;
  onError: (message: string | null) => void;
  onNotice: (message: string | null) => void;
}) {
  const [rejectReason, setRejectReason] = useState("");
  const [showRepropose, setShowRepropose] = useState(false);
  const [pending, startTransition] = useTransition();

  const run = (action: "ACCEPT" | "REJECT") => {
    if (action === "REJECT" && !rejectReason.trim()) {
      onError("対応できない理由を入力してください。従業員に表示されます。");
      return;
    }

    onError(null);
    onNotice(null);
    startTransition(async () => {
      try {
        const updated = await respondSchedule(
          detail.exchangeId,
          action === "ACCEPT" ? { action: "ACCEPT" } : { action: "REJECT", reason: rejectReason },
        );
        onUpdated(updated);
        onNotice(action === "ACCEPT" ? "希望日で確定しました。" : "対応不可として従業員に通知しました。");
      } catch (err) {
        onError(err instanceof Error ? err.message : "希望日への応答に失敗しました。");
      }
    });
  };

  return (
    <div className="mt-4 space-y-4">
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
        <dt className="text-slate-500">希望到着日</dt>
        <dd className="font-bold text-slate-900">
          {schedule.requestedArrivalDate ? formatDateJa(schedule.requestedArrivalDate) : "-"}
        </dd>
        <dt className="text-slate-500">希望時間帯</dt>
        <dd className="text-slate-900">{schedule.requestedTimeSlot ?? "指定なし"}</dd>
        <dt className="text-slate-500">備考</dt>
        <dd className="whitespace-pre-wrap text-slate-900">{schedule.requestedNote ?? "-"}</dd>
      </dl>

      {schedule.requestedDateJudgment ? (
        <Alert severity={schedule.requestedDateJudgment.ok ? "success" : "warning"}>
          システム判定: {schedule.requestedDateJudgment.message}
          {!schedule.requestedDateJudgment.ok
            ? "（臨時に対応できる場合は、そのまま承諾できます）"
            : null}
        </Alert>
      ) : null}

      {showRepropose ? (
        <div className="rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              別の候補日を再提示する（残り {schedule.proposalRoundLimit - schedule.proposalRoundCount} 回）
            </h3>
            <Button size="small" color="inherit" onClick={() => setShowRepropose(false)}>
              閉じる
            </Button>
          </div>
          <ProposalForm
            detail={detail}
            schedule={schedule}
            mode="repropose"
            onUpdated={onUpdated}
            onError={onError}
            onNotice={onNotice}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <Button
            variant="contained"
            onClick={() => run("ACCEPT")}
            disabled={pending}
            className="!rounded-full"
            startIcon={<FontAwesomeIcon icon={faCalendarCheck} />}
          >
            この希望日で確定する（承諾）
          </Button>
          <Button
            variant="outlined"
            onClick={() => setShowRepropose(true)}
            disabled={pending || !schedule.canRepropose}
            className="!rounded-full"
          >
            {schedule.canRepropose
              ? `別の候補日を再提示する（残り ${schedule.proposalRoundLimit - schedule.proposalRoundCount} 回）`
              : "候補の再提示は上限に達しています"}
          </Button>
          <TextField
            label="対応不可の場合の理由（従業員に表示されます）"
            fullWidth
            multiline
            minRows={2}
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            placeholder="例: 土曜日は製造ラインが止まるため発送できません"
          />
          <Button
            variant="outlined"
            color="error"
            onClick={() => run("REJECT")}
            disabled={pending}
            className="!rounded-full"
          >
            この希望日には対応できない
          </Button>
        </div>
      )}
    </div>
  );
}

export default function SchedulePanel({ detail, onUpdated }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const schedule = detail.schedule;
  if (!schedule) {
    return null;
  }

  const statusInfo = SCHEDULE_STATUS_LABELS[schedule.scheduleStatus];

  return (
    <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-bold text-slate-900">お届け日の調整</h2>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            statusInfo.needsAction
              ? "bg-amber-100 text-amber-800"
              : schedule.scheduleStatus === "CONFIRMED"
                ? "bg-emerald-100 text-emerald-800"
                : "bg-slate-100 text-slate-600"
          }`}
        >
          {statusInfo.label}
        </span>
      </div>

      {error ? <Alert severity="error" className="!mt-3">{error}</Alert> : null}
      {notice ? <Alert severity="success" className="!mt-3">{notice}</Alert> : null}

      {schedule.scheduleStatus === "AWAITING_PROPOSAL" ? (
        <>
          <p className="mt-1 text-sm text-slate-500">
            チェックした候補が従業員に提示されます。各候補の選択期限はサーバーが自動計算します。
            休業日は<a href="/calendar" className="mx-1 font-semibold text-blue-600 underline">休業日カレンダー</a>
            に登録しておくと候補の自動生成から除外されます。
          </p>
          <ProposalForm
            detail={detail}
            schedule={schedule}
            mode="propose"
            onUpdated={onUpdated}
            onError={setError}
            onNotice={setNotice}
          />
        </>
      ) : null}

      {schedule.scheduleStatus === "AWAITING_SELECTION" ? (
        <>
          <p className="mt-1 text-sm text-slate-500">
            従業員がお届け日を選択するのを待っています。全候補が期限切れになった場合は、自動的に候補を再生成して再提示します。
          </p>
          <div className="mt-4 space-y-2">
            {schedule.candidates.map((candidate) => (
              <CandidateRow key={candidate.arrivalDate} candidate={candidate} />
            ))}
          </div>
          {schedule.merchantRejectReason ? (
            <Alert severity="info" className="!mt-3">
              前回の希望日には「{schedule.merchantRejectReason}」として対応不可と回答済みです。
            </Alert>
          ) : null}
          {schedule.candidates.every((candidate) => !candidate.selectable) ? (
            schedule.canRepropose ? (
              <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50/50 p-4">
                <h3 className="text-sm font-bold text-slate-900">
                  すべての候補が期限切れです — 候補を再提示できます（残り{" "}
                  {schedule.proposalRoundLimit - schedule.proposalRoundCount} 回）
                </h3>
                <ProposalForm
                  detail={detail}
                  schedule={schedule}
                  mode="repropose"
                  onUpdated={onUpdated}
                  onError={setError}
                  onNotice={setNotice}
                />
              </div>
            ) : (
              <Alert severity="warning" className="!mt-3">
                すべての候補が期限切れで、再提示回数も上限に達しています。このままの場合、交換は自動的にキャンセルされポイントが返還されます。
              </Alert>
            )
          ) : null}
        </>
      ) : null}

      {schedule.scheduleStatus === "AWAITING_MERCHANT_RESPONSE" ? (
        <>
          <p className="mt-1 text-sm text-slate-500">
            従業員から「候補の中に受け取れる日がない」として希望日が届いています。48 時間以内に応答してください。
          </p>
          <RespondPanel
            detail={detail}
            schedule={schedule}
            onUpdated={onUpdated}
            onError={setError}
            onNotice={setNotice}
          />
        </>
      ) : null}

      {schedule.scheduleStatus === "CONFIRMED" ? (
        <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-sm font-bold text-emerald-800">
            お届け日: {schedule.selectedArrivalDate ? formatDateJa(schedule.selectedArrivalDate) : "-"}
            {schedule.selectedTimeSlot ? ` ${schedule.selectedTimeSlot}` : ""}
          </div>
          <div className="mt-1 text-xs text-emerald-700">
            {schedule.confirmedAt ? `${formatDateTimeJa(schedule.confirmedAt)} に確定` : ""}
            ・この日に到着するよう発送してください
          </div>
        </div>
      ) : null}

      {schedule.scheduleStatus === "CANCELLED" ? (
        <p className="mt-3 text-sm text-slate-500">
          日程調整は終了しました。使用ポイントは従業員に返還されています。
        </p>
      ) : null}

      {schedule.events.length > 0 ? (
        <details className="mt-5">
          <summary className="cursor-pointer text-sm font-semibold text-slate-700">
            日程調整の操作ログ（{schedule.events.length} 件）
          </summary>
          <ol className="mt-3 space-y-2">
            {schedule.events.map((event) => (
              <li
                key={event.seq}
                className="flex flex-col gap-1 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <span className="font-semibold text-slate-900">
                    {EVENT_TYPE_LABELS[event.eventType] ?? event.eventType}
                  </span>
                  <span className="ml-3 text-slate-600">
                    {EVENT_ACTOR_LABELS[event.actor] ?? event.actor}
                    {event.actorName ? ` ${event.actorName}` : ""}
                  </span>
                </div>
                <div className="text-xs text-slate-500">{formatDateTimeJa(event.occurredAt)}</div>
              </li>
            ))}
          </ol>
        </details>
      ) : null}
    </section>
  );
}
