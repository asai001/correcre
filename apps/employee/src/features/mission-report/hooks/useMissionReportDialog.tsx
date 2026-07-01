// apps/employee/src/features/mission-report/hooks/useMissionReportDialog.ts
"use client";

import { useEffect, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import type { FieldConfig, ImageFieldValue, Mission, SubmitPayload } from "../model/types";
import { nowYYYYMMDD, nowYYYYMMDDHHmm } from "@correcre/lib";

type Args = {
  companyId: string;
  missionId?: string;
  missionConfig: Mission;
  onSubmit: (payload: SubmitPayload) => void | Promise<void>;
  onClose: () => void;
};

type FormValue = string | string[] | ImageFieldValue;
type FormValues = Record<string, FormValue>;

const makeDraftKey = (companyId: string, missionId?: string) => (missionId ? `missionReport:${companyId}:${missionId}` : "");

function validateFieldValue(field: FieldConfig, value: FormValue | undefined): string | null {
  const isEmptyValue = value === undefined || value === "" || (Array.isArray(value) && value.length === 0);
  if (!field.required && isEmptyValue) {
    return null;
  }

  if (field.type === "text" || field.type === "textarea") {
    const text = typeof value === "string" ? value : "";

    if (field.minLength !== undefined && text.length < field.minLength) {
      return `「${field.label}」の文字数が不正です。${field.minLength}文字以上で入力してください（現在${text.length}文字）。`;
    }

    if (field.maxLength !== undefined && text.length > field.maxLength) {
      return `「${field.label}」の文字数が不正です。${field.maxLength}文字以内で入力してください（現在${text.length}文字）。`;
    }
  }

  if (field.type === "multiSelect") {
    const selectedValues = Array.isArray(value) ? value : [];

    if (field.minSelected !== undefined && selectedValues.length < field.minSelected) {
      return `「${field.label}」の選択数が不正です。${field.minSelected}個以上選択してください（現在${selectedValues.length}個）。`;
    }

    if (field.maxSelected !== undefined && selectedValues.length > field.maxSelected) {
      return `「${field.label}」の選択数が不正です。${field.maxSelected}個以内で選択してください（現在${selectedValues.length}個）。`;
    }
  }

  return null;
}

function validateFormValues(fields: FieldConfig[], values: FormValues): string | null {
  for (const field of fields) {
    const error = validateFieldValue(field, values[field.id]);
    if (error) {
      return error;
    }
  }

  return null;
}

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

export function useMissionReportDialog({ companyId, missionId, missionConfig, onSubmit }: Args) {
  // const [values, setValues] = useState<FormValues>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<ReactNode | null>(null);

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

  const setImageValue = (fieldId: string, value: ImageFieldValue | null) => {
    setValues((prev) => {
      if (value === null) {
        const { [fieldId]: _, ...rest } = prev;
        void _;
        return rest;
      }
      return { ...prev, [fieldId]: value };
    });
  };

  const setFieldValue = (fieldId: string, value: FormValue) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
  };

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

    setError(null);
    const validationError = validateFormValues(missionConfig.fields, values);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);

    try {
      const payload: SubmitPayload = {
        companyId,
        missionId: missionId ?? missionConfig.missionId,
        values,
        score: missionConfig.score,
      };
      await onSubmit(payload);

      clearAllMissionReportDrafts();
      setSuccessMessage(
        <>
          <strong>「{missionConfig.title}」</strong>
          の報告を受け付けました。ありがとうございました。
        </>
      );
      setSuccessOpen(true);
      setValues({});
    } catch (e) {
      console.error(e);
      const message = e instanceof Error ? e.message : "";
      setError(message && !message.startsWith("failed to submit mission report")
        ? message
        : "送信に失敗しました。時間をおいて再度お試しください。");
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
    setFieldValue,
    setImageValue,
    handleSubmit,
  };
}
