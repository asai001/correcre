// apps/employee/src/features/mission-report/hooks/useMissionReportForDashboard.ts
"use client";

import { useEffect, useState, useMemo } from "react";

import type { Mission, MissionReport, SubmitPayload } from "../model/types";
import { fetchMission } from "../api/client";

import { nowYYYYMM } from "@correcre/lib";

type UseMissionForDashboardOptions = {
  /** 初期ロードを抑制したい場合などに使う */
  enabled?: boolean;
};

type UseMissionForDashboardResult = {
  open: boolean;
  selectedMissionId: string | null;
  orderedMissionItems: Mission[];
  missionReports: MissionReport[];
  handleOpen: (missionId: string) => void;
  handleClose: () => void;
  handleSubmit: (payload: SubmitPayload) => void | Promise<void>;
  loading: boolean;
  error: string | null;
};

export function useMissionReportForDashboard(
  companyId: string,
  userId: string,
  options?: UseMissionForDashboardOptions
): UseMissionForDashboardResult {
  const { enabled = true } = options ?? {};

  const yearMonth = nowYYYYMM();
  const [mission, setMission] = useState<Mission[]>([]);
  const [missionReports, setMissionReports] = useState<MissionReport[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // companyId / userId がまだ分からないとき or 明示的に無効化されているとき
    if (!enabled || !companyId || !userId) {
      return;
    }

    const ac = new AbortController();

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetchMission(companyId, userId);

        if (ac.signal.aborted) {
          return;
        }

        setMission(res?.mission ?? []);
        setMissionReports(res?.missionReports ?? []);
      } catch (err) {
        if (ac.signal.aborted) {
          return;
        }
        console.error(err);
        setError("ミッション情報の取得に失敗しました。");
      } finally {
        if (!ac.signal.aborted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      ac.abort();
    };
  }, [companyId, userId, enabled]);

  const orderedMissionItems = useMemo(() => {
    return mission.filter((i) => i.enabled !== false).sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
  }, [mission]);

  const handleOpen = (missionId: string) => {
    setSelectedMissionId(missionId);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedMissionId(null);
  };

  const handleSubmit = async (payload: SubmitPayload) => {
    // TODO: 後で API に POST する
    console.log("MissionReport submit", { ...payload, period: yearMonth });
  };

  return {
    open,
    selectedMissionId,
    orderedMissionItems,
    missionReports,
    handleOpen,
    handleClose,
    handleSubmit,
    loading,
    error,
  };
}
