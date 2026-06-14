"use client";

import Link from "next/link";
import { useState } from "react";
import { Alert, Button, TextField, Tooltip } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faPaperPlane, faUsers } from "@fortawesome/free-solid-svg-icons";

import AdminPageHeader from "@operator/components/AdminPageHeader";
import {
  inviteMerchantUser,
  resetMerchantUserEmail,
  resetMerchantUserPassword,
} from "../api/client";
import type { MerchantSummary, MerchantUserSummary } from "../model/types";
import ResetMerchantUserEmailDialog from "./ResetMerchantUserEmailDialog";
import ResetMerchantUserPasswordDialog from "./ResetMerchantUserPasswordDialog";

type Props = {
  merchant: MerchantSummary;
  initialUsers: MerchantUserSummary[];
  operatorName: string;
};

type InviteFormState = {
  lastName: string;
  firstName: string;
  lastNameKana: string;
  firstNameKana: string;
  email: string;
  phoneNumber: string;
};

function createInitialInviteFormState(): InviteFormState {
  return {
    lastName: "",
    firstName: "",
    lastNameKana: "",
    firstNameKana: "",
    email: "",
    phoneNumber: "",
  };
}

const STATUS_LABELS: Record<MerchantUserSummary["status"], string> = {
  PENDING: "申請中",
  INVITED: "招待中",
  ACTIVE: "ログイン済み",
  INACTIVE: "休止中",
  DELETED: "削除済み",
};

