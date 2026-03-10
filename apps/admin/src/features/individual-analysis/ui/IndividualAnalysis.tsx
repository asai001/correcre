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
import { EmployeeOption, MonthOption } from "../model/types";

const companyId = "em";

export default function IndividualAnalysis() {
  const employees: EmployeeOption[] = useMemo(
    () => [
      { userId: "u-001", name: "田中 太郎", department: "営業部" },
      { userId: "u-002", name: "佐藤 花子", department: "開発部" },
      { userId: "u-003", name: "鈴木 一郎", department: "マーケティング部" },
      { userId: "u-004", name: "高橋 美咲", department: "人事部" },
      { userId: "u-005", name: "藤田 花子", department: "営業部" },
    ],
    []
  );

  const months: MonthOption[] = useMemo(() => {
    const result: MonthOption[] = [];
    const now = new Date();

    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;

      result.push({
        value: `${year}-${month.toString().padStart(2, "0")}`,
        label: `${year}年${month}月`,
      });
    }

    return result;
  }, []);

  const [selectedUserId, setSelectedUserId] = useState(employees[0]?.userId ?? "");
  const [selectedYearMonth, setSelectedYearMonth] = useState(months[0]?.value ?? "");

  const selectedEmployee = employees.find((emp) => emp.userId === selectedUserId);

  const radarData = useMemo(
    () => [
      { category: "チームワーク", achievement: 80 },
      { category: "コミュニケーション", achievement: 65 },
      { category: "積極性", achievement: 70 },
      { category: "主体性", achievement: 90 },
      { category: "問題解決力", achievement: 75 },
    ],
    []
  );

  const trendData = useMemo(() => {
    const now = new Date();
    const data: { month: string; points: number }[] = [];

    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;

      data.push({
        month: `${year}/${month.toString().padStart(2, "0")}`,
        points: [68, 74, 75, 77, 78, 80, 85, 78, 80, 91, 70, 73][11 - i] ?? 70,
      });
    }

    return data;
  }, []);

  const goodMissions = useMemo(
    () => [
      { name: "チームワーク", percentage: 95 },
      { name: "責任感", percentage: 92 },
    ],
    []
  );

  const improvementMissions = useMemo(
    () => [
      { name: "問題解決力", percentage: 75 },
      { name: "主体性", percentage: 65 },
    ],
    []
  );

  return (
    <div>
      <AnalysisFilterSection
        employees={employees}
        months={months}
        selectedUserId={selectedUserId}
        selectedYearMonth={selectedYearMonth}
        onUserChange={setSelectedUserId}
        onMonthChange={setSelectedYearMonth}
      />

      {selectedEmployee && (
        <EmployeeProfileCard name={selectedEmployee.name} department={selectedEmployee.department} role="チームリーダー" />
      )}

      <EmployeeStatsCards currentPoints={2450} monthlyScore={85} monthlyAchievementRate={83} averageInputDays={83.4} />

      <div className="grid grid-cols-1 gap-6 mb-6 lg:grid-cols-2">
        <MonthlyAchievementRadar data={radarData} />
        <PointsTrendChart data={trendData} />
      </div>

      <div className="grid grid-cols-1 gap-6 mb-6 lg:grid-cols-2">
        <MissionAnalysisSection goodMissions={goodMissions} improvementMissions={improvementMissions} />
        <PointExchangeHistoryCard companyId={companyId} userId={selectedUserId} />
      </div>

      <RecentReports companyId={companyId} userId={selectedUserId} showEmployeeName={false} />
    </div>
  );
}
