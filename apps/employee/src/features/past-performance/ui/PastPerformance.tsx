"use client";

import { useMemo, useState } from "react";

import {
  EarnedScoreTrendChart,
  getDefaultAnalysisDateRange,
  type IndividualAnalysisSummary,
  MissionAnalysisSection,
  MonthlyAchievementRadar,
  RecentReports,
  useIndividualAnalysisSummary,
} from "@correcre/individual-analysis";

import { useLoginInfo } from "@employee/features/login-info/hooks/useLoginInfo";

import PastPerformanceFilterSection from "./PastPerformanceFilterSection";
import PastPerformanceHeader from "./PastPerformanceHeader";
import PastPerformancePointExchangeHistoryCard from "./PastPerformancePointExchangeHistoryCard";
import PastPerformanceProfileCard from "./PastPerformanceProfileCard";
import PastPerformanceStatsCards from "./PastPerformanceStatsCards";

const companyId = "em";
const userId = "u-002";

const emptySummary: IndividualAnalysisSummary = {
  earnedPoints: 0,
  achievementScore: 0,
  achievementRate: 0,
  averageScore: 0,
  radarData: [],
  trendData: [],
  goodMissions: [],
  improvementMissions: [],
};

export default function PastPerformance() {
  const initialDateRange = useMemo(() => getDefaultAnalysisDateRange(), []);
  const reportTablePagination = useMemo(
    () => ({
      rowsPerPageOptions: [5, 10, 25, 50],
      initialRowsPerPage: 5,
    }),
    []
  );
  const exchangeHistoryPagination = useMemo(
    () => ({
      rowsPerPageOptions: [3, 5, 10, 25],
      initialRowsPerPage: 3,
    }),
    []
  );

  const [selectedStartDate, setSelectedStartDate] = useState(initialDateRange.startDate);
  const [selectedEndDate, setSelectedEndDate] = useState(initialDateRange.endDate);

  const { data: loginInfo } = useLoginInfo(companyId, userId);
  const { summary, loading, error } = useIndividualAnalysisSummary(companyId, userId, selectedStartDate, selectedEndDate);
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
    <div className="space-y-1 pb-5">
      <PastPerformanceHeader employeeName={loginInfo?.displayName ?? "従業員"} departmentName={loginInfo?.departmentName} />

      <div className="container mx-auto px-6">
        <div className="mt-5">
          <PastPerformanceFilterSection
            selectedStartDate={selectedStartDate}
            selectedEndDate={selectedEndDate}
            onStartDateChange={handleStartDateChange}
            onEndDateChange={handleEndDateChange}
          />
        </div>

        {loginInfo && (
          <div className="mt-5">
            <PastPerformanceProfileCard name={loginInfo.displayName} department={loginInfo.departmentName ?? ""} />
          </div>
        )}

        {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
        {loading && <div className="mb-4 text-sm text-slate-500">データを読み込み中...</div>}

        <PastPerformanceStatsCards
          earnedPoints={currentSummary.earnedPoints}
          achievementScore={currentSummary.achievementScore}
          achievementRate={currentSummary.achievementRate}
          averageScore={currentSummary.averageScore}
        />

        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <MonthlyAchievementRadar data={currentSummary.radarData} />
          <EarnedScoreTrendChart data={currentSummary.trendData} />
        </div>

        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <MissionAnalysisSection
            goodMissions={currentSummary.goodMissions}
            improvementMissions={currentSummary.improvementMissions}
          />
          <PastPerformancePointExchangeHistoryCard
            companyId={companyId}
            userId={userId}
            employeeName={loginInfo?.displayName}
            startDate={selectedStartDate}
            endDate={selectedEndDate}
            fetchAll
            rowsPerPageOptions={exchangeHistoryPagination.rowsPerPageOptions}
            initialRowsPerPage={exchangeHistoryPagination.initialRowsPerPage}
          />
        </div>

        <RecentReports
          companyId={companyId}
          fetchAll
          pagination={reportTablePagination}
          userId={userId}
          startDate={selectedStartDate}
          endDate={selectedEndDate}
          showEmployeeName={false}
        />
      </div>
    </div>
  );
}
