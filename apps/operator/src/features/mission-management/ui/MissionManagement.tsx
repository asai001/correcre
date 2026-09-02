"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert, Button, MenuItem, TextField } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBullseye } from "@fortawesome/free-solid-svg-icons";

import { resolveAnalysisThresholds, validateAnalysisThresholds } from "@correcre/lib/analysis-thresholds";
import type { AnalysisThresholds } from "@correcre/types";
import AdminPageHeader from "@operator/components/AdminPageHeader";
import { updateCompany } from "@operator/features/company-registration/api/client";
import type { OperatorCompanySummary } from "@operator/features/company-registration/model/types";
import { cancelScheduledChange, fetchMissions } from "../api/client";
import type { OperatorMissionSummary } from "../model/types";
import MissionCard from "./MissionCard";
import MissionEditDialog from "./MissionEditDialog";
import MissionHistoryDialog from "./MissionHistoryDialog";

type MissionManagementProps = {
  initialCompanies: OperatorCompanySummary[];
  operatorName: string;
};

// 企業既定の閾値フォームの初期値。未設定の企業には、実際に適用されるシステム既定値を表示する。
function toThresholdForm(company: OperatorCompanySummary | undefined) {
  const effective = resolveAnalysisThresholds(null, company?.analysisThresholds ?? null);
  return { goodRate: String(effective.goodRate), improvementRate: String(effective.improvementRate) };
}

function toIntegerFormValue(value: string) {
  return /^\d*$/.test(value) ? value : null;
}

