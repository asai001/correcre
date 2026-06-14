"use client";

import { FormControl, InputLabel, MenuItem, Select, SelectChangeEvent, TextField } from "@mui/material";

import { UNASSIGNED_DEPARTMENT_FILTER } from "../model/constants";
import type { OverallAnalysisDepartmentOption } from "../model/types";

type OverallAnalysisFilterSectionProps = {
  selectedStartDate: string;
  selectedEndDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  departments: OverallAnalysisDepartmentOption[];
  hasUnassignedUsers: boolean;
  selectedDepartmentId: string;
  onDepartmentChange: (departmentId: string) => void;
};

const RANGE_PRESETS: { label: string; months: number }[] = [
  { label: "直近1ヶ月", months: 1 },
  { label: "直近3ヶ月", months: 3 },
  { label: "直近半年", months: 6 },
  { label: "直近1年", months: 12 },
];

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function OverallAnalysisFilterSection({
  selectedStartDate,
  selectedEndDate,
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

  const handlePresetClick = (months: number) => {
    const end = new Date();
    const start = new Date(end);
    start.setMonth(start.getMonth() - months);

    onStartDateChange(formatDate(start));
    onEndDateChange(formatDate(end));
  };

  return (
    <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-bold">分析条件設定</h3>
      <div className="mb-4 flex flex-wrap gap-2">
        {RANGE_PRESETS.map((preset) => (
          <button
            key={preset.months}
            type="button"
            onClick={() => handlePresetClick(preset.months)}
            className="rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
          >
            {preset.label}
          </button>
        ))}
      </div>
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
        <TextField
          label="開始日"
          type="date"
          value={selectedStartDate}
          onChange={(event) => onStartDateChange(event.target.value)}
          fullWidth
          slotProps={{ inputLabel: { shrink: true } }}
          inputProps={{ max: selectedEndDate || undefined }}
        />
        <TextField
          label="終了日"
          type="date"
          value={selectedEndDate}
          onChange={(event) => onEndDateChange(event.target.value)}
          fullWidth
          slotProps={{ inputLabel: { shrink: true } }}
          inputProps={{ min: selectedStartDate || undefined }}
        />
      </div>
    </div>
  );
}
