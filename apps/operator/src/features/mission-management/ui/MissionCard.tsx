"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClockRotateLeft, faPenToSquare } from "@fortawesome/free-solid-svg-icons";
import { Button } from "@mui/material";

import type { OperatorMissionSummary } from "../model/types";

type MissionCardProps = {
  mission: OperatorMissionSummary;
  onEdit: () => void;
  onHistory: () => void;
};

export default function MissionCard({ mission, onEdit, onHistory }: MissionCardProps) {
  const actionLabel = mission.configured ? "編集" : "新規設定";

  return (
    <div className="rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-sm shadow-slate-200/50">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            スロット {mission.slotIndex}
          </span>
          {mission.configured && !mission.enabled ? (
            <span className="ml-2 inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-600">
              無効
            </span>
          ) : null}
        </div>
        <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500">
          {mission.configured ? `v${mission.version}` : "未設定"}
        </span>
      </div>

      {mission.configured ? (
        <>
          <h3 className="mt-3 text-lg font-bold text-slate-900">{mission.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-slate-500">{mission.description}</p>

          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <span className="rounded-full bg-slate-50 px-3 py-1 text-slate-600">{mission.category}</span>
            <span className="rounded-full bg-slate-50 px-3 py-1 text-slate-600">
              月 {mission.monthlyCount} 回
            </span>
            <span className="rounded-full bg-slate-50 px-3 py-1 text-slate-600">
              {mission.score} pt
            </span>
            <span className="rounded-full bg-slate-50 px-3 py-1 text-slate-600">
              {mission.fields.length} フィールド
            </span>
          </div>
        </>
      ) : (
        <div className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5">
          <h3 className="text-lg font-bold text-slate-900">このスロットは未設定です</h3>
          <p className="mt-1 text-sm text-slate-500">
            企業登録時には自動生成されません。運用者がこの画面から手動で設定してください。
          </p>
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <Button
          variant="contained"
          size="small"
          startIcon={<FontAwesomeIcon icon={faPenToSquare} />}
          onClick={onEdit}
          sx={{
            borderRadius: "12px",
            textTransform: "none",
            backgroundColor: "#0f766e",
            "&:hover": { backgroundColor: "#115e59" },
          }}
        >
          {actionLabel}
        </Button>
        <Button
          variant="outlined"
          size="small"
          startIcon={<FontAwesomeIcon icon={faClockRotateLeft} />}
          onClick={onHistory}
          disabled={!mission.configured}
          sx={{
            borderRadius: "12px",
            textTransform: "none",
            borderColor: "#cbd5e1",
            color: "#475569",
            "&:hover": { borderColor: "#94a3b8", backgroundColor: "#f8fafc" },
          }}
        >
          履歴
        </Button>
      </div>
    </div>
  );
}
