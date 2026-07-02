"use client";

import { useMemo } from "react";
import { FormControl, InputLabel, MenuItem, Select, SelectChangeEvent } from "@mui/material";
import {
  getAnalysisMonthEndDate,
  getAnalysisMonthSelectOptions,
  getAnalysisMonthStartDate,
  toAnalysisYearMonth,
} from "@correcre/individual-analysis";

type PastPerformanceFilterSectionProps = {
  selectedStartDate: string;
  selectedEndDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
};

export default function PastPerformanceFilterSection({
  selectedStartDate,
  selectedEndDate,
  onStartDateChange,
  onEndDateChange,
}: PastPerformanceFilterSectionProps) {
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
      <h3 className="mb-4 text-2xl font-bold">表示期間</h3>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <FormControl sx={{ width: "100%" }}>
          <InputLabel id="past-performance-start-month-label">開始月</InputLabel>
          <Select
            labelId="past-performance-start-month-label"
            id="past-performance-start-month"
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
          <InputLabel id="past-performance-end-month-label">終了月</InputLabel>
          <Select
            labelId="past-performance-end-month-label"
            id="past-performance-end-month"
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
