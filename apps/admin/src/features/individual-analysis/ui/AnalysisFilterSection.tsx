"use client";

import { useMemo } from "react";
import { FormControl, InputLabel, MenuItem, Select, SelectChangeEvent } from "@mui/material";
import {
  getAnalysisMonthEndDate,
  getAnalysisMonthSelectOptions,
  getAnalysisMonthStartDate,
  toAnalysisYearMonth,
} from "@correcre/individual-analysis";
import { EmployeeOption } from "../model/types";

type AnalysisFilterSectionProps = {
  employees: EmployeeOption[];
  selectedUserId: string;
  selectedStartDate: string;
  selectedEndDate: string;
  onUserChange: (userId: string) => void;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
};

export default function AnalysisFilterSection({
  employees,
  selectedUserId,
  selectedStartDate,
  selectedEndDate,
  onUserChange,
  onStartDateChange,
  onEndDateChange,
}: AnalysisFilterSectionProps) {
  const handleUserChange = (event: SelectChangeEvent) => {
    onUserChange(event.target.value);
  };

  const selectedStartMonth = toAnalysisYearMonth(selectedStartDate);
  const selectedEndMonth = toAnalysisYearMonth(selectedEndDate);
  const monthOptions = useMemo(
    () =>
      getAnalysisMonthSelectOptions({
        includeYearMonths: [selectedStartMonth, selectedEndMonth],
      }),
    [selectedStartMonth, selectedEndMonth],
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
      <h3 className="mb-4 text-2xl font-bold">{"社員選択"}</h3>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <FormControl sx={{ width: "100%" }}>
          <InputLabel id="employee-select-label">{"社員を選択"}</InputLabel>
          <Select
            labelId="employee-select-label"
            id="employee-select"
            value={selectedUserId}
            label={"社員を選択"}
            onChange={handleUserChange}
          >
            {employees.map((emp) => {
              const suffix = emp.isInactive ? "（休止中）" : emp.isInvited ? "（招待中）" : "";
              return (
                <MenuItem key={emp.userId} value={emp.userId} disabled={emp.isInactive || emp.isInvited}>
                  {emp.name} ({emp.department}){suffix}
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>
        <FormControl sx={{ width: "100%" }}>
          <InputLabel id="individual-analysis-start-month-label">開始月</InputLabel>
          <Select
            labelId="individual-analysis-start-month-label"
            id="individual-analysis-start-month"
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
          <InputLabel id="individual-analysis-end-month-label">終了月</InputLabel>
          <Select
            labelId="individual-analysis-end-month-label"
            id="individual-analysis-end-month"
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