export default function MissionManagement({ initialCompanies, operatorName }: MissionManagementProps) {
  const [companies, setCompanies] = useState<OperatorCompanySummary[]>(initialCompanies);
  const [selectedCompanyId, setSelectedCompanyId] = useState(initialCompanies[0]?.companyId ?? "");
  const [missions, setMissions] = useState<OperatorMissionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingMission, setEditingMission] = useState<OperatorMissionSummary | null>(null);
  const [historySlotIndex, setHistorySlotIndex] = useState<number | null>(null);
  const [cancelingSlotIndex, setCancelingSlotIndex] = useState<number | null>(null);
  const historyMission = historySlotIndex !== null ? missions.find((m) => m.slotIndex === historySlotIndex) : null;

  const selectedCompany = companies.find((company) => company.companyId === selectedCompanyId);
  const companyThresholds = selectedCompany?.analysisThresholds ?? null;
  const [thresholdForm, setThresholdForm] = useState(() => toThresholdForm(initialCompanies[0]));
  const [savingThresholds, setSavingThresholds] = useState(false);
  const [thresholdError, setThresholdError] = useState<string | null>(null);
  const [thresholdNotice, setThresholdNotice] = useState<string | null>(null);

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
    setThresholdForm(toThresholdForm(companies.find((company) => company.companyId === companyId)));
    setThresholdError(null);
    setThresholdNotice(null);
  };

  // 企業既定の閾値を保存する。ミッション側で個別設定していないミッションにのみ効く。
  const handleSaveCompanyThresholds = async () => {
    if (!selectedCompanyId) {
      return;
    }

    const nextThresholds: AnalysisThresholds = {
      goodRate: Number(thresholdForm.goodRate),
      improvementRate: Number(thresholdForm.improvementRate),
    };
    const validationError = validateAnalysisThresholds(nextThresholds);

    if (validationError) {
      setThresholdError(validationError);
      setThresholdNotice(null);
      return;
    }

    try {
      setSavingThresholds(true);
      setThresholdError(null);
      setThresholdNotice(null);
      const updated = await updateCompany({ companyId: selectedCompanyId, analysisThresholds: nextThresholds });
      setCompanies((current) =>
        current.map((company) => (company.companyId === updated.companyId ? updated : company)),
      );
      setThresholdForm(toThresholdForm(updated));
      setThresholdNotice("企業の既定閾値を保存しました。");
    } catch (err) {
      setThresholdError(err instanceof Error ? err.message : "既定閾値の保存に失敗しました。");
    } finally {
      setSavingThresholds(false);
    }
  };

  const handleCancelSchedule = async (slotIndex: number) => {
    if (!selectedCompanyId) {
      return;
    }

    try {
      setCancelingSlotIndex(slotIndex);
      setError(null);
      const updated = await cancelScheduledChange(selectedCompanyId, slotIndex);
      setMissions((current) => current.map((m) => (m.slotIndex === updated.slotIndex ? updated : m)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "予約の取り消しに失敗しました。");
    } finally {
      setCancelingSlotIndex(null);
    }
  };

  return (
    <div className="space-y-6 pb-5">
      <AdminPageHeader
        title="ミッション管理"
        adminName={operatorName}
        backHref="/dashboard"
        subtitle="企業のミッション項目の編集と履歴管理を行います。"
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
            disabled={companies.length === 0}
          >
            {companies.map((company) => (
              <MenuItem key={company.companyId} value={company.companyId}>
                {company.companyName}
              </MenuItem>
            ))}
          </TextField>
        </div>

        {selectedCompanyId ? (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-5">
            <h3 className="text-base font-bold text-slate-900">項目分析の既定閾値</h3>
            <p className="mt-1 text-sm text-slate-500">
              分析・レポートの項目分析で「達成率が高い項目」「改善余地がある項目」を切り分ける、この企業の既定値です。
              ミッション側で個別に設定した場合は、そのミッションでは個別設定が優先されます。
              {companyThresholds ? null : "（現在は未設定のため、システム既定値 80% / 40% が適用されています）"}
            </p>

            {thresholdError ? (
              <Alert severity="error" sx={{ mt: 2 }}>{thresholdError}</Alert>
            ) : null}
            {thresholdNotice ? (
              <Alert severity="success" sx={{ mt: 2 }}>{thresholdNotice}</Alert>
            ) : null}

            <div className="mt-4 flex flex-wrap items-start gap-4">
              <TextField
                label="達成率が高い項目（% 以上）"
                type="number"
                value={thresholdForm.goodRate}
                onChange={(e) => {
                  const nextValue = toIntegerFormValue(e.target.value);
                  if (nextValue !== null) {
                    setThresholdForm((c) => ({ ...c, goodRate: nextValue }));
                  }
                }}
                slotProps={{
                  htmlInput: { min: 0, max: 100, step: 1, inputMode: "numeric", pattern: "[0-9]*" },
                }}
                sx={{ width: 240, "& .MuiInputLabel-root": { backgroundColor: "#f8fafc", px: 0.5 } }}
              />
              <TextField
                label="改善余地がある項目（% 以下）"
                type="number"
                value={thresholdForm.improvementRate}
                onChange={(e) => {
                  const nextValue = toIntegerFormValue(e.target.value);
                  if (nextValue !== null) {
                    setThresholdForm((c) => ({ ...c, improvementRate: nextValue }));
                  }
                }}
                slotProps={{
                  htmlInput: { min: 0, max: 100, step: 1, inputMode: "numeric", pattern: "[0-9]*" },
                }}
                sx={{ width: 240, "& .MuiInputLabel-root": { backgroundColor: "#f8fafc", px: 0.5 } }}
              />
              <Button
                variant="contained"
                onClick={handleSaveCompanyThresholds}
                disabled={savingThresholds}
                sx={{
                  mt: 1,
                  borderRadius: "12px",
                  textTransform: "none",
                  backgroundColor: "#0f766e",
                  "&:hover": { backgroundColor: "#115e59" },
                }}
              >
                {savingThresholds ? "保存中..." : "既定閾値を保存"}
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      {selectedCompanyId ? (
        <Alert severity="info">
          ミッション項目は企業登録時には作成されません。最大 5 つの項目をこの画面で順に設定してください。
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
              onCancelSchedule={() => handleCancelSchedule(mission.slotIndex)}
              cancelingSchedule={cancelingSlotIndex === mission.slotIndex}
              companyThresholds={companyThresholds}
            />
          ))}
        </section>
      ) : null}

      {editingMission ? (
        <MissionEditDialog
          open
          companyId={selectedCompanyId}
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
          companyId={selectedCompanyId}
          mission={historyMission}
          onClose={() => setHistorySlotIndex(null)}
        />
      ) : null}
    </div>
  );
}
