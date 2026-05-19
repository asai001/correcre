"use client";

import { SkeletonBlock } from "@employee/components/LoadingSkeleton";
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
  const { open, selectedMissionId, orderedMissionItems, missionReports, handleOpen, handleClose, handleSubmit, loading, error } =
    useMissionReportForDashboard(companyId, userId);

  if (loading) {
    return <SkeletonBlock className="h-36 rounded-2xl" />;
  }

  if (error) {
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
