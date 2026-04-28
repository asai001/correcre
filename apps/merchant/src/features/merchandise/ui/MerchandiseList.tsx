"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Alert, Button } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCirclePlus, faPenToSquare } from "@fortawesome/free-solid-svg-icons";

import AdminPageHeader from "@merchant/components/AdminPageHeader";
import type { MerchandiseSummary } from "../model/types";
import { updateMerchandiseStatus } from "../api/client";

type Props = {
  initialItems: MerchandiseSummary[];
  merchantName: string;
};

const STATUS_LABELS: Record<MerchandiseSummary["status"], string> = {
  DRAFT: "下書き",
  PUBLISHED: "公開中",
  UNPUBLISHED: "非公開",
};

const STATUS_BADGE_CLASSES: Record<MerchandiseSummary["status"], string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  PUBLISHED: "bg-emerald-100 text-emerald-800",
  UNPUBLISHED: "bg-amber-100 text-amber-800",
};

function formatPoint(value: number) {
  return `${value.toLocaleString("ja-JP")}pt`;
}

export default function MerchandiseList({ initialItems, merchantName }: Props) {
  const [items, setItems] = useState(initialItems);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const handleToggle = (item: MerchandiseSummary) => {
    setError(null);
    setPendingId(item.merchandiseId);

    const nextStatus: MerchandiseSummary["status"] = item.status === "PUBLISHED" ? "UNPUBLISHED" : "PUBLISHED";

    startTransition(async () => {
      try {
        const updated = await updateMerchandiseStatus(item.merchandiseId, { status: nextStatus });
        setItems((current) =>
          current.map((entry) => (entry.merchandiseId === updated.merchandiseId ? updated : entry)),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "公開状態の更新に失敗しました。");
      } finally {
        setPendingId(null);
      }
    });
  };

  return (
    <div className="space-y-6 pb-10">
      <AdminPageHeader
        title="商品・サービス管理"
        adminName={merchantName}
        subtitle="掲載商品・サービスの登録、編集、公開状態の管理"
        backHref="/dashboard"
      />

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-slate-500">
          公開中の商品はコレクレ従業員アプリの商品交換ページに表示されます。下書き／非公開の商品は表示されません。
        </p>
        <Link
          href="/merchandise/new"
          className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          <FontAwesomeIcon icon={faCirclePlus} />
          新規登録
        </Link>
      </div>

      {error ? <Alert severity="error">{error}</Alert> : null}

      {items.length === 0 ? (
        <div className="rounded-[28px] bg-white p-10 text-center text-sm text-slate-500 shadow-lg shadow-slate-200/70">
          まだ商品・サービスは登録されていません。「新規登録」から作成してください。
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {items.map((item) => (
            <li
              key={item.merchandiseId}
              className="overflow-hidden rounded-[28px] bg-white shadow-lg shadow-slate-200/70"
            >
              <div className="aspect-[16/10] w-full bg-slate-100">
                {item.cardImageViewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.cardImageViewUrl}
                    alt={item.merchandiseName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
                    画像未設定
                  </div>
                )}
              </div>
              <div className="space-y-3 p-5">
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_BADGE_CLASSES[item.status]}`}
                  >
                    {STATUS_LABELS[item.status]}
                  </span>
                  <span className="text-sm font-semibold text-slate-700">{formatPoint(item.requiredPoint)}</span>
                </div>
                <div>
                  <div className="text-xs text-slate-500">{item.heading}</div>
                  <div className="mt-1 line-clamp-2 text-base font-bold text-slate-900">{item.merchandiseName}</div>
                </div>
                <div className="flex items-center justify-between gap-3 pt-2">
                  <Link
                    href={`/merchandise/${encodeURIComponent(item.merchandiseId)}`}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900"
                  >
                    <FontAwesomeIcon icon={faPenToSquare} />
                    編集
                  </Link>
                  <Button
                    size="small"
                    variant={item.status === "PUBLISHED" ? "outlined" : "contained"}
                    onClick={() => handleToggle(item)}
                    disabled={pendingId === item.merchandiseId}
                    className="!rounded-full !px-4"
                  >
                    {item.status === "PUBLISHED" ? "非公開にする" : "公開する"}
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
