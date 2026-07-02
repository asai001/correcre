"use client";

import { useMemo } from "react";
import { FormControl, InputLabel, MenuItem, Select, SelectChangeEvent } from "@mui/material";
import {
  getAnalysisMonthEndDate,
  getAnalysisMonthSelectOptions,
  getAnalysisMonthStartDate,
  toAnalysisYearMonth,
} from "@correcre/individual-analysis";

import { UNASSIGNED_DEPARTMENT_FILTER } from "../model/constants";
import type { OverallAnalysisDepartmentOption } from "../model/types";

type OverallAnalysisFilterSectionProps = {
  selectedStartDate: string;
  selectedEndDate: string;
  startYearMonth?: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  departments: OverallAnalysisDepartmentOption[];
  hasUnassignedUsers: boolean;
  selectedDepartmentId: string;
  onDepartmentChange: (departmentId: string) => void;
};

export default function OverallAnalysisFilterSection({
  selectedStartDate,
  selectedEndDate,
  startYearMonth,
  onStartDateChange,
  onEndDateChange,
  departments,
  hasUnassignedUsers,
  selectedDepartmentId,
  onDepartmentChange,
}: OverallAnalysisFilterSectionProps) {
  const handleDepartmentChange = (event: SelectChangeEvent) => {
    onDepartmentChange(event.target.value);
  };

  const selectedStartMonth = toAnalysisYearMonth(selectedStartDate);
  const selectedEndMonth = toAnalysisYearMonth(selectedEndDate);
  const monthOptions = useMemo(
    () =>
      getAnalysisMonthSelectOptions({
        includeYearMonths: [selectedStartMonth, selectedEndMonth],
        startYearMonth,
      }),
    [selectedStartMonth, selectedEndMonth, startYearMonth],
  );

  const handleStartMonthChange = (event: SelectChangeEvent) => {
    const yearMonth = event.target.value;
    const startDate = getAnalysisMonthStartDate(yearMonth);

    onStartDateChange(startDate);
    if (selectedEndDate && startDate > selectedEndDate) {
      onEndDateChange(getAnalysisMonthEndDate(yearMonth));
    }
  };

  const handleEndMonthChange = (event: SelectChangeEvent) => {
    const yearMonth = event.target.value;
    const endDate = getAnalysisMonthEndDate(yearMonth);

    onEndDateChange(endDate);
    if (selectedStartDate && selectedStartDate > endDate) {
      onStartDateChange(getAnalysisMonthStartDate(yearMonth));
    }
  };

  return (
    <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-bold">分析条件設定</h3>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <FormControl sx={{ width: "100%" }}>
          <InputLabel id="overall-department-select-label" shrink>
            部署
          </InputLabel>
          <Select
            labelId="overall-department-select-label"
            id="overall-department-select"
            value={selectedDepartmentId}
            label="部署"
            onChange={handleDepartmentChange}
            displayEmpty
            notched
          >
            <MenuItem value="">すべての部署</MenuItem>
            {departments.map((department) => (
              <MenuItem key={department.departmentId} value={department.departmentId}>
                {department.name}
              </MenuItem>
            ))}
            {hasUnassignedUsers ? (
              <MenuItem value={UNASSIGNED_DEPARTMENT_FILTER}>部門未設定</MenuItem>
            ) : null}
          </Select>
        </FormControl>
        <FormControl sx={{ width: "100%" }}>
          <InputLabel id="overall-analysis-start-month-label">開始月</InputLabel>
          <Select
            labelId="overall-analysis-start-month-label"
            id="overall-analysis-start-month"
            value={selectedStartMonth}
            label="開始月"
            onChange={handleStartMonthChange}
          >
            {monthOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl sx={{ width: "100%" }}>
          <InputLabel id="overall-analysis-end-month-label">終了月</InputLabel>
          <Select
            labelId="overall-analysis-end-month-label"
            id="overall-analysis-end-month"
            value={selectedEndMonth}
            label="終了月"
            onChange={handleEndMonthChange}
          >
            {monthOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </div>
    </div>
  );
}
