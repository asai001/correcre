"use client";

import { useState } from "react";
import {
  Alert,
  Button,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  TextField,
} from "@mui/material";

import { submitSeminarRegistration } from "../api/client";
import type { SeminarPageInfo, SubmitSeminarRegistrationResult } from "../model/types";

type Props = {
  seminar: SeminarPageInfo;
};

type FormState = {
  name: string;
  companyName: string;
  email: string;
  sessionId: string;
  phoneNumber: string;
  attendeeCount: string;
  question: string;
  website: string;
};

function createInitialFormState(): FormState {
  return {
    name: "",
    companyName: "",
    email: "",
    // 未選択で始めて、どちらの回に参加するかを必ず申込者に選んでもらう。
    sessionId: "",
    phoneNumber: "",
    attendeeCount: "1",
    question: "",
    website: "",
  };
}

function ZoomInfo({ result }: { result: SubmitSeminarRegistrationResult }) {
  // 申込者が選んだ回を優先して案内する。開催回の設定がない運用に備えて共通の開催日時にも落とせるようにする。
  const scheduleText = result.sessionLabel ?? result.scheduleText;

  return (
    <dl className="mt-4 space-y-3 rounded border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
      {scheduleText ? (
        <div>
          <dt className="font-semibold text-slate-900">開催日時</dt>
          <dd className="mt-1">{scheduleText}</dd>
        </div>
      ) : null}
      <div>
        <dt className="font-semibold text-slate-900">参加用 Zoom URL</dt>
        <dd className="mt-1 break-all">
          <a
            href={result.zoom.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-blue-700 underline-offset-2 hover:underline"
          >
            {result.zoom.url}
          </a>
        </dd>
      </div>
      {result.zoom.meetingId ? (
        <div>
          <dt className="font-semibold text-slate-900">ミーティングID</dt>
          <dd className="mt-1">{result.zoom.meetingId}</dd>
        </div>
      ) : null}
      {result.zoom.passcode ? (
        <div>
          <dt className="font-semibold text-slate-900">パスコード</dt>
          <dd className="mt-1">{result.zoom.passcode}</dd>
        </div>
      ) : null}
    </dl>
  );
}

export default function SeminarRegistrationForm({ seminar }: Props) {
  const [form, setForm] = useState<FormState>(() => createInitialFormState());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitSeminarRegistrationResult | null>(null);

  const handleChange =
    (field: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setForm((prev) => ({ ...prev, [field]: value }));
    };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (submitting) return;

    if (!form.sessionId) {
      setError("参加を希望する回を選択してください。");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const submitted = await submitSeminarRegistration({
        name: form.name,
        companyName: form.companyName,
        email: form.email,
        sessionId: form.sessionId,
        phoneNumber: form.phoneNumber || undefined,
        attendeeCount: Number(form.attendeeCount) || undefined,
        question: form.question || undefined,
        website: form.website || undefined,
      });

      setResult(submitted);
    } catch (err) {
      setError(err instanceof Error ? err.message : "お申し込みの送信に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <div className="w-full rounded bg-white p-8">
        <h1 className="text-2xl font-bold text-slate-900">お申し込みを受け付けました</h1>
        <p className="mt-4 text-sm text-neutral-700">
          {result.emailDelivered
            ? "ご入力いただいたメールアドレス宛に、Zoom の参加情報をお送りしました。当日はこちらからご参加ください。"
            : "確認メールの送信に失敗しました。お手数ですが、以下の Zoom 参加情報を控えてください。担当者からも改めてご連絡します。"}
        </p>

        <ZoomInfo result={result} />

        <p className="mt-4 text-xs text-neutral-500">
          メールが届かない場合は、迷惑メールフォルダをご確認ください。
        </p>
      </div>
    );
  }

  if (!seminar.configured) {
    return (
      <div className="w-full rounded bg-white p-8">
        <h1 className="text-2xl font-bold text-slate-900">{seminar.title}</h1>
        <p className="mt-4 text-sm text-neutral-700">
          ただいまお申し込みの受付を準備中です。しばらくお待ちください。
        </p>
      </div>
    );
  }

  return (
    <div className="w-full rounded bg-white p-8">
      <h1 className="text-2xl font-bold text-slate-900">{seminar.title}</h1>
      <p className="mt-2 text-sm text-neutral-600">
        お申し込みいただくと、ご入力のメールアドレス宛に Zoom の参加情報を自動でお送りします。
      </p>
      {seminar.scheduleText ? (
        <p className="mt-3 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800">
          開催日時: {seminar.scheduleText}
        </p>
      ) : null}

      {error ? (
        <Alert severity="error" sx={{ mt: 3 }}>
          {error}
        </Alert>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        <div className="flex flex-col gap-6">
          {seminar.sessions.length > 0 ? (
            <FormControl required>
              <FormLabel id="seminar-session-label">参加を希望する回</FormLabel>
              <RadioGroup
                aria-labelledby="seminar-session-label"
                name="sessionId"
                value={form.sessionId}
                onChange={handleChange("sessionId")}
              >
                {seminar.sessions.map((session) => (
                  <FormControlLabel
                    key={session.id}
                    value={session.id}
                    // 必須は input 側に付ける。Radio の required は選択肢ごとに必須マークを並べてしまうため。
                    control={<Radio slotProps={{ input: { required: true } }} />}
                    label={session.label}
                  />
                ))}
              </RadioGroup>
            </FormControl>
          ) : null}
          <TextField
            label="お名前"
            required
            fullWidth
            value={form.name}
            onChange={handleChange("name")}
            slotProps={{ htmlInput: { maxLength: 50 } }}
          />
          <TextField
            label="会社名（店舗名）"
            required
            fullWidth
            value={form.companyName}
            onChange={handleChange("companyName")}
            slotProps={{ htmlInput: { maxLength: 100 } }}
          />
          <TextField
            label="メールアドレス"
            type="email"
            required
            fullWidth
            value={form.email}
            onChange={handleChange("email")}
            helperText="このメールアドレス宛に Zoom の参加情報をお送りします"
          />
          <TextField
            label="電話番号（任意）"
            fullWidth
            value={form.phoneNumber}
            onChange={handleChange("phoneNumber")}
            slotProps={{ htmlInput: { maxLength: 30 } }}
          />
          <TextField
            label="参加人数（任意）"
            type="number"
            fullWidth
            value={form.attendeeCount}
            onChange={handleChange("attendeeCount")}
            slotProps={{ htmlInput: { min: 1, max: 99, step: 1 } }}
          />
          <TextField
            label="事前に聞きたいこと（任意）"
            fullWidth
            multiline
            minRows={4}
            value={form.question}
            onChange={handleChange("question")}
            slotProps={{ htmlInput: { maxLength: 1000 } }}
          />
        </div>

        {/* ハニーポット: 自動入力する bot をふるい落とすための、利用者には見えない項目 */}
        <div className="hidden" aria-hidden="true">
          <label>
            Website
            <input
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={form.website}
              onChange={handleChange("website")}
            />
          </label>
        </div>

        <Button type="submit" variant="contained" color="primary" fullWidth disabled={submitting} sx={{ py: 1.5 }}>
          {submitting ? "送信中..." : "説明会に申し込む"}
        </Button>
        <p className="text-xs leading-5 text-neutral-500">
          ご入力いただいた情報は、本説明会のご案内とコレクレに関するご連絡のみに利用します。
        </p>
      </form>
    </div>
  );
}
