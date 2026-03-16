"use client";

import { useMemo, useState } from "react";
import RecentReports from "@admin/features/recent-reports";
import AnalysisFilterSection from "./AnalysisFilterSection";
import EmployeeProfileCard from "./EmployeeProfileCard";
import EmployeeStatsCards from "./EmployeeStatsCards";
import MonthlyAchievementRadar from "./MonthlyAchievementRadar";
import PointsTrendChart from "./PointsTrendChart";
import MissionAnalysisSection from "./MissionAnalysisSection";
import PointExchangeHistoryCard from "./PointExchangeHistoryCard";
import { useIndividualAnalysisSummary } from "../hooks/useIndividualAnalysisSummary";
import { EmployeeOption, IndividualAnalysisSummary } from "../model/types";

const companyId = "em";

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

function formatLocalDate(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export default function IndividualAnalysis() {
  const employees: EmployeeOption[] = useMemo(
    () => [
      { userId: "u-001", name: "\u5c71\u7530\u0020\u592a\u90ce", department: "\u55b6\u696d\u90e8" },
      { userId: "u-002", name: "\u4f50\u85e4\u0020\u82b1\u5b50", department: "\u6280\u8853\u90e8" },
      { userId: "u-003", name: "\u9234\u6728\u0020\u4e00\u90ce", department: "\u30de\u30fc\u30b1\u30c6\u30a3\u30f3\u30b0\u90e8" },
      { userId: "u-004", name: "\u9ad8\u6a4b\u0020\u7f8e\u54b2", department: "\u4eba\u4e8b\u90e8" },
      { userId: "u-005", name: "\u4f0a\u85e4\u0020\u5065\u592a", department: "\u55b6\u696d\u90e8" },
    ],
    []
  );
  const reportTablePagination = useMemo(
    () => ({
      rowsPerPageOptions: [10, 25, 50],
      initialRowsPerPage: 10,
    }),
    []
  );
  const exchangeHistoryPagination = useMemo(
    () => ({
      rowsPerPageOptions: [5, 10, 25],
      initialRowsPerPage: 5,
    }),
    []
  );

  const [selectedUserId, setSelectedUserId] = useState(employees[0]?.userId ?? "");
  const [selectedStartDate, setSelectedStartDate] = useState(() =>
    formatLocalDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  );
  const [selectedEndDate, setSelectedEndDate] = useState(() => formatLocalDate(new Date()));

  const selectedEmployee = employees.find((emp) => emp.userId === selectedUserId);
  const { summary, loading, error } = useIndividualAnalysisSummary(companyId, selectedUserId, selectedStartDate, selectedEndDate);
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
          role={"\u30c1\u30fc\u30e0\u30ea\u30fc\u30c0\u30fc"}
        />
      )}

      {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
      {loading && <div className="mb-4 text-sm text-slate-500">{"\u5206\u6790\u30c7\u30fc\u30bf\u3092\u8aad\u307f\u8fbc\u307f\u4e2d\u002e\u002e\u002e"}</div>}

      <EmployeeStatsCards
        earnedPoints={currentSummary.earnedPoints}
        achievementScore={currentSummary.achievementScore}
        achievementRate={currentSummary.achievementRate}
        averageScore={currentSummary.averageScore}
      />

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <MonthlyAchievementRadar data={currentSummary.radarData} />
        <PointsTrendChart data={currentSummary.trendData} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <MissionAnalysisSection
          goodMissions={currentSummary.goodMissions}
          improvementMissions={currentSummary.improvementMissions}
        />
        <PointExchangeHistoryCard
          companyId={companyId}
          userId={selectedUserId}
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
        userId={selectedUserId}
        startDate={selectedStartDate}
        endDate={selectedEndDate}
        showEmployeeName={false}
      />
    </div>
  );
}
