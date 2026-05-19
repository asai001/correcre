"use client";

import { useState } from "react";
import type { IconDefinition } from "@fortawesome/free-solid-svg-icons";

import type { Mission, MissionReport, SubmitPayload } from "../model/types";
import MissionListDialog from "./MissionListDialog";
import MissionReportCards from "./MissionReportCards";
import MissionReportDialog from "./MissionReportDialog";

type MissionReportViewProps = {
  icon: IconDefinition;
  iconColor?: string;
  open: boolean;
  selectedMissionId: string | null;
  orderedMissionItems: Mission[];
  missionReports: MissionReport[];
  companyId: string;
  handleOpen: (missionId: string) => void;
  handleClose: () => void;
  handleSubmit: (payload: SubmitPayload) => void | Promise<void>;
};

export default function MissionReportView({
  icon,
  iconColor,
  open,
  selectedMissionId,
  orderedMissionItems,
  missionReports,
  companyId,
  handleOpen,
  handleClose,
  handleSubmit,
}: MissionReportViewProps) {
  const [missionListOpen, setMissionListOpen] = useState(false);
  const selectedMission = orderedMissionItems.find((mission) => mission.missionId === selectedMissionId) ?? null;

  return (
    <>
      <MissionReportCards
        icon={icon}
        iconColor={iconColor}
        missions={orderedMissionItems}
        missionReports={missionReports}
        onClickMission={handleOpen}
        onOpenMissionList={() => setMissionListOpen(true)}
      />

      <MissionListDialog open={missionListOpen} onOpenChange={setMissionListOpen} missions={orderedMissionItems} />

      {selectedMission ? (
        <MissionReportDialog
          open={open}
          onClose={handleClose}
          onSubmit={handleSubmit}
          companyId={companyId}
          missionId={selectedMission.missionId}
          missionConfig={selectedMission}
        />
      ) : null}
    </>
  );
}
