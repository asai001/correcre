"use client";

import { useMemo, useState, useTransition } from "react";
import { Alert, Button, Checkbox, FormControlLabel, Switch, TextField } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faChevronRight, faPlus } from "@fortawesome/free-solid-svg-icons";

import AdminPageHeader from "@merchant/components/AdminPageHeader";

import { updateCalendar } from "../api/client";
import type { MerchantCalendarView } from "../model/types";

type Props = {
  initial: MerchantCalendarView;
  merchantName: string;
  merchantDisplayName?: string;
};

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"] as const;

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

// 月グリッドの組み立て（表示レイアウトのみ。営業日・締切の計算はサーバー側で行う）
function buildMonthCells(year: number, month: number) {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const cells: ({ date: string; day: number; weekday: number } | null)[] = [];
  for (let i = 0; i < firstWeekday; i += 1) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({
      date: `${year}-${pad2(month)}-${pad2(day)}`,
      day,
      weekday: (firstWeekday + day - 1) % 7,
    });
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  return cells;
}

export default function CalendarPage({ initial, merchantName, merchantDisplayName }: Props) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);

  const [closedDates, setClosedDates] = useState<Set<string>>(() => new Set(initial.closedDates));
  const [regularClosedWeekdays, setRegularClosedWeekdays] = useState<Set<number>>(
    () => new Set(initial.regularClosedWeekdays),
  );
  const [treatHolidaysAsClosed, setTreatHolidaysAsClosed] = useState(initial.treatPublicHolidaysAsClosed);
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const holidayNames = useMemo(
    () => new Map(initial.holidays.map((holiday) => [holiday.date, holiday.name])),
    [initial.holidays],
  );

  const cells = useMemo(() => buildMonthCells(viewYear, viewMonth), [viewYear, viewMonth]);

  const moveMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth - 1 + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth() + 1);
  };

  const toggleDate = (date: string) => {
    setClosedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  const toggleWeekday = (weekday: number) => {
    setRegularClosedWeekdays((prev) => {
      const next = new Set(prev);
      if (next.has(weekday)) next.delete(weekday);
      else next.add(weekday);
      return next;
    });
  };

  const addRange = () => {
    if (!rangeFrom || !rangeTo || rangeFrom > rangeTo) {
      setError("休業期間の開始日と終了日を正しく指定してください。");
      return;
    }
    setError(null);
    // 保存時にサーバー側でも展開・検証されるが、画面上でも即時に反映して確認できるようにする
    setClosedDates((prev) => {
      const next = new Set(prev);
      const from = new Date(`${rangeFrom}T00:00:00Z`);
      const to = new Date(`${rangeTo}T00:00:00Z`);
      for (let cursor = from; cursor <= to; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
        next.add(cursor.toISOString().slice(0, 10));
        if (next.size > 800) break;
      }
      return next;
    });
    setRangeFrom("");
    setRangeTo("");
  };

  const handleSave = () => {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      try {
        const saved = await updateCalendar({
          closedDates: Array.from(closedDates).sort(),
          regularClosedWeekdays: Array.from(regularClosedWeekdays).sort((a, b) => a - b),
          treatPublicHolidaysAsClosed: treatHolidaysAsClosed,
        });
        setClosedDates(new Set(saved.closedDates));
        setRegularClosedWeekdays(new Set(saved.regularClosedWeekdays));
        setTreatHolidaysAsClosed(saved.treatPublicHolidaysAsClosed);
        setNotice("休業日カレンダーを保存しました。以後の候補日の自動生成に反映されます。");
      } catch (err) {
        setError(err instanceof Error ? err.message : "保存に失敗しました。");
      }
    });
  };

  return (
    <div className="space-y-6 pb-10">
      <AdminPageHeader
        title="休業日カレンダー"
        adminName={merchantName}
        merchantDisplayName={merchantDisplayName}
        subtitle="お届け候補日の自動生成から除外する日を登録します"
        backHref="/dashboard"
      />

      {error ? <Alert severity="error">{error}</Alert> : null}
      {notice ? <Alert severity="success">{notice}</Alert> : null}

      <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
        <h2 className="text-lg font-bold text-slate-900">臨時休業日</h2>
        <p className="mt-1 text-sm text-slate-500">
          日付をクリックして追加・解除できます。出張や年末年始など、発送できない日を事前に登録しておくと、
          候補日を毎回手で外す必要がなくなります。
        </p>

        <div className="mt-5 flex items-center justify-between">
          <div className="text-base font-bold text-slate-900">
            {viewYear}年{viewMonth}月
          </div>
          <div className="flex gap-2">
            <Button
              variant="outlined"
              size="small"
              color="inherit"
              onClick={() => moveMonth(-1)}
              className="!min-w-0 !rounded-full"
              aria-label="前月"
            >
              <FontAwesomeIcon icon={faChevronLeft} />
            </Button>
            <Button
              variant="outlined"
              size="small"
              color="inherit"
              onClick={() => moveMonth(1)}
              className="!min-w-0 !rounded-full"
              aria-label="翌月"
            >
              <FontAwesomeIcon icon={faChevronRight} />
            </Button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs text-slate-500">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="py-1">
              {label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell, index) => {
            if (!cell) {
              return <div key={`empty-${index}`} className="h-12" />;
            }

            const isClosed = closedDates.has(cell.date);
            const holidayName = holidayNames.get(cell.date);
            const isHoliday = Boolean(holidayName) && treatHolidaysAsClosed;
            const isRegular = regularClosedWeekdays.has(cell.weekday);

            const className = isClosed
              ? "bg-rose-100 font-bold text-rose-800 border-transparent"
              : isHoliday
                ? "bg-amber-100 text-amber-800 border-transparent"
                : isRegular
                  ? "border-dashed border-slate-300 bg-slate-50 text-slate-400"
                  : "border-slate-200 bg-white text-slate-800 hover:border-blue-400";

            return (
              <button
                key={cell.date}
                type="button"
                onClick={() => toggleDate(cell.date)}
                className={`flex h-12 flex-col items-center justify-center rounded-xl border text-sm ${className}`}
                aria-pressed={isClosed}
                aria-label={`${cell.date}${isClosed ? " 臨時休業" : ""}${holidayName ? ` ${holidayName}` : ""}`}
              >
                <span>{cell.day}</span>
                {holidayName ? <span className="text-[9px] leading-tight">{holidayName}</span> : null}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
          <span>
            <i className="mr-1.5 inline-block h-3 w-3 rounded bg-rose-100 align-[-1px]" />
            臨時休業
          </span>
          <span>
            <i className="mr-1.5 inline-block h-3 w-3 rounded border border-dashed border-slate-300 bg-slate-50 align-[-1px]" />
            定休日
          </span>
          <span>
            <i className="mr-1.5 inline-block h-3 w-3 rounded bg-amber-100 align-[-1px]" />
            祝日（自動）
          </span>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <TextField
            type="date"
            size="small"
            label="期間で追加（開始）"
            value={rangeFrom}
            onChange={(event) => setRangeFrom(event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <span className="text-slate-400">〜</span>
          <TextField
            type="date"
            size="small"
            label="期間で追加（終了）"
            value={rangeTo}
            onChange={(event) => setRangeTo(event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <Button
            variant="outlined"
            onClick={addRange}
            className="!rounded-full"
            startIcon={<FontAwesomeIcon icon={faPlus} />}
          >
            期間を追加
          </Button>
          <span className="text-xs text-slate-500">出張・年末年始などの連休はこちらが便利です</span>
        </div>
      </section>

      <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
        <h2 className="text-lg font-bold text-slate-900">定休日・祝日</h2>
        <div className="mt-4">
          <div className="text-xs font-semibold text-slate-500">定休日（毎週）</div>
          <div className="mt-2 flex flex-wrap gap-1">
            {WEEKDAY_LABELS.map((label, weekday) => (
              <FormControlLabel
                key={label}
                control={
                  <Checkbox
                    size="small"
                    checked={regularClosedWeekdays.has(weekday)}
                    onChange={() => toggleWeekday(weekday)}
                  />
                }
                label={label}
              />
            ))}
          </div>
        </div>
        <FormControlLabel
          className="!mt-2"
          control={
            <Switch
              checked={treatHolidaysAsClosed}
              onChange={(_event, checked) => setTreatHolidaysAsClosed(checked)}
            />
          }
          label="日本の祝日を休業日として扱う（祝日も営業する場合はオフにしてください）"
        />
      </section>

      <div className="flex justify-end">
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={pending}
          className="!rounded-full !px-7 !py-3"
        >
          {pending ? "保存中..." : "保存する"}
        </Button>
      </div>
    </div>
  );
}
