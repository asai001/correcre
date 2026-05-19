"use client";

import { useMemo, useState } from "react";

import { SkeletonBlock } from "@admin/components/LoadingSkeleton";
import RecentReports from "@admin/features/recent-reports";
import { getDefaultAnalysisDateRange } from "@admin/lib/analysis-date-range";

import { useIndividualAnalysisSummary } from "../hooks/useIndividualAnalysisSummary";
import type { EmployeeOption, IndividualAnalysisSummary } from "../model/types";
import AnalysisFilterSection from "./AnalysisFilterSection";
import EarnedScoreTrendChart from "./EarnedScoreTrendChart";
import EmployeeProfileCard from "./EmployeeProfileCard";
import EmployeeStatsCards from "./EmployeeStatsCards";
import MissionAnalysisSection from "./MissionAnalysisSection";
import MonthlyAchievementRadar from "./MonthlyAchievementRadar";
import PointExchangeHistoryCard from "./PointExchangeHistoryCard";

type IndividualAnalysisProps = {
  companyId: string;
  employees: EmployeeOption[];
};

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

export default function IndividualAnalysis({ companyId, employees }: IndividualAnalysisProps) {
  const initialDateRange = useMemo(() => getDefaultAnalysisDateRange(), []);
  const reportTablePagination = useMemo(
    () => ({
      rowsPerPageOptions: [5, 10, 25, 50],
      initialRowsPerPage: 5,
    }),
    [],
  );
  const exchangeHistoryPagination = useMemo(
    () => ({
      rowsPerPageOptions: [3, 5, 10, 25],
      initialRowsPerPage: 3,
    }),
    [],
  );

  const [selectedUserId, setSelectedUserId] = useState(
    employees.find((employee) => !employee.isInactive && !employee.isInvited)?.userId ?? employees[0]?.userId ?? "",
  );
  const [selectedStartDate, setSelectedStartDate] = useState(initialDateRange.startDate);
  const [selectedEndDate, setSelectedEndDate] = useState(initialDateRange.endDate);

  const selectedEmployee = employees.find((employee) => employee.userId === selectedUserId);
  const { summary, loading, error } = useIndividualAnalysisSummary(companyId, selectedUserId, selectedStartDate, selectedEndDate);
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
      <AnalysisFilterSection
        employees={employees}
        selectedUserId={selectedUserId}
        selectedStartDate={selectedStartDate}
        selectedEndDate={selectedEndDate}
        onUserChange={setSelectedUserId}
        onStartDateChange={handleStartDateChange}
        onEndDateChange={handleEndDateChange}
      />

      {selectedEmployee && (
        <EmployeeProfileCard
          name={selectedEmployee.name}
          department={selectedEmployee.department}
        />
      )}

      {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      {showSkeleton ? (
        <>
          <div className="mb-6 flex gap-4 overflow-x-auto pb-1">
            {Array.from({ length: 4 }, (_, index) => (
              <SkeletonBlock key={index} className="h-32 min-w-[14rem] flex-1" />
            ))}
          </div>
          <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <SkeletonBlock className="h-[360px]" />
            <SkeletonBlock className="h-[360px]" />
          </div>
          <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <SkeletonBlock className="h-[320px]" />
            <PointExchangeHistoryCard
              companyId={companyId}
              userId={selectedUserId}
              employeeName={selectedEmployee?.name}
              startDate={selectedStartDate}
              endDate={selectedEndDate}
              fetchAll
              rowsPerPageOptions={exchangeHistoryPagination.rowsPerPageOptions}
              initialRowsPerPage={exchangeHistoryPagination.initialRowsPerPage}
            />
          </div>
        </>
      ) : (
        <>
          <EmployeeStatsCards
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
            <PointExchangeHistoryCard
              companyId={companyId}
              userId={selectedUserId}
              employeeName={selectedEmployee?.name}
              startDate={selectedStartDate}
              endDate={selectedEndDate}
              fetchAll
              rowsPerPageOptions={exchangeHistoryPagination.rowsPerPageOptions}
              initialRowsPerPage={exchangeHistoryPagination.initialRowsPerPage}
            />
          </div>
        </>
      )}

      <RecentReports
        companyId={companyId}
        fetchAll
        pagination={reportTablePagination}
        userId={selectedUserId}
        startDate={selectedStartDate}
        endDate={selectedEndDate}
        showEmployeeName={false}
      />
    </div>
  );
}
