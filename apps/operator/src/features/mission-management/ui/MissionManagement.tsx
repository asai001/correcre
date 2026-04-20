"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert, MenuItem, TextField } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBullseye } from "@fortawesome/free-solid-svg-icons";

import AdminPageHeader from "@operator/components/AdminPageHeader";
import type { OperatorCompanySummary } from "@operator/features/company-registration/model/types";
import { fetchMissions } from "../api/client";
import type { OperatorMissionSummary } from "../model/types";
import MissionCard from "./MissionCard";
import MissionEditDialog from "./MissionEditDialog";
import MissionHistoryDialog from "./MissionHistoryDialog";

type MissionManagementProps = {
  initialCompanies: OperatorCompanySummary[];
  operatorName: string;
};

export default function MissionManagement({ initialCompanies, operatorName }: MissionManagementProps) {
  const [selectedCompanyId, setSelectedCompanyId] = useState(initialCompanies[0]?.companyId ?? "");
  const [missions, setMissions] = useState<OperatorMissionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingMission, setEditingMission] = useState<OperatorMissionSummary | null>(null);
  const [historySlotIndex, setHistorySlotIndex] = useState<number | null>(null);
  const historyMission = historySlotIndex !== null ? missions.find((m) => m.slotIndex === historySlotIndex) : null;

  const loadMissions = useCallback(async (companyId: string) => {
    if (!companyId) {
      setMissions([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await fetchMissions(companyId);
      setMissions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ミッションの取得に失敗しました。");
      setMissions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      loadMissions(selectedCompanyId);
    }
  }, [selectedCompanyId, loadMissions]);

  const handleMissionUpdated = (updated: OperatorMissionSummary) => {
    setMissions((current) =>
      current.map((m) => (m.slotIndex === updated.slotIndex ? updated : m)),
    );
    setEditingMission(null);
  };

  const handleCompanyChange = (companyId: string) => {
    setSelectedCompanyId(companyId);
    setEditingMission(null);
    setHistorySlotIndex(null);
  };

  return (
    <div className="space-y-6 pb-5">
      <AdminPageHeader
        title="ミッション管理"
        adminName={operatorName}
        backHref="/dashboard"
        subtitle="企業のミッション項目（5 件固定）の編集と履歴管理を行います。"
      />

      <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
            <FontAwesomeIcon icon={faBullseye} className="text-lg" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">対象企業を選択</h2>
            <p className="text-sm text-slate-500">ミッションを管理する企業を選択してください。</p>
          </div>
        </div>

        <div className="mt-4 max-w-md">
          <TextField
            select
            label="企業"
            value={selectedCompanyId}
            onChange={(e) => handleCompanyChange(e.target.value)}
            fullWidth
            disabled={initialCompanies.length === 0}
          >
            {initialCompanies.map((company) => (
              <MenuItem key={company.companyId} value={company.companyId}>
                {company.companyName}
              </MenuItem>
            ))}
          </TextField>
        </div>
      </section>

      {selectedCompanyId ? (
        <Alert severity="info">
          各企業のミッションは企業登録時には作成されません。5 つのスロットをこの画面から順に手動設定してください。
        </Alert>
      ) : (
        <Alert severity="info">登録済み企業がありません。先に企業登録を行ってください。</Alert>
      )}

      {error ? (
        <Alert severity="error">{error}</Alert>
      ) : null}

      {loading ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <div className="text-slate-500">ミッションを読み込み中...</div>
        </div>
      ) : selectedCompanyId && !error ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {missions.map((mission) => (
            <MissionCard
              key={mission.slotIndex}
              mission={mission}
              onEdit={() => setEditingMission(mission)}
              onHistory={() => setHistorySlotIndex(mission.slotIndex)}
            />
          ))}
        </section>
      ) : null}

      {editingMission ? (
        <MissionEditDialog
          open
          companyId={selectedCompanyId}
          mission={editingMission}
          onClose={() => setEditingMission(null)}
          onUpdated={handleMissionUpdated}
        />
      ) : null}

      {historyMission ? (
        <MissionHistoryDialog
          open
          companyId={selectedCompanyId}
          mission={historyMission}
          onClose={() => setHistorySlotIndex(null)}
        />
      ) : null}
    </div>
  );
}
