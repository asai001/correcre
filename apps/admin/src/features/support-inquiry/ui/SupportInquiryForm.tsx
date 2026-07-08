"use client";

import { useMemo, useState } from "react";
import { Alert, Button, MenuItem, TextField } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleCheck, faPaperPlane } from "@fortawesome/free-solid-svg-icons";

import type { SupportInquiryCategory } from "@correcre/types";

import AdminPageHeader from "@admin/components/AdminPageHeader";

import { submitSupportInquiry } from "../api/client";

type Props = {
  adminName: string;
  companyName: string;
};

type Feedback = {
  type: "success" | "error" | "warning";
  text: string;
};

const CATEGORY_OPTIONS: Array<{ value: SupportInquiryCategory; label: string }> = [
  { value: "LOGIN", label: "ログイン・招待" },
  { value: "ACCOUNT", label: "アカウント・権限" },
  { value: "DATA", label: "データ確認" },
  { value: "SYSTEM", label: "不具合・システム" },
  { value: "OTHER", label: "その他" },
];

const MAX_SUBJECT_LENGTH = 120;
const MAX_BODY_LENGTH = 4000;

export default function SupportInquiryForm({ adminName, companyName }: Props) {
  const [category, setCategory] = useState<SupportInquiryCategory>("ACCOUNT");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  const validation = useMemo(
    () => ({
      subject: subject.trim().length === 0 || subject.trim().length > MAX_SUBJECT_LENGTH,
      body: body.trim().length < 10 || body.trim().length > MAX_BODY_LENGTH,
    }),
    [body, subject],
  );
  const hasError = validation.subject || validation.body;

  const handleSubmit = async () => {
    setFeedback(null);
    setSubmittedId(null);

    if (hasError || submitting) {
      setFeedback({
        type: "error",
        text: "件名と内容を確認してください。",
      });
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitSupportInquiry({
        category,
        subject,
        body,
        currentUrl: window.location.href,
      });

      setSubject("");
      setBody("");
      setSubmittedId(result.inquiryId);
      setFeedback({
        type: result.notificationDelivered ? "success" : "warning",
        text: result.notificationDelivered
          ? "問い合わせを送信しました。"
          : "問い合わせを受け付けました。通知メールの送信に失敗したため、運用者一覧で確認されます。",
      });
    } catch (error) {
      setFeedback({
        type: "error",
        text: error instanceof Error ? error.message : "問い合わせの送信に失敗しました。",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <AdminPageHeader title="運用者に問い合わせ" adminName={adminName} subtitle={companyName} />

      {feedback ? (
        <Alert severity={feedback.type} icon={feedback.type === "success" ? <FontAwesomeIcon icon={faCircleCheck} /> : undefined}>
          {feedback.text}
          {submittedId ? <span className="ml-2 font-semibold">ID: {submittedId}</span> : null}
        </Alert>
      ) : null}

      <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
        <div className="grid gap-5 md:grid-cols-2">
          <TextField
            select
            label="カテゴリ"
            value={category}
            onChange={(event) => setCategory(event.target.value as SupportInquiryCategory)}
            disabled={submitting}
            fullWidth
          >
            {CATEGORY_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="件名"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            error={subject.length > 0 && validation.subject}
            helperText={subject.length > MAX_SUBJECT_LENGTH ? `${MAX_SUBJECT_LENGTH}文字以内で入力してください` : " "}
            disabled={submitting}
            fullWidth
            inputProps={{ maxLength: MAX_SUBJECT_LENGTH + 1 }}
          />

          <TextField
            className="md:col-span-2"
            label="内容"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            error={body.length > 0 && validation.body}
            helperText={
              body.length > MAX_BODY_LENGTH
                ? `${MAX_BODY_LENGTH}文字以内で入力してください`
                : body.length > 0 && body.trim().length < 10
                  ? "10文字以上で入力してください"
                  : " "
            }
            disabled={submitting}
            fullWidth
            multiline
            minRows={8}
            inputProps={{ maxLength: MAX_BODY_LENGTH + 1 }}
          />
        </div>

        <div className="mt-6 flex justify-end">
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={submitting || hasError}
            startIcon={<FontAwesomeIcon icon={faPaperPlane} />}
            sx={{ borderRadius: "999px", px: 3.5, py: 1.25, textTransform: "none" }}
          >
            {submitting ? "送信中..." : "送信"}
          </Button>
        </div>
      </section>
    </div>
  );
}
