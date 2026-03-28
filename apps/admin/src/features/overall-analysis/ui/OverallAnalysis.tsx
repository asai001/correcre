"use client";

import { getDefaultAnalysisDateRange } from "@admin/lib/analysis-date-range";
import { useMemo, useState } from "react";
import MissionAnalysisSection from "@admin/features/individual-analysis/ui/MissionAnalysisSection";
import OverallAchievementChart from "./OverallAchievementChart";
import OverallAnalysisFilterSection from "./OverallAnalysisFilterSection";
import OverallAnalysisStatsCards from "./OverallAnalysisStatsCards";
import OverallPointExchangeHistoryTable from "./OverallPointExchangeHistoryTable";
import OverallScoreTrendChart from "./OverallScoreTrendChart";
import { useOverallAnalysisSummary } from "../hooks/useOverallAnalysisSummary";
import type { OverallAnalysisSummary } from "../model/types";

const companyId = "em";

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

export default function OverallAnalysis() {
  const initialDateRange = useMemo(() => getDefaultAnalysisDateRange(), []);
  const exchangeHistoryPagination = useMemo(
    () => ({
      rowsPerPageOptions: [5, 10, 25, 50],
      initialRowsPerPage: 5,
    }),
    []
  );
  const [selectedStartDate, setSelectedStartDate] = useState(initialDateRange.startDate);
  const [selectedEndDate, setSelectedEndDate] = useState(initialDateRange.endDate);
  const { summary, loading, error } = useOverallAnalysisSummary(companyId, selectedStartDate, selectedEndDate);
  const currentSummary = summary ?? emptySummary;

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
      />

      {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
      {loading && <div className="mb-4 text-sm text-slate-500">分析データを読み込み中...</div>}

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
    </div>
  );
}
