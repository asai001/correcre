"use client";

import { getDefaultAnalysisDateRange } from "@admin/lib/analysis-date-range";
import { useMemo, useState } from "react";
import RecentReports from "@admin/features/recent-reports";
import AnalysisFilterSection from "./AnalysisFilterSection";
import EarnedScoreTrendChart from "./EarnedScoreTrendChart";
import EmployeeProfileCard from "./EmployeeProfileCard";
import EmployeeStatsCards from "./EmployeeStatsCards";
import MonthlyAchievementRadar from "./MonthlyAchievementRadar";
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

export default function IndividualAnalysis() {
  const initialDateRange = useMemo(() => getDefaultAnalysisDateRange(), []);
  const employees: EmployeeOption[] = useMemo(
    () => [
      { userId: "u-001", name: "山田 太郎", department: "営業部" },
      { userId: "u-002", name: "佐藤 花子", department: "技術部" },
      { userId: "u-003", name: "鈴木 一郎", department: "マーケティング部" },
      { userId: "u-004", name: "高橋 美咲", department: "人事部" },
      { userId: "u-005", name: "伊藤 健太", department: "営業部" },
    ],
    []
  );
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

  const [selectedUserId, setSelectedUserId] = useState(employees[0]?.userId ?? "");
  const [selectedStartDate, setSelectedStartDate] = useState(initialDateRange.startDate);
  const [selectedEndDate, setSelectedEndDate] = useState(initialDateRange.endDate);

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
          role={"チームリーダー"}
        />
      )}

      {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
      {loading && <div className="mb-4 text-sm text-slate-500">{"分析データを読み込み中..."}</div>}

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
