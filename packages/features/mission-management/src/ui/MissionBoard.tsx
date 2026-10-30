"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert } from "@mui/material";

import type { AnalysisThresholds } from "@correcre/types";
import type { MissionApiClient } from "../api/client";
import type { MissionSlotSummary } from "../model/types";
import MissionCard from "./MissionCard";
import MissionEditDialog from "./MissionEditDialog";
import MissionHistoryDialog from "./MissionHistoryDialog";

type MissionBoardProps = {
  // ミッション API（運用者は対象企業付き、管理者はセッションの企業に固定された API を渡す）。
  // 参照が変わると一覧を読み直すため、呼び出し側で useMemo などにより安定させること。
  api: MissionApiClient;
  // 企業の項目分析の既定閾値（未設定なら null）。
  companyThresholds: AnalysisThresholds | null;
  // 未設定スロットに表示する案内文。
  emptySlotDescription?: string;
};

// ミッション 5 スロットのカード一覧と、編集・履歴・予約取消の操作をまとめたボード。
// 運用者のミッション管理画面と、管理者の各種情報画面「ミッション項目」タブで共通に使う。
export default function MissionBoard({ api, companyThresholds, emptySlotDescription }: MissionBoardProps) {
  const [missions, setMissions] = useState<MissionSlotSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingMission, setEditingMission] = useState<MissionSlotSummary | null>(null);
  const [historySlotIndex, setHistorySlotIndex] = useState<number | null>(null);
  const [cancelingSlotIndex, setCancelingSlotIndex] = useState<number | null>(null);
  const historyMission = historySlotIndex !== null ? missions.find((m) => m.slotIndex === historySlotIndex) : null;

  const loadMissions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.fetchMissions();
      setMissions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ミッションの取得に失敗しました。");
      setMissions([]);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    loadMissions();
  }, [loadMissions]);

  const handleMissionUpdated = (updated: MissionSlotSummary) => {
    setMissions((current) => current.map((m) => (m.slotIndex === updated.slotIndex ? updated : m)));
    setEditingMission(null);
  };

  const handleCancelSchedule = async (slotIndex: number) => {
    try {
      setCancelingSlotIndex(slotIndex);
      setError(null);
      const updated = await api.cancelScheduledChange(slotIndex);
      setMissions((current) => current.map((m) => (m.slotIndex === updated.slotIndex ? updated : m)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "予約の取り消しに失敗しました。");
    } finally {
      setCancelingSlotIndex(null);
    }
  };

  return (
    <>
      {error ? <Alert severity="error">{error}</Alert> : null}

      {loading ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <div className="text-slate-500">ミッションを読み込み中...</div>
        </div>
      ) : !error ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {missions.map((mission) => (
            <MissionCard
              key={mission.slotIndex}
              mission={mission}
              onEdit={() => setEditingMission(mission)}
              onHistory={() => setHistorySlotIndex(mission.slotIndex)}
              onCancelSchedule={() => handleCancelSchedule(mission.slotIndex)}
              cancelingSchedule={cancelingSlotIndex === mission.slotIndex}
              companyThresholds={companyThresholds}
              emptySlotDescription={emptySlotDescription}
            />
          ))}
        </section>
      ) : null}

      {editingMission ? (
        <MissionEditDialog
          open
          api={api}
          mission={editingMission}
          otherMissionsTotalPoints={missions
            .filter((m) => m.slotIndex !== editingMission.slotIndex && m.configured && m.enabled)
            .reduce((sum, m) => sum + m.monthlyCount * m.score, 0)}
          companyThresholds={companyThresholds}
          onClose={() => setEditingMission(null)}
          onUpdated={handleMissionUpdated}
        />
      ) : null}

      {historyMission ? (
        <MissionHistoryDialog
          open
          api={api}
          mission={historyMission}
          onClose={() => setHistorySlotIndex(null)}
        />
      ) : null}
    </>
  );
}
