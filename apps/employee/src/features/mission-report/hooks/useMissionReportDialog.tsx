// apps/employee/src/features/mission-report/hooks/useMissionReportDialog.ts
"use client";

import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import type { FieldConfig, Mission, SubmitPayload } from "../model/types";
import { nowYYYYMMDD, nowYYYYMMDDHHmm } from "@correcre/lib";

type Args = {
  companyId: string;
  missionId?: string;
  missionConfig: Mission;
  onSubmit: (payload: SubmitPayload) => void | Promise<void>;
  onClose: () => void;
};

type FormValues = Record<string, string>;

const makeDraftKey = (companyId: string, missionId?: string) => (missionId ? `missionReport:${companyId}:${missionId}` : "");

/* ----------------------------------------------------------------
 *  下書き（localStorage）を本機能分まとめて削除
 *  - キー命名: missionReport:${companyId}:${missionId}
 *  - 送信成功時に全ダイアログ分のドラフトを掃除したい要件に対応
 * ---------------------------------------------------------------- */
const clearAllMissionReportDrafts = () => {
  const prefix = "missionReport:";
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(prefix)) {
      keys.push(k);
    }
  }
  keys.forEach((k) => localStorage.removeItem(k));
};

export function useMissionReportDialog({ companyId, missionId, missionConfig, onSubmit, onClose }: Args) {
  // const [values, setValues] = useState<FormValues>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const draftKey = makeDraftKey(companyId, missionId);

  const [values, setValues] = useState<FormValues>(() => {
    let base: FormValues = {};

    // ① まず localStorage から下書きがあれば読む
    if (typeof window !== "undefined" && draftKey) {
      try {
        const raw = window.localStorage.getItem(draftKey);
        if (raw) {
          const parsed = JSON.parse(raw) as FormValues;
          if (parsed && typeof parsed === "object") {
            base = parsed;
          }
        }
      } catch (e) {
        console.error("failed to load mission report draft", e);
      }
    }

    // ② date / datetime-local だけ、値がなければ現在時刻を入れる
    for (const field of missionConfig.fields) {
      const v = base[field.id];

      if (field.type === "date") {
        if (v == null || v === "") {
          base[field.id] = nowYYYYMMDD();
        }
      } else if (field.type === "datetime-local") {
        if (v == null || v === "") {
          base[field.id] = nowYYYYMMDDHHmm();
        }
      }
      // それ以外の type は何もしない（空のまま）
    }

    return base;
  });

  useEffect(() => {
    if (!draftKey) {
      return;
    }
    if (typeof window === "undefined") {
      return;
    }
    try {
      window.localStorage.setItem(draftKey, JSON.stringify(values));
    } catch (e) {
      console.error("failed to save mission report draft", e);
    }
  }, [draftKey, values]);

  const handleChange = (field: FieldConfig) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const v = e.target.value;
    setValues((prev) => ({ ...prev, [field.id]: v }));
  };

  // const toSelectInputValue = (valueType: FieldConfig["selectValueType"] | undefined, v: string) => {
  //   if (v === "" || v === undefined || v === null) {
  //     return "";
  //   }
  //   if (valueType === "number") {
  //     const n = Number(v);
  //     return Number.isNaN(n) ? "" : n;
  //   }
  //   return v;
  // };

  const handleSubmit = async () => {
    if (submitting) {
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const payload: SubmitPayload = {
        companyId,
        missionId: missionId ?? missionConfig.missionId,
        values,
        score: missionConfig.score,
      };
      await onSubmit(payload);

      clearAllMissionReportDrafts();
      setSuccessMessage(`「${missionConfig.title}」の報告を受け付けました。ありがとうございました。`);
      setSuccessOpen(true);
      setValues({});
      onClose();
    } catch (e) {
      console.error(e);
      setError("送信に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setSubmitting(false);
    }
  };

  return {
    values,
    submitting,
    error,
    successOpen,
    successMessage,
    setSuccessOpen,
    handleChange,
    handleSubmit,
  };
}