export default function MerchantUserManagement({ merchant, initialUsers, operatorName }: Props) {
  const [users, setUsers] = useState(initialUsers);
  const [form, setForm] = useState<InviteFormState>(() => createInitialInviteFormState());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [emailDialogUser, setEmailDialogUser] = useState<MerchantUserSummary | null>(null);
  const [emailDialogSubmitting, setEmailDialogSubmitting] = useState(false);
  const [emailDialogError, setEmailDialogError] = useState<string | null>(null);

  const [passwordDialogUser, setPasswordDialogUser] = useState<MerchantUserSummary | null>(null);
  const [passwordDialogSubmitting, setPasswordDialogSubmitting] = useState(false);
  const [passwordDialogError, setPasswordDialogError] = useState<string | null>(null);

  const handleChange = (field: keyof InviteFormState) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const created = await inviteMerchantUser({
        merchantId: merchant.merchantId,
        lastName: form.lastName,
        firstName: form.firstName,
        lastNameKana: form.lastNameKana || undefined,
        firstNameKana: form.firstNameKana || undefined,
        email: form.email,
        phoneNumber: form.phoneNumber || undefined,
      });

      setUsers((current) => [created, ...current.filter((user) => user.userId !== created.userId)]);
      setForm(createInitialInviteFormState());
      setNotice(`${created.lastName} ${created.firstName} さんへ招待メールを送信しました。`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "提携企業ユーザーの招待に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEmailDialog = (user: MerchantUserSummary) => {
    setEmailDialogUser(user);
    setEmailDialogError(null);
  };

  const handleCloseEmailDialog = () => {
    if (emailDialogSubmitting) return;
    setEmailDialogUser(null);
    setEmailDialogError(null);
  };

  const handleSubmitEmailDialog = async (newEmail: string) => {
    if (!emailDialogUser) return;

    setEmailDialogSubmitting(true);
    setEmailDialogError(null);

    try {
      const updated = await resetMerchantUserEmail({
        merchantId: emailDialogUser.merchantId,
        userId: emailDialogUser.userId,
        newEmail,
      });

      setUsers((current) =>
        current.map((user) => (user.userId === updated.userId ? updated : user)),
      );
      setEmailDialogUser(null);
      setNotice(
        `${updated.lastName} ${updated.firstName} さんのメールアドレスを ${updated.email} にリセットしました。`,
      );
    } catch (err) {
      setEmailDialogError(err instanceof Error ? err.message : "メールアドレスのリセットに失敗しました。");
    } finally {
      setEmailDialogSubmitting(false);
    }
  };

  const handleOpenPasswordDialog = (user: MerchantUserSummary) => {
    setPasswordDialogUser(user);
    setPasswordDialogError(null);
  };

  const handleClosePasswordDialog = () => {
    if (passwordDialogSubmitting) return;
    setPasswordDialogUser(null);
    setPasswordDialogError(null);
  };

  const handleSubmitPasswordDialog = async () => {
    if (!passwordDialogUser) return;

    setPasswordDialogSubmitting(true);
    setPasswordDialogError(null);

    try {
      await resetMerchantUserPassword({
        merchantId: passwordDialogUser.merchantId,
        userId: passwordDialogUser.userId,
      });

      setNotice(
        `${passwordDialogUser.lastName} ${passwordDialogUser.firstName} さんのパスワードをリセットしました。`,
      );
      setPasswordDialogUser(null);
    } catch (err) {
      setPasswordDialogError(err instanceof Error ? err.message : "パスワードリセットに失敗しました。");
    } finally {
      setPasswordDialogSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <AdminPageHeader
        title={`${merchant.name} のユーザー招待`}
        adminName={operatorName}
        subtitle="提携企業のログインユーザーを招待・管理します"
        backHref="/merchants"
      />

      <div>
        <Link href="/merchants" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900">
          <FontAwesomeIcon icon={faArrowLeft} />
          提携企業一覧へ戻る
        </Link>
      </div>

      <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
        <div className="flex items-center gap-3">
          <FontAwesomeIcon icon={faPaperPlane} className="text-cyan-600" />
          <h2 className="text-xl font-bold text-slate-900">ユーザーを招待</h2>
        </div>
        <p className="mt-2 text-sm text-slate-500">
          招待されたユーザーには仮パスワード付きのメールが届きます。初回ログインで新しいパスワードを設定してもらいます。
        </p>

        {error ? (
          <Alert severity="error" className="!mt-4">
            {error}
          </Alert>
        ) : null}
        {notice ? (
          <Alert severity="success" className="!mt-4">
            {notice}
          </Alert>
        ) : null}

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <TextField label="姓" required fullWidth value={form.lastName} onChange={handleChange("lastName")} />
          <TextField label="名" required fullWidth value={form.firstName} onChange={handleChange("firstName")} />
          <TextField label="姓（カナ）" fullWidth value={form.lastNameKana} onChange={handleChange("lastNameKana")} />
          <TextField label="名（カナ）" fullWidth value={form.firstNameKana} onChange={handleChange("firstNameKana")} />
          <TextField label="メールアドレス" type="email" required fullWidth value={form.email} onChange={handleChange("email")} />
          <TextField label="電話番号" fullWidth value={form.phoneNumber} onChange={handleChange("phoneNumber")} />
        </div>

        <div className="mt-6 flex justify-end">
          <Button variant="contained" onClick={handleSubmit} disabled={submitting} className="!rounded-full !px-7 !py-2.5">
            {submitting ? "送信中..." : "招待メールを送信"}
          </Button>
        </div>
      </section>

      <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
        <div className="flex items-center gap-3">
          <FontAwesomeIcon icon={faUsers} className="text-emerald-600" />
          <h2 className="text-xl font-bold text-slate-900">登録済みのユーザー</h2>
        </div>

        {users.length === 0 ? (
          <p className="mt-6 text-sm text-slate-500">まだユーザーは登録されていません。</p>
        ) : (
          <ul className="mt-5 divide-y divide-slate-200">
            {users.map((user) => (
              <li key={user.userId} className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div>
                  <div className="text-base font-semibold text-slate-900">
                    {user.lastName} {user.firstName}
                  </div>
                  <div className="text-xs text-slate-500">
                    {user.email}
                    {user.phoneNumber ? ` ／ ${user.phoneNumber}` : null}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {STATUS_LABELS[user.status]}
                  </span>
                  {user.status !== "DELETED" ? (
                    <>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleOpenEmailDialog(user)}
                        sx={{ borderRadius: "999px", textTransform: "none" }}
                      >
                        メアドリセット
                      </Button>
                      {/* パスワードリセットは意図的に無効化している。
                          disabled なボタンは hover を拾わないため span でラップして Tooltip を出す。 */}
                      <Tooltip title="意図的に機能を殺しています">
                        <span>
                          <Button
                            size="small"
                            variant="outlined"
                            disabled
                            onClick={() => handleOpenPasswordDialog(user)}
                            sx={{ borderRadius: "999px", textTransform: "none" }}
                          >
                            パスワードリセット
                          </Button>
                        </span>
                      </Tooltip>
                    </>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ResetMerchantUserEmailDialog
        open={emailDialogUser !== null}
        user={emailDialogUser}
        submitting={emailDialogSubmitting}
        error={emailDialogError}
        onClose={handleCloseEmailDialog}
        onSubmit={handleSubmitEmailDialog}
      />

      <ResetMerchantUserPasswordDialog
        open={passwordDialogUser !== null}
        user={passwordDialogUser}
        submitting={passwordDialogSubmitting}
        error={passwordDialogError}
        onClose={handleClosePasswordDialog}
        onSubmit={handleSubmitPasswordDialog}
      />
    </div>
  );
}
