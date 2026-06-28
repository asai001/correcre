"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";

import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import { faArrowLeft, faPenToSquare, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { hasCompleteExchangeRequestProfile, splitPostalCode } from "@correcre/lib/user-profile";
import {
  MerchandiseCard,
  MerchandiseDetailView,
  type PublicMerchandiseDetail,
  type PublicMerchandiseSummary,
} from "@correcre/merchandise-public";

import { FavoriteButton } from "@employee/features/exchange-favorite";
import { updateOwnProfile } from "@employee/features/profile-edit/api/client";
import { ProfileEditDialog } from "@employee/features/profile-edit";
import type { EditableEmployeeProfile, UpdateOwnProfileInput } from "@employee/features/profile-edit";

import { requestExchange } from "../api/client";
import ExchangePageHeader from "./ExchangePageHeader";

type Props = {
  item: PublicMerchandiseDetail;
  initialPointBalance: number;
  pendingPointBalance?: number;
  userName: string;
  initialProfile: EditableEmployeeProfile;
  initialIsFavorite: boolean;
  relatedItems: PublicMerchandiseSummary[];
  relatedFavoriteKeys: string[];
};

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

export default function ExchangeDetail({ item, initialPointBalance, pendingPointBalance, userName, initialProfile, initialIsFavorite, relatedItems, relatedFavoriteKeys }: Props) {
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
  const profileReadyForExchange = hasCompleteExchangeRequestProfile({
    phoneNumber: profile.phoneNumber,
    address: profile.address,
  });
  const hasAnyProfileInput = Boolean(
    profile.phoneNumber?.trim()
      || profile.address?.postalCode?.trim()
      || profile.address?.prefecture?.trim()
      || profile.address?.city?.trim()
      || profile.address?.street?.trim()
      || profile.address?.building?.trim(),
  );
  const confirmSubmitDisabled = submitting || !profileReadyForExchange;

  const merchandiseName = item.merchandiseName || item.heading || "商品・サービス";

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
      setError(err instanceof Error ? err.message : "申請処理に失敗しました");
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
      <ExchangePageHeader
        currentPointBalance={initialPointBalance}
        pendingPointBalance={pendingPointBalance}
        userName={userName}
      />

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
          <MerchandiseDetailView
            item={item}
            actionSlot={
              <>
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
              </>
            }
          />
        </div>

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
                <span className="font-semibold text-slate-700">お届け先・連絡先</span>
                <button
                  type="button"
                  onClick={handleOpenProfileDialog}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <FontAwesomeIcon icon={faPenToSquare} className="text-[11px]" />
                  {hasAnyProfileInput ? "編集" : "登録"}
                </button>
              </div>

              {profileReadyForExchange ? (
                <div className="mt-3 space-y-1 text-slate-900">
                  {profile.address?.postalCode ? (
                    <div className="text-xs text-slate-500">{formatPostalCode(profile.address.postalCode)}</div>
                  ) : null}
                  <div>
                    {profile.address?.prefecture ?? ""}
                    {profile.address?.city ?? ""}
                    {profile.address?.street ?? ""}
                  </div>
                  {profile.address?.building ? <div>{profile.address.building}</div> : null}
                  {profile.phoneNumber ? <div>{profile.phoneNumber}</div> : null}
                </div>
              ) : (
                <div className="mt-3 flex items-start gap-2 rounded-md bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                  <FontAwesomeIcon icon={faTriangleExclamation} className="mt-[2px]" />
                  <span>郵便番号・都道府県・市区町村・丁目/番地・電話番号を登録してから申請してください。</span>
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
          requireDeliveryAddress
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
