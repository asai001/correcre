"use client";

import { useState, useTransition } from "react";
import { Alert, Button, Checkbox, FormControlLabel, MenuItem, TextField } from "@mui/material";

import EmployeePageHeader from "@employee/components/EmployeePageHeader";

import { CandidateExpiredError, cancelSchedule, requestDate, selectCandidate } from "../api/client";
import type { EmployeeScheduleCandidateView, EmployeeScheduleView } from "../model/types";

type Props = {
  initial: EmployeeScheduleView;
  initialPointBalance: number;
};

const NO_TIME_SLOT = "__none__";

function CandidateCard({
  candidate,
  selected,
  onSelect,
}: {
  candidate: EmployeeScheduleCandidateView;
  selected: boolean;
  onSelect: () => void;
}) {
  if (!candidate.selectable) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 opacity-60">
        <span className="mt-1 h-4 w-4 flex-none rounded-full border-2 border-slate-300" />
        <div>
          <span className="text-sm font-bold text-slate-500">{candidate.arrivalDateLabel} 着</span>
          <span className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700">
            受付終了
          </span>
          <div className="mt-0.5 text-xs text-slate-400">選択期限を過ぎたため選べません</div>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left ${
        selected ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white hover:border-blue-300"
      }`}
      aria-pressed={selected}
    >
      <span
        className={`mt-1 h-4 w-4 flex-none rounded-full border-2 ${
          selected ? "border-[5px] border-blue-600" : "border-slate-300"
        }`}
      />
      <div>
        <span className="text-sm font-bold text-slate-900">{candidate.arrivalDateLabel} 着</span>
        <div className="mt-0.5 text-xs text-slate-500">{candidate.selectableUntilLabel}</div>
      </div>
    </button>
  );
}

export default function ScheduleDetail({ initial, initialPointBalance }: Props) {
  const [view, setView] = useState(initial);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [timeSlot, setTimeSlot] = useState<string>(NO_TIME_SLOT);
  const [acknowledged, setAcknowledged] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestedDate, setRequestedDate] = useState("");
  const [requestedTimeSlot, setRequestedTimeSlot] = useState<string>(NO_TIME_SLOT);
  const [requestedNote, setRequestedNote] = useState("");
  const [requestAcknowledged, setRequestAcknowledged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const applyView = (next: EmployeeScheduleView) => {
    setView(next);
    setSelectedDate(null);
    setAcknowledged(false);
    setShowRequestForm(false);
  };

  const selectedCandidate = view.candidates.find(
    (candidate) => candidate.arrivalDate === selectedDate && candidate.selectable,
  );

  const canConfirm = Boolean(selectedCandidate) && (!view.requiresAcknowledgement || acknowledged);

  const handleConfirm = () => {
    if (!selectedCandidate) return;
    setError(null);
    setNotice(null);
    startTransition(async () => {
      try {
        const next = await selectCandidate(view.exchangeId, {
          arrivalDate: selectedCandidate.arrivalDate,
          timeSlot: timeSlot === NO_TIME_SLOT ? undefined : timeSlot,
          acknowledged: view.requiresAcknowledgement ? acknowledged : undefined,
        });
        applyView(next);
        setNotice("お届け日を確定しました。前日にリマインドをお送りします。");
      } catch (err) {
        if (err instanceof CandidateExpiredError) {
          // 画面を開いたまま期限を過ぎたケース。最新の候補で描画し直す。
          if (err.latest) applyView(err.latest);
          setError(err.message);
          return;
        }
        setError(err instanceof Error ? err.message : "お届け日の確定に失敗しました。");
      }
    });
  };

  const handleRequestDate = () => {
    if (!requestedDate) {
      setError("希望日を入力してください。");
      return;
    }
    setError(null);
    setNotice(null);
    startTransition(async () => {
      try {
        const next = await requestDate(view.exchangeId, {
          requestedArrivalDate: requestedDate,
          requestedTimeSlot: requestedTimeSlot === NO_TIME_SLOT ? undefined : requestedTimeSlot,
          requestedNote: requestedNote.trim() || undefined,
          acknowledged: view.requiresAcknowledgement ? requestAcknowledged : undefined,
        });
        applyView(next);
        setNotice("希望日を送信しました。提携企業の回答をお待ちください（最大 48 時間）。");
      } catch (err) {
        setError(err instanceof Error ? err.message : "希望日の送信に失敗しました。");
      }
    });
  };

  const handleCancel = () => {
    if (
      typeof window !== "undefined" &&
      !window.confirm("この交換をキャンセルします。使用したポイントは全額返還されます。よろしいですか？")
    ) {
      return;
    }
    setError(null);
    setNotice(null);
    startTransition(async () => {
      try {
        const next = await cancelSchedule(view.exchangeId);
        applyView(next);
        setNotice("交換をキャンセルしました。ポイントは全額返還されています。");
      } catch (err) {
        setError(err instanceof Error ? err.message : "キャンセルに失敗しました。");
      }
    });
  };

  const isActive =
    view.scheduleStatus === "AWAITING_PROPOSAL" ||
    view.scheduleStatus === "AWAITING_SELECTION" ||
    view.scheduleStatus === "AWAITING_MERCHANT_RESPONSE";

  return (
    <div className="-mt-px pb-12">
      <EmployeePageHeader
        title="お届け日の選択"
        showPointExchangeLink
        right={
          <p className="text-sm font-semibold text-slate-200 sm:text-base">
            <span className="mr-1 text-xs text-slate-300 sm:text-sm">保有ポイント：</span>
            {initialPointBalance.toLocaleString("ja-JP")}pt
          </p>
        }
      />

      <div className="container mx-auto max-w-2xl px-6 pt-8">
        {error ? <Alert severity="error" className="!mb-4">{error}</Alert> : null}
        {notice ? <Alert severity="success" className="!mb-4">{notice}</Alert> : null}

        <section className="rounded-2xl bg-white p-6 shadow-lg">
          <h1 className="text-lg font-bold text-slate-900">{view.merchandiseName}</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {view.merchantName ?? "提携企業"}・{view.usedPoint.toLocaleString("ja-JP")}pt 使用
          </p>

          {view.merchantNote ? (
            <div className="mt-3 rounded-xl bg-blue-50 px-4 py-2.5 text-sm text-slate-700">
              提携企業からの連絡: {view.merchantNote}
            </div>
          ) : null}

          {view.scheduleStatus === "AWAITING_PROPOSAL" ? (
            <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              提携企業がお届け候補日を準備しています。候補が提示されるとメールでお知らせしますので、しばらくお待ちください。
            </div>
          ) : null}

          {view.scheduleStatus === "AWAITING_SELECTION" ? (
            <>
              {view.merchantRejectReason ? (
                <div className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  ご希望の{view.requestedArrivalDate ? `お届け日（${view.requestedArrivalDate}）` : "日程"}
                  には対応できませんでした。
                  <div className="mt-1">理由: {view.merchantRejectReason}</div>
                </div>
              ) : null}

              <h2 className="mt-5 text-sm font-bold text-slate-900">お届け日を選択してください</h2>
              <div className="mt-3 space-y-2">
                {view.candidates.map((candidate) => (
                  <CandidateCard
                    key={candidate.arrivalDate}
                    candidate={candidate}
                    selected={selectedDate === candidate.arrivalDate}
                    onSelect={() => setSelectedDate(candidate.arrivalDate)}
                  />
                ))}
              </div>

              {view.availableTimeSlots.length > 0 ? (
                <TextField
                  select
                  label="お届け時間帯（任意）"
                  fullWidth
                  size="small"
                  className="!mt-4"
                  value={timeSlot}
                  onChange={(event) => setTimeSlot(event.target.value)}
                >
                  <MenuItem value={NO_TIME_SLOT}>指定なし</MenuItem>
                  {view.availableTimeSlots.map((slot) => (
                    <MenuItem key={slot} value={slot}>
                      {slot}
                    </MenuItem>
                  ))}
                </TextField>
              ) : null}

              {view.requiresAcknowledgement ? (
                <div className="mt-4 rounded-2xl border-2 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <div className="whitespace-pre-wrap font-medium">{view.acknowledgementText}</div>
                  <FormControlLabel
                    className="!mt-1"
                    control={
                      <Checkbox
                        checked={acknowledged}
                        onChange={(_event, checked) => setAcknowledged(checked)}
                        sx={{ color: "#b45309", "&.Mui-checked": { color: "#b45309" } }}
                      />
                    }
                    label={<span className="text-sm font-bold">確認しました</span>}
                  />
                </div>
              ) : null}

              <Button
                variant="contained"
                fullWidth
                disabled={!canConfirm || pending}
                onClick={handleConfirm}
                className="!mt-4 !rounded-full !py-3"
              >
                {selectedCandidate
                  ? `${selectedCandidate.arrivalDateLabel}${timeSlot !== NO_TIME_SLOT ? ` ${timeSlot}` : ""} で確定する`
                  : "候補日を選択してください"}
              </Button>

              {view.canRequestDate && !showRequestForm ? (
                <button
                  type="button"
                  onClick={() => setShowRequestForm(true)}
                  className="mt-3 block w-full text-center text-sm text-blue-600 underline"
                >
                  この中に受け取れる日がない（希望日を伝える）
                </button>
              ) : null}

              {showRequestForm ? (
                <div className="mt-4 rounded-2xl border border-slate-200 p-4">
                  <h3 className="text-sm font-bold text-slate-900">
                    希望のお届け日を伝える（残り {view.remainingRequestCount} 回）
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    提携企業が対応できるか確認して回答します。回答まで最大 48 時間お待ちください。
                  </p>
                  <TextField
                    type="date"
                    label="希望日"
                    fullWidth
                    size="small"
                    className="!mt-3"
                    value={requestedDate}
                    onChange={(event) => setRequestedDate(event.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                  {view.availableTimeSlots.length > 0 ? (
                    <TextField
                      select
                      label="希望時間帯（任意）"
                      fullWidth
                      size="small"
                      className="!mt-3"
                      value={requestedTimeSlot}
                      onChange={(event) => setRequestedTimeSlot(event.target.value)}
                    >
                      <MenuItem value={NO_TIME_SLOT}>指定なし</MenuItem>
                      {view.availableTimeSlots.map((slot) => (
                        <MenuItem key={slot} value={slot}>
                          {slot}
                        </MenuItem>
                      ))}
                    </TextField>
                  ) : null}
                  <TextField
                    label="備考（任意）"
                    fullWidth
                    size="small"
                    multiline
                    minRows={2}
                    className="!mt-3"
                    value={requestedNote}
                    onChange={(event) => setRequestedNote(event.target.value)}
                    placeholder="例: 平日は 20 時まで不在のため週末を希望します"
                  />
                  {view.requiresAcknowledgement ? (
                    // 希望日は提携企業の承諾でそのまま確定するため、同意はこの時点で取る
                    <div className="mt-3 rounded-2xl border-2 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      <div className="whitespace-pre-wrap font-medium">{view.acknowledgementText}</div>
                      <FormControlLabel
                        className="!mt-1"
                        control={
                          <Checkbox
                            checked={requestAcknowledged}
                            onChange={(_event, checked) => setRequestAcknowledged(checked)}
                            sx={{ color: "#b45309", "&.Mui-checked": { color: "#b45309" } }}
                          />
                        }
                        label={<span className="text-sm font-bold">確認しました</span>}
                      />
                    </div>
                  ) : null}
                  <div className="mt-3 flex flex-col gap-2">
                    <Button
                      variant="contained"
                      onClick={handleRequestDate}
                      disabled={pending || (view.requiresAcknowledgement && !requestAcknowledged)}
                      className="!rounded-full"
                    >
                      この内容で希望を送る
                    </Button>
                    <Button
                      variant="outlined"
                      color="inherit"
                      onClick={() => setShowRequestForm(false)}
                      className="!rounded-full"
                    >
                      候補から選び直す
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          ) : null}

          {view.scheduleStatus === "AWAITING_MERCHANT_RESPONSE" ? (
            <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <div className="font-bold text-slate-800">希望日を提携企業に確認しています</div>
              <div className="mt-1">
                希望: {view.requestedArrivalDate}
                {view.requestedTimeSlot ? ` ${view.requestedTimeSlot}` : ""}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                回答があり次第メールでお知らせします（最大 48 時間）。
              </div>
            </div>
          ) : null}

          {view.scheduleStatus === "CONFIRMED" ? (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <div className="text-sm font-bold text-emerald-800">
                お届け日: {view.selectedArrivalDateLabel ?? view.selectedArrivalDate}
                {view.selectedTimeSlot ? ` ${view.selectedTimeSlot}` : ""}
              </div>
              <div className="mt-1 text-xs text-emerald-700">
                前日にリマインドメールをお送りします。確実にお受け取りください。
              </div>
            </div>
          ) : null}

          {view.scheduleStatus === "CANCELLED" ? (
            <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              この交換はキャンセルされました。使用したポイントは全額返還されています。
            </div>
          ) : null}

          {isActive ? (
            <button
              type="button"
              onClick={handleCancel}
              disabled={pending}
              className="mt-6 block w-full rounded-full border border-rose-300 py-2.5 text-center text-sm font-semibold text-rose-600 hover:bg-rose-50"
            >
              交換をキャンセルする（ポイントは全額返還されます）
            </button>
          ) : null}
        </section>
      </div>
    </div>
  );
}
