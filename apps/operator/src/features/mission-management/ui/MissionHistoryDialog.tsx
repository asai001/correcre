"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
} from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";

import { fetchMissionHistory } from "../api/client";
import type { OperatorMissionHistoryItem, OperatorMissionSummary } from "../model/types";

type MissionHistoryDialogProps = {
  open: boolean;
  companyId: string;
  mission: OperatorMissionSummary;
  onClose: () => void;
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MissionHistoryDialog({
  open,
  companyId,
  mission,
  onClose,
}: MissionHistoryDialogProps) {
  const [history, setHistory] = useState<OperatorMissionHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchMissionHistory(companyId, mission.slotIndex);

        if (!cancelled) {
          setHistory(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "履歴の取得に失敗しました。");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [open, companyId, mission.slotIndex]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: "24px" } }}
    >
      <DialogTitle sx={{ fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span>編集履歴 — {mission.title}（スロット {mission.slotIndex}）</span>
        <IconButton onClick={onClose} size="small">
          <FontAwesomeIcon icon={faXmark} />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        ) : null}

        {loading ? (
          <div className="flex min-h-[200px] items-center justify-center text-slate-500">
            読み込み中...
          </div>
        ) : history.length === 0 ? (
          <div className="text-center text-sm text-slate-500 py-8">
            履歴がありません。
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((item) => (
              <div
                key={item.version}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Chip
                      label={`v${item.version}`}
                      size="small"
                      color={item.validTo === null ? "primary" : "default"}
                    />
                    {item.validTo === null ? (
                      <span className="text-xs font-semibold text-green-600">現行版</span>
                    ) : null}
                  </div>
                  <span className="text-xs text-slate-400">
                    変更者: {item.changedByUserId}
                  </span>
                </div>

                <h4 className="mt-2 text-base font-bold text-slate-900">{item.title}</h4>
                <p className="mt-1 text-sm text-slate-600">{item.description}</p>

                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                  <span className="rounded-full bg-white px-3 py-1 text-slate-600">
                    {item.category}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 text-slate-600">
                    月 {item.monthlyCount} 回
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 text-slate-600">
                    {item.score} pt
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 text-slate-600">
                    {item.fields.length} フィールド
                  </span>
                </div>

                <div className="mt-3 grid gap-2 text-xs text-slate-500 md:grid-cols-2">
                  <div>有効開始: {formatDateTime(item.validFrom)}</div>
                  <div>
                    有効終了: {item.validTo ? formatDateTime(item.validTo) : "—（現在有効）"}
                  </div>
                </div>

                {item.fields.length > 0 ? (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs font-semibold text-slate-500 hover:text-slate-700">
                      フィールド詳細を表示
                    </summary>
                    <div className="mt-2 space-y-2">
                      {item.fields
                        .sort((a, b) => a.order - b.order)
                        .map((field) => (
                          <div
                            key={field.key}
                            className="rounded-xl border border-slate-100 bg-white p-3 text-sm"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-slate-400">{field.key}</span>
                              <span className="font-semibold text-slate-700">{field.label}</span>
                              <Chip label={field.type} size="small" variant="outlined" />
                              {field.required ? (
                                <span className="text-xs text-red-500">必須</span>
                              ) : null}
                            </div>
                            {field.placeholder ? (
                              <div className="mt-1 text-xs text-slate-500">
                                プレースホルダー: {field.placeholder}
                              </div>
                            ) : null}
                            {field.helpText ? (
                              <div className="mt-1 text-xs text-slate-500">
                                ヘルプテキスト: {field.helpText}
                              </div>
                            ) : null}
                            {field.options?.length ? (
                              <div className="mt-1 text-xs text-slate-500">
                                選択肢: {field.options.join(", ")}
                              </div>
                            ) : null}
                          </div>
                        ))}
                    </div>
                  </details>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
