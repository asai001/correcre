"use client";

import { startTransition, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";

import { Alert, Button } from "@mui/material";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { MerchandiseDetail, type PublicMerchandiseDetail } from "@correcre/merchandise-public";

import { requestExchange } from "../api/client";
import ExchangePageHeader from "./ExchangePageHeader";

type Props = {
  item: PublicMerchandiseDetail;
  initialPointBalance: number;
};

function formatPoint(value: number) {
  return `${value.toLocaleString("ja-JP")}pt`;
}

export default function ExchangeDetail({ item, initialPointBalance }: Props) {
  const router = useRouter();
  const [pointBalance, setPointBalance] = useState(initialPointBalance);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const insufficient = pointBalance < item.requiredPoint;
  const buttonDisabled = submitting || submitted || insufficient;

  const handleRequest = async () => {
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      const result = await requestExchange({
        merchantId: item.merchantId,
        merchandiseId: item.merchandiseId,
      });
      setPointBalance(result.currentPointBalance);
      setSuccess(
        `交換を申請しました。${formatPoint(result.usedPoint)}を保留中です。提携企業の対応をお待ちください。`,
      );
      setSubmitted(true);
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "交換申請に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="-mt-px pb-10">
      <ExchangePageHeader currentPointBalance={pointBalance} />

      <div className="container mx-auto px-6">
        <div className="mt-6">
          <Link
            href={"/exchange" as Route}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
          >
            <FontAwesomeIcon icon={faArrowLeft} />
            一覧へ戻る
          </Link>
        </div>

        <div className="mt-6">
          <MerchandiseDetail item={item} />
        </div>

        <div className="mt-6 rounded-2xl bg-white p-6 shadow-lg">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm text-slate-500">必要ポイント</div>
              <div className="text-2xl font-bold text-slate-900">{formatPoint(item.requiredPoint)}</div>
              {insufficient ? (
                <div className="mt-1 text-sm font-semibold text-red-600">
                  ポイント残高が不足しています（不足 {formatPoint(item.requiredPoint - pointBalance)}）。
                </div>
              ) : null}
            </div>

            <Button
              variant="contained"
              size="large"
              disabled={buttonDisabled}
              onClick={handleRequest}
              className="!rounded-full !px-6"
            >
              {submitted ? "申請済み" : submitting ? "申請中…" : "交換を申請する"}
            </Button>
          </div>

          {error ? (
            <Alert severity="error" className="!mt-4">
              {error}
            </Alert>
          ) : null}

          {success ? (
            <Alert severity="success" className="!mt-4">
              {success}
            </Alert>
          ) : null}

          <p className="mt-4 text-xs text-slate-500">
            交換を申請するとポイントが保留されます。提携企業の対応完了後にポイントの消費が確定します。却下・キャンセルの場合は保留中のポイントが返却されます。
          </p>
        </div>
      </div>
    </div>
  );
}
