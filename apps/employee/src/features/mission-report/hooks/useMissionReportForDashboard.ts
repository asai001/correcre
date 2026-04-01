"use client";

import { useEffect, useMemo, useState } from "react";

import { nowYYYYMM } from "@correcre/lib";

import { fetchMission } from "../api/client";
import type { Mission, MissionReport, SubmitPayload } from "../model/types";

type UseMissionForDashboardOptions = {
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
  options?: UseMissionForDashboardOptions,
): UseMissionForDashboardResult {
  const { enabled = true } = options ?? {};

  const yearMonth = nowYYYYMM();
  const [mission, setMission] = useState<Mission[]>([]);
  const [missionReports, setMissionReports] = useState<MissionReport[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !companyId || !userId) {
      setMission([]);
      setMissionReports([]);
      setError(null);
      setLoading(false);
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
    return mission.filter((item) => item.enabled !== false).sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
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
    void payload;
    void yearMonth;
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
