"use client";

import { useMemo, useState } from "react";

import { SkeletonBlock, SkeletonCardGrid, SkeletonTableCard } from "@admin/components/LoadingSkeleton";
import MissionAnalysisSection from "@admin/features/individual-analysis/ui/MissionAnalysisSection";
import { getDefaultAnalysisDateRange } from "@admin/lib/analysis-date-range";

import { useOverallAnalysisSummary } from "../hooks/useOverallAnalysisSummary";
import type { OverallAnalysisDepartmentOption, OverallAnalysisSummary } from "../model/types";
import OverallAchievementChart from "./OverallAchievementChart";
import OverallAnalysisFilterSection from "./OverallAnalysisFilterSection";
import OverallAnalysisStatsCards from "./OverallAnalysisStatsCards";
import OverallPointExchangeHistoryTable from "./OverallPointExchangeHistoryTable";
import OverallScoreTrendChart from "./OverallScoreTrendChart";

type OverallAnalysisProps = {
  companyId: string;
  departments: OverallAnalysisDepartmentOption[];
};

const emptySummary: OverallAnalysisSummary = {
  averageScore: 0,
  totalEarnedPoints: 0,
  totalUsedPoints: 0,
  trendData: [],
  achievementData: [],
  goodMissions: [],
  improvementMissions: [],
  exchangeHistory: [],
};

export default function OverallAnalysis({ companyId, departments }: OverallAnalysisProps) {
  const initialDateRange = useMemo(() => getDefaultAnalysisDateRange(), []);
  const exchangeHistoryPagination = useMemo(
    () => ({
      rowsPerPageOptions: [5, 10, 25, 50],
      initialRowsPerPage: 5,
    }),
    [],
  );
  const [selectedStartDate, setSelectedStartDate] = useState(initialDateRange.startDate);
  const [selectedEndDate, setSelectedEndDate] = useState(initialDateRange.endDate);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  const { summary, loading, error } = useOverallAnalysisSummary(
    companyId,
    selectedStartDate,
    selectedEndDate,
    selectedDepartmentId,
  );
  const currentSummary = summary ?? emptySummary;
  const showSkeleton = loading || (!summary && !error);

  const handleStartDateChange = (date: string) => {
    setSelectedStartDate(date);

    if (selectedEndDate && date && date > selectedEndDate) {
      setSelectedEndDate(date);
    }
  };

  const handleEndDateChange = (date: string) => {
    setSelectedEndDate(date);

    if (selectedStartDate && date && date < selectedStartDate) {
      setSelectedStartDate(date);
    }
  };

  return (
    <div>
      <OverallAnalysisFilterSection
        selectedStartDate={selectedStartDate}
        selectedEndDate={selectedEndDate}
        onStartDateChange={handleStartDateChange}
        onEndDateChange={handleEndDateChange}
        departments={departments}
        selectedDepartmentId={selectedDepartmentId}
        onDepartmentChange={setSelectedDepartmentId}
      />

      {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      {showSkeleton ? (
        <>
          <SkeletonCardGrid count={3} itemClassName="min-h-[120px]" className="mb-6 md:grid-cols-3 xl:grid-cols-3" />
          <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
            <SkeletonBlock className="h-[360px]" />
            <SkeletonBlock className="h-[360px]" />
          </div>
          <SkeletonBlock className="mb-6 h-[360px]" />
          <SkeletonTableCard rowCount={exchangeHistoryPagination.initialRowsPerPage} />
        </>
      ) : (
        <>
          <div className="mb-6 space-y-6">
            <OverallAnalysisStatsCards
              averageScore={currentSummary.averageScore}
              totalEarnedPoints={currentSummary.totalEarnedPoints}
              totalUsedPoints={currentSummary.totalUsedPoints}
            />

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <OverallAchievementChart data={currentSummary.achievementData} />
              <MissionAnalysisSection
                goodMissions={currentSummary.goodMissions}
                improvementMissions={currentSummary.improvementMissions}
                className="h-full"
              />
            </div>

            <OverallScoreTrendChart data={currentSummary.trendData} />
          </div>

          <OverallPointExchangeHistoryTable
            items={currentSummary.exchangeHistory}
            startDate={selectedStartDate}
            endDate={selectedEndDate}
            rowsPerPageOptions={exchangeHistoryPagination.rowsPerPageOptions}
            initialRowsPerPage={exchangeHistoryPagination.initialRowsPerPage}
          />
        </>
      )}
    </div>
  );
}
