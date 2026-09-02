import Link from "next/link";
import type { Route } from "next";

import type { PendingReservationSummary } from "../model/types";

type Props = {
  items: PendingReservationSummary[];
};

// マイページ上部の「予約と来店をお願いします」バナー。
// 承認済みの予約型サービス（サロン等）は本人の予約・来店で完結するため、
// お届け日選択の案内（ScheduleBanner）と同様に本人の操作を促す警告色で表示する。
export default function ReservationBanner({ items }: Props) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border-2 border-amber-500 bg-amber-50 px-5 py-4">
      <div className="text-sm font-bold text-amber-900">💇 ご予約とご来店をお願いします</div>
      <p className="mt-1 text-xs text-amber-800">
        交換申請が承認されました。予約案内に沿ってご予約のうえ、交換番号を店舗へお伝えください。
      </p>
      <ul className="mt-2 space-y-2">
        {items.map((item) => (
          <li key={item.exchangeId} className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm text-amber-900">
              「{item.merchandiseName}」
              {item.merchantName ? <span className="ml-1 text-xs">— {item.merchantName}</span> : null}
              {item.reservationCode ? (
                <span className="ml-2 rounded-md bg-white/70 px-1.5 py-0.5 font-mono text-xs font-bold">
                  {item.reservationCode}
                </span>
              ) : null}
            </span>
            <Link
              href={`/exchange-history/${encodeURIComponent(item.exchangeId)}` as Route}
              className="rounded-full bg-amber-700 px-4 py-1.5 text-xs font-bold text-amber-50 hover:bg-amber-800"
            >
              予約案内を見る →
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
