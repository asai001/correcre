"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { getExchangeStatusBadge } from "@correcre/merchandise-public";
import { isMerchantDeletionConfirmed } from "@correcre/lib/merchant/deletion";

import { deleteMerchant, fetchMerchantDeletionPreview } from "../api/client";
import type { DeleteMerchantResult, MerchantDeletionExchange, MerchantDeletionPreview, MerchantSummary } from "../model/types";

type Props = {
  merchant: MerchantSummary | null;
  onClose: () => void;
  onDeleted: (result: DeleteMerchantResult) => void;
};

function formatDateTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

// 対応中の交換と申請者の連絡先。削除後も申請者へ連絡できるよう、削除結果の画面でも同じ表を出す。
function ExchangeContactTable({
  exchanges,
  showNotified,
}: {
  exchanges: (MerchantDeletionExchange & { notified?: boolean })[];
  showNotified?: boolean;
}) {
  return (
    <div className="max-h-72 overflow-auto rounded-xl border border-slate-200">
      <table className="w-full border-collapse text-xs">
        <thead className="sticky top-0 bg-slate-50">
          <tr className="text-left text-slate-500">
            <th className="px-3 py-2 font-semibold">申請日</th>
            <th className="px-3 py-2 font-semibold">状態</th>
            <th className="px-3 py-2 font-semibold">商品・サービス</th>
            <th className="px-3 py-2 text-right font-semibold">pt</th>
            <th className="px-3 py-2 font-semibold">申請者（所属）</th>
            <th className="px-3 py-2 font-semibold">メールアドレス</th>
            {showNotified ? <th className="px-3 py-2 font-semibold">お知らせ</th> : null}
          </tr>
        </thead>
        <tbody>
          {exchanges.map((exchange) => {
            const badge = getExchangeStatusBadge(exchange.status);
            return (
              <tr key={exchange.exchangeId} className="border-t border-slate-100">
                <td className="px-3 py-2 whitespace-nowrap">{formatDateTime(exchange.exchangedAt)}</td>
                <td className="px-3 py-2">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.className}`}>
                    {badge.label}
                  </span>
                </td>
                <td className="px-3 py-2">{exchange.merchandiseName}</td>
                <td className="px-3 py-2 text-right">{exchange.usedPoint.toLocaleString("ja-JP")}</td>
                <td className="px-3 py-2">
                  {exchange.applicantName}
                  {exchange.companyName ? <span className="text-slate-400">（{exchange.companyName}）</span> : null}
                </td>
                <td className="px-3 py-2 break-all">{exchange.applicantEmail ?? "-"}</td>
                {showNotified ? (
                  <td className="px-3 py-2 whitespace-nowrap">{exchange.notified ? "送信済み" : "未送信"}</td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function MerchantDeleteDialog({ merchant, onClose, onDeleted }: Props) {
  const [preview, setPreview] = useState<MerchantDeletionPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [force, setForce] = useState(false);
  const [notifyApplicants, setNotifyApplicants] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DeleteMerchantResult | null>(null);

  const merchantId = merchant?.merchantId;

  useEffect(() => {
    setPreview(null);
    setConfirmName("");
    setForce(false);
    setNotifyApplicants(true);
    setError(null);
    setResult(null);

    if (!merchantId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    fetchMerchantDeletionPreview(merchantId)
      .then((data) => {
        if (!cancelled) setPreview(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "削除前の確認内容の取得に失敗しました。");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [merchantId]);

  const hasOpenExchanges = (preview?.openExchanges.length ?? 0) > 0;
  const nameConfirmed = preview ? isMerchantDeletionConfirmed(preview.merchantName, confirmName) : false;
  const canSubmit = Boolean(preview) && nameConfirmed && (!hasOpenExchanges || force) && !submitting;

  const handleSubmit = async () => {
    if (!preview || !canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const deleted = await deleteMerchant({
        merchantId: preview.merchantId,
        confirmName,
        force: hasOpenExchanges && force,
        notifyApplicants: hasOpenExchanges && force && notifyApplicants,
      });
      setResult(deleted);
      onDeleted(deleted);
    } catch (err) {
      setError(err instanceof Error ? err.message : "提携企業の削除に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={merchant !== null}
      onClose={submitting ? undefined : onClose}
      fullWidth
      maxWidth="md"
      slotProps={{ paper: { sx: { borderRadius: "20px", p: 1 } } }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <div className="text-xl font-bold text-slate-900">
          {result ? "提携企業を削除しました" : "提携企業を削除"}
        </div>
        {!result ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            削除すると提携企業の一覧から外れ、商品は非公開になり、提携企業のユーザーはログインできなくなります。
            交換履歴と過去の収支は残ります。元に戻すことはできません。
          </Typography>
        ) : null}
      </DialogTitle>

      <DialogContent sx={{ pt: "8px !important" }}>
        <Stack spacing={2.5}>
          {error ? <Alert severity="error">{error}</Alert> : null}

          {loading ? (
            <div className="flex justify-center py-6">
              <CircularProgress size={28} />
            </div>
          ) : null}

          {result ? (
            <>
              <Alert severity="success">
                「{result.merchantName}」を削除しました。
                {result.cancelledExchanges.length > 0
                  ? `対応中だった交換 ${result.cancelledExchanges.length} 件をキャンセルし、ポイントを返還しました。`
                  : null}
              </Alert>
              {result.cancelledExchanges.length > 0 ? (
                <div>
                  <p className="mb-2 text-sm text-slate-600">
                    キャンセルした交換の申請者です。お知らせが「未送信」の方には、必要に応じて個別にご連絡ください。
                  </p>
                  <ExchangeContactTable exchanges={result.cancelledExchanges} showNotified />
                </div>
              ) : null}
            </>
          ) : preview ? (
            <>
              <Alert severity="info">
                <div className="font-semibold text-slate-900">{preview.merchantName}</div>
                <div className="text-sm text-slate-600">
                  merchantId: {preview.merchantId} ／ 商品 {preview.merchandiseCount} 件（公開中{" "}
                  {preview.publishedMerchandiseCount} 件）／ ユーザー {preview.userCount} 人
                </div>
              </Alert>

              {hasOpenExchanges ? (
                <div className="space-y-2">
                  <Alert severity="warning">
                    対応中の交換が {preview.openExchanges.length} 件残っています。削除するには「強制削除」を選んでください。
                    強制削除では、これらの交換をキャンセルし、申請者にポイントを返還します。
                  </Alert>
                  <ExchangeContactTable exchanges={preview.openExchanges} />
                  <FormControlLabel
                    control={<Checkbox checked={force} onChange={(event) => setForce(event.target.checked)} />}
                    label="対応中の交換をキャンセルして強制削除する"
                  />
                  {force ? (
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={notifyApplicants}
                          onChange={(event) => setNotifyApplicants(event.target.checked)}
                        />
                      }
                      label="申請者に「キャンセルとポイント返還のお知らせ」メールを送る"
                    />
                  ) : null}
                </div>
              ) : (
                <Alert severity="success">対応中の交換はありません。</Alert>
              )}

              <TextField
                label="確認のため、提携企業名を入力してください"
                placeholder={preview.merchantName}
                value={confirmName}
                onChange={(event) => setConfirmName(event.target.value)}
                fullWidth
                autoComplete="off"
                helperText={`「${preview.merchantName}」と入力すると削除できます`}
              />
            </>
          ) : null}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
        {result ? (
          <Button variant="contained" onClick={onClose} sx={{ minWidth: 110, borderRadius: "12px" }}>
            閉じる
          </Button>
        ) : (
          <>
            <Button onClick={onClose} disabled={submitting} sx={{ minWidth: 110 }}>
              キャンセル
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={!canSubmit}
              sx={{ minWidth: 110, borderRadius: "12px", backgroundColor: "#dc2626" }}
            >
              {submitting ? "削除中..." : hasOpenExchanges ? "強制削除する" : "削除する"}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
