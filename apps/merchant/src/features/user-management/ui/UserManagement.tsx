"use client";

import { useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  FormControlLabel,
  TextField,
} from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPaperPlane, faUsers } from "@fortawesome/free-solid-svg-icons";

import AdminPageHeader from "@merchant/components/AdminPageHeader";
import { inviteMerchantUser } from "../api/client";
import type { MerchantUserRow } from "../model/types";

type Props = {
  initialUsers: MerchantUserRow[];
  merchantUserName: string;
  merchantDisplayName: string;
};

type InviteFormState = {
  lastName: string;
  firstName: string;
  lastNameKana: string;
  firstNameKana: string;
  email: string;
  phoneNumber: string;
  isAdmin: boolean;
};

function createInitialInviteFormState(): InviteFormState {
  return {
    lastName: "",
    firstName: "",
    lastNameKana: "",
    firstNameKana: "",
    email: "",
    phoneNumber: "",
    isAdmin: false,
  };
}

const STATUS_LABELS: Record<MerchantUserRow["status"], string> = {
  PENDING: "申請中",
  INVITED: "招待中",
  ACTIVE: "ログイン済み",
  INACTIVE: "休止中",
  DELETED: "削除済み",
};

export default function UserManagement({ initialUsers, merchantUserName, merchantDisplayName }: Props) {
  const [users, setUsers] = useState(initialUsers);
  const [form, setForm] = useState<InviteFormState>(() => createInitialInviteFormState());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleChange = (field: keyof Omit<InviteFormState, "isAdmin">) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (submitting) return;

    setSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      const created = await inviteMerchantUser({
        lastName: form.lastName,
        firstName: form.firstName,
        lastNameKana: form.lastNameKana || undefined,
        firstNameKana: form.firstNameKana || undefined,
        email: form.email,
        phoneNumber: form.phoneNumber || undefined,
        isAdmin: form.isAdmin,
      });

      setUsers((current) => [...current.filter((user) => user.userId !== created.userId), created]);
      setForm(createInitialInviteFormState());
      setNotice(`${created.lastName} ${created.firstName} さんへ招待メールを送信しました。`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ユーザーの招待に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <AdminPageHeader
        title="ユーザー管理"
        adminName={merchantUserName}
        merchantDisplayName={merchantDisplayName}
        subtitle="自社のログインユーザーを招待・管理します"
      />

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

        <div className="mt-4">
          <FormControlLabel
            control={
              <Checkbox
                checked={form.isAdmin}
                onChange={(event) => setForm((prev) => ({ ...prev, isAdmin: event.target.checked }))}
              />
            }
            label="管理者として招待する（この画面でユーザーを追加できるようになります）"
          />
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
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      user.isAdmin ? "bg-cyan-100 text-cyan-800" : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {user.isAdmin ? "管理者" : "一般"}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {STATUS_LABELS[user.status]}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
