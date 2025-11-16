// apps/employee/src/features/mission-report/ui/MissionReportView.tsx
"use client";

import MissionReportCards from "./MissionReportCards";
import MissionReportDialog from "./MissionReportDialog";

import type { Mission, MissionReport, SubmitPayload } from "../model/types";

type MissionReportViewProps = {
  open: boolean;
  selectedMissionId: string | null;
  orderedMissionItems: Mission[];
  missionReports: MissionReport[];
  companyId: string;
  userId: string;
  handleOpen: (missionId: string) => void;
  handleClose: () => void;
  handleSubmit: (payload: SubmitPayload) => void | Promise<void>;
};

export default function MissionReportView({
  open,
  selectedMissionId,
  orderedMissionItems,
  missionReports,
  companyId,
  userId,
  handleOpen,
  handleClose,
  handleSubmit,
}: MissionReportViewProps) {
  // ダイアログに渡すミッション（未選択の場合は null）
  const selectedMission = orderedMissionItems.find((m) => m.missionId === selectedMissionId) ?? null;

  return (
    <>
      {/* カード描画は専用コンポーネントに丸投げ */}
      <MissionReportCards missions={orderedMissionItems} missionReports={missionReports} onClickMission={handleOpen} />

      {/* ダイアログ描画は MissionReportDialog に丸投げ */}
      {selectedMission && (
        <MissionReportDialog
          open={open}
          onClose={handleClose}
          onSubmit={handleSubmit}
          companyId={companyId}
          missionId={selectedMission.missionId}
          missionConfig={selectedMission}
        />
      )}
    </>
  );
}
