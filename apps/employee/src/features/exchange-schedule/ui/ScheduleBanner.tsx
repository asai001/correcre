import Link from "next/link";
import type { Route } from "next";

import type { PendingScheduleSummary } from "../model/types";

type Props = {
  items: PendingScheduleSummary[];
};

// マイページ上部の「お届け日の選択が必要な交換があります」バナー。
// 本人の操作が必要な選択待ちは警告色、それ以外の調整中は控えめな情報表示にする。
export default function ScheduleBanner({ items }: Props) {
  if (items.length === 0) {
    return null;
  }

  const needsSelection = items.filter((item) => item.scheduleStatus === "AWAITING_SELECTION");
  const waiting = items.filter((item) => item.scheduleStatus !== "AWAITING_SELECTION");

  return (
    <div className="space-y-3">
      {needsSelection.length > 0 ? (
        <div className="rounded-2xl border-2 border-amber-500 bg-amber-50 px-5 py-4">
          <div className="text-sm font-bold text-amber-900">📦 お届け日の選択が必要な交換があります</div>
          <ul className="mt-2 space-y-2">
            {needsSelection.map((item) => (
              <li key={item.exchangeId} className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm text-amber-900">
                  「{item.merchandiseName}」
                  {item.nearestDeadlineLabel ? (
                    <span className="ml-1 text-xs">— 最短の候補は {item.nearestDeadlineLabel}選択できます</span>
                  ) : null}
                </span>
                <Link
                  href={`/exchange-history/${encodeURIComponent(item.exchangeId)}` as Route}
                  className="rounded-full bg-amber-700 px-4 py-1.5 text-xs font-bold text-amber-50 hover:bg-amber-800"
                >
                  お届け日を選ぶ →
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {waiting.length > 0 ? (
        <div className="rounded-2xl bg-blue-50 px-5 py-3 text-sm text-slate-700">
          {waiting.map((item) => (
            <div key={item.exchangeId} className="flex flex-wrap items-center justify-between gap-2 py-0.5">
              <span>
                「{item.merchandiseName}」のお届け日を提携企業と調整中です
                {item.scheduleStatus === "AWAITING_MERCHANT_RESPONSE" ? "（希望日を確認中）" : ""}
              </span>
              <Link
                href={`/exchange-history/${encodeURIComponent(item.exchangeId)}` as Route}
                className="text-xs font-semibold text-blue-700 underline"
              >
                状況を見る
              </Link>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
