"use client";

import type { IconDefinition } from "@fortawesome/free-solid-svg-icons";

import { useMissionReportForDashboard } from "../hooks/useMissionReportForDashboard";
import MissionReportView from "./MissionReportView";

type MissionReportProps = {
  icon: IconDefinition;
  iconColor?: string;
  companyId: string;
  userId: string;
};

export default function MissionReport({ icon, iconColor = "#2563EB", companyId, userId }: MissionReportProps) {
  // 本コンポーネントが再レンダされたら都度実行される（useEffect フックの中身は依存配列次第で走る）
  const { open, selectedMissionId, orderedMissionItems, missionReports, handleOpen, handleClose, handleSubmit, loading, error } =
    useMissionReportForDashboard(companyId, userId);

  if (loading) {
    // とりあえず null。のちにスケルトンに差し替えやすい
    return null;
  }

  if (error) {
    // 将来的に別コンポーネントにしても良い
    return null;
  }

  if (!orderedMissionItems) {
    return null;
  }

  return (
    <MissionReportView
      icon={icon}
      iconColor={iconColor}
      open={open}
      selectedMissionId={selectedMissionId}
      orderedMissionItems={orderedMissionItems}
      missionReports={missionReports}
      companyId={companyId}
      handleOpen={handleOpen}
      handleClose={handleClose}
      handleSubmit={handleSubmit}
    />
  );
}
