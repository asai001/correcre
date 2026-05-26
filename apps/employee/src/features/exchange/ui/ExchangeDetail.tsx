"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";

import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import { faArrowLeft, faCircleInfo, faPenToSquare, faShoppingCart, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { splitPostalCode } from "@correcre/lib/user-profile";
import { MerchandiseCard, type PublicMerchandiseDetail, type PublicMerchandiseSummary } from "@correcre/merchandise-public";

import { FavoriteButton } from "@employee/features/exchange-favorite";
import { updateOwnProfile } from "@employee/features/profile-edit/api/client";
import { ProfileEditDialog } from "@employee/features/profile-edit";
import type { EditableEmployeeAddress, EditableEmployeeProfile, UpdateOwnProfileInput } from "@employee/features/profile-edit";

import { requestExchange } from "../api/client";
import ExchangePageHeader from "./ExchangePageHeader";

type Props = {
  item: PublicMerchandiseDetail;
  initialPointBalance: number;
  userName: string;
  initialProfile: EditableEmployeeProfile;
  initialIsFavorite: boolean;
  relatedItems: PublicMerchandiseSummary[];
  relatedFavoriteKeys: string[];
};

function hasDeliveryAddress(address?: EditableEmployeeAddress) {
  if (!address) return false;
  return Boolean(address.postalCode?.trim() || address.prefecture?.trim() || address.city?.trim() || address.building?.trim());
}

function formatPostalCode(postalCode?: string) {
  if (!postalCode) return "";
  const { postalCodeFirstHalf, postalCodeSecondHalf } = splitPostalCode(postalCode);
  if (postalCodeFirstHalf && postalCodeSecondHalf) {
    return `〒${postalCodeFirstHalf}-${postalCodeSecondHalf}`;
  }
  return postalCode;
}

function formatPoint(value: number) {
  return `${value.toLocaleString("ja-JP")}pt`;
}

function buildDetailHref(item: PublicMerchandiseSummary): Route {
  const search = new URLSearchParams({ merchantId: item.merchantId }).toString();
  return `/exchange/${encodeURIComponent(item.merchandiseId)}?${search}` as Route;
}

function favoriteKey(merchantId: string, merchandiseId: string) {
  return `${merchantId}/${merchandiseId}`;
}

function DetailRow({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <div className="grid grid-cols-[140px_minmax(0,1fr)] border-b border-slate-200 last:border-b-0 sm:grid-cols-[180px_minmax(0,1fr)]">
      <div className="bg-slate-50 px-4 py-5 text-sm font-semibold text-slate-700">{label}</div>
      <div className="px-4 py-5 text-sm leading-6 text-slate-800">{children}</div>
    </div>
  );
}

export default function ExchangeDetail({ item, initialPointBalance, userName, initialProfile, initialIsFavorite, relatedItems, relatedFavoriteKeys }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [profile, setProfile] = useState<EditableEmployeeProfile>(initialProfile);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [favoriteKeys, setFavoriteKeys] = useState<Set<string>>(() => new Set(relatedFavoriteKeys));

  const insufficient = initialPointBalance < item.requiredPoint;
  const buttonDisabled = submitting || insufficient;
  const balanceAfter = initialPointBalance - item.requiredPoint;
  const addressPresent = hasDeliveryAddress(profile.address);
  const confirmSubmitDisabled = submitting || !addressPresent;

  const merchandiseName = item.merchandiseName || item.heading || "商品・サービス";
  const merchantName = item.merchantName || "提供会社";
  const genreLabel = item.genre === "その他" ? item.genreOther?.trim() || "その他" : item.genre;
  const areaLabel = item.serviceArea.trim() || "未設定";
  const deliveryLabel = item.deliveryMethods.length > 0 ? item.deliveryMethods.join("、") : "未設定";

  const handleOpenConfirm = () => {
    setError(null);
    setConfirmOpen(true);
  };

  const handleCloseConfirm = () => {
    if (submitting) return;
    setConfirmOpen(false);
  };

  const handleConfirm = async () => {
    setError(null);
    setSubmitting(true);

    try {
      await requestExchange({
        merchantId: item.merchantId,
        merchandiseId: item.merchandiseId,
      });
      router.push("/exchange?notice=exchange-requested" as Route);
    } catch (err) {
      setError(err instanceof Error ? err.message : "交換申請に失敗しました");
      setSubmitting(false);
      setConfirmOpen(false);
    }
  };

  const handleOpenProfileDialog = () => {
    setProfileError(null);
    setProfileDialogOpen(true);
  };

  const handleCloseProfileDialog = () => {
    if (profileSubmitting) return;
    setProfileDialogOpen(false);
    setProfileError(null);
  };

  const handleUpdateProfile = async (input: UpdateOwnProfileInput) => {
    setProfileSubmitting(true);
    setProfileError(null);

    try {
      const updated = await updateOwnProfile(input);
      setProfile(updated);
      setProfileDialogOpen(false);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "登録情報の更新に失敗しました");
    } finally {
      setProfileSubmitting(false);
    }
  };

  const handleFavoriteToggle = (merchantId: string, merchandiseId: string) => (next: boolean) => {
    setFavoriteKeys((prev) => {
      const updated = new Set(prev);
      const key = favoriteKey(merchantId, merchandiseId);
      if (next) updated.add(key);
      else updated.delete(key);
      return updated;
    });
  };

  return (
    <div className="-mt-px pb-12">
      <ExchangePageHeader currentPointBalance={initialPointBalance} userName={userName} />

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

        <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,5.5fr)_minmax(0,4.5fr)]">
          <div className="lg:sticky lg:top-6 lg:self-start">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex w-full items-center justify-center overflow-hidden rounded-xl bg-slate-50">
                {item.detailImageViewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.detailImageViewUrl} alt={merchandiseName} className="h-auto w-full object-contain" />
                ) : (
                  <div className="flex aspect-[4/3] w-full items-center justify-center px-6 text-center text-sm text-slate-400">
                    登録された商品画像がここに表示されます。
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
              <div className="flex flex-wrap items-center gap-2">
                {item.tags?.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800"
                  >
                    {tag}
                  </span>
                ))}
                <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {genreLabel}
                </span>
              </div>

              <div>
                <h2 className="text-2xl font-bold leading-snug text-slate-900 sm:text-[1.75rem]">{merchandiseName}</h2>
                <p className="mt-2 text-sm text-slate-500">{merchantName}</p>
              </div>

              <div className="flex items-baseline gap-2 border-y border-slate-200 py-4 text-amber-600">
                <FontAwesomeIcon icon={faShoppingCart} className="text-xl" />
                <span className="text-3xl font-bold tracking-tight sm:text-4xl">
                  {item.requiredPoint > 0 ? new Intl.NumberFormat("ja-JP").format(item.requiredPoint) : "—"}
                </span>
                <span className="text-base font-semibold">pt</span>
              </div>

              {item.serviceDescription ? (
                <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm leading-7 text-slate-700">
                  <p className="whitespace-pre-line">{item.serviceDescription}</p>
                </div>
              ) : null}

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleOpenConfirm}
                  disabled={buttonDisabled}
                  className="flex-1 rounded-lg bg-slate-900 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {submitting ? "申請中…" : "ポイントで交換する"}
                </button>
                <FavoriteButton
                  merchantId={item.merchantId}
                  merchandiseId={item.merchandiseId}
                  isFavorite={initialIsFavorite}
                  variant="detail"
                />
              </div>

              {insufficient ? (
                <div className="text-sm font-semibold text-red-600">
                  ポイント残高が不足しています（不足 {formatPoint(item.requiredPoint - initialPointBalance)}）。
                </div>
              ) : null}

              {error ? <Alert severity="error">{error}</Alert> : null}
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <header className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
                <FontAwesomeIcon icon={faCircleInfo} className="text-slate-500" />
                <h3 className="text-base font-bold text-slate-900">商品詳細情報</h3>
              </header>

              <div>
                {item.productCode ? <DetailRow label="商品コード">{item.productCode}</DetailRow> : null}
                <DetailRow label="必要ポイント数">{formatPoint(item.requiredPoint)}</DetailRow>
                <DetailRow label="対応エリア">{areaLabel}</DetailRow>
                <DetailRow label="提供タイプ">{deliveryLabel}</DetailRow>
                <DetailRow label="ジャンル">{genreLabel}</DetailRow>
                {item.contentVolume ? <DetailRow label="内容量">{item.contentVolume}</DetailRow> : null}
                {item.expiration ? <DetailRow label="賞味期限">{item.expiration}</DetailRow> : null}
                {item.deliverySchedule ? <DetailRow label="お届け予定">{item.deliverySchedule}</DetailRow> : null}
                {item.notes ? (
                  <DetailRow label="注意事項">
                    <p className="whitespace-pre-line">{item.notes}</p>
                  </DetailRow>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <Dialog
          open={confirmOpen}
          onClose={handleCloseConfirm}
          maxWidth="sm"
          fullWidth
          slotProps={{ paper: { sx: { borderRadius: "16px" } } }}
        >
          <DialogTitle sx={{ fontWeight: "bold" }}>交換申請の確認</DialogTitle>
          <DialogContent dividers>
            <p className="text-sm text-slate-600">以下の内容で交換を申請します。よろしいですか？</p>
            <div className="mt-4 space-y-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-slate-500">商品・サービス</span>
                <span className="text-right font-semibold text-slate-900">{merchandiseName}</span>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-slate-500">必要ポイント</span>
                <span className="font-semibold text-amber-600">{formatPoint(item.requiredPoint)}</span>
              </div>
              <div className="flex items-baseline justify-between gap-3 border-t border-slate-200 pt-3">
                <span className="text-slate-500">申請後の残高</span>
                <span className="font-semibold text-slate-900">{formatPoint(balanceAfter)}</span>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-slate-200 px-4 py-4 text-sm">
              <div className="flex items-start justify-between gap-3">
                <span className="font-semibold text-slate-700">お届け先</span>
                <button
                  type="button"
                  onClick={handleOpenProfileDialog}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <FontAwesomeIcon icon={faPenToSquare} className="text-[11px]" />
                  {addressPresent ? "編集" : "登録"}
                </button>
              </div>

              {addressPresent ? (
                <div className="mt-3 space-y-1 text-slate-900">
                  {profile.address?.postalCode ? (
                    <div className="text-xs text-slate-500">{formatPostalCode(profile.address.postalCode)}</div>
                  ) : null}
                  <div>
                    {profile.address?.prefecture ?? ""}
                    {profile.address?.city ?? ""}
                  </div>
                  {profile.address?.building ? <div>{profile.address.building}</div> : null}
                </div>
              ) : (
                <div className="mt-3 flex items-start gap-2 rounded-md bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                  <FontAwesomeIcon icon={faTriangleExclamation} className="mt-[2px]" />
                  <span>お届け先が未登録です。「登録」ボタンから入力してから申請してください。</span>
                </div>
              )}
            </div>

            {error ? (
              <div className="mt-3">
                <Alert severity="error">{error}</Alert>
              </div>
            ) : null}
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={handleCloseConfirm} disabled={submitting} color="inherit">
              キャンセル
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={confirmSubmitDisabled}
              variant="contained"
              sx={{
                backgroundColor: "#0f172a",
                "&:hover": { backgroundColor: "#1e293b" },
              }}
            >
              {submitting ? "申請中…" : "申請する"}
            </Button>
          </DialogActions>
        </Dialog>

        <ProfileEditDialog
          open={profileDialogOpen}
          profile={profile}
          submitting={profileSubmitting}
          error={profileError}
          onClose={handleCloseProfileDialog}
          onSubmit={handleUpdateProfile}
        />

        {relatedItems.length > 0 ? (
          <section className="mt-25">
            <header className="mb-6">
              <h3 className="border-l-4 border-slate-900 pl-3 text-2xl font-bold text-slate-900">その他の商品一覧</h3>
            </header>

            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {relatedItems.map((related) => {
                const key = favoriteKey(related.merchantId, related.merchandiseId);
                const isFavorite = favoriteKeys.has(key);
                return (
                  <li key={key} className="h-full">
                    <Link href={buildDetailHref(related)} className="group block h-full">
                      <MerchandiseCard
                        item={related}
                        favoriteSlot={
                          <FavoriteButton
                            merchantId={related.merchantId}
                            merchandiseId={related.merchandiseId}
                            isFavorite={isFavorite}
                            onToggle={handleFavoriteToggle(related.merchantId, related.merchandiseId)}
                          />
                        }
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}
