"use client";

import { FormControl, InputLabel, MenuItem, Select, SelectChangeEvent, TextField } from "@mui/material";

import type { OverallAnalysisDepartmentOption } from "../model/types";

type OverallAnalysisFilterSectionProps = {
  selectedStartDate: string;
  selectedEndDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  departments: OverallAnalysisDepartmentOption[];
  selectedDepartmentId: string;
  onDepartmentChange: (departmentId: string) => void;
};

export default function OverallAnalysisFilterSection({
  selectedStartDate,
  selectedEndDate,
  onStartDateChange,
  onEndDateChange,
  departments,
  selectedDepartmentId,
  onDepartmentChange,
}: OverallAnalysisFilterSectionProps) {
  const handleDepartmentChange = (event: SelectChangeEvent) => {
    onDepartmentChange(event.target.value);
  };

  return (
    <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-bold">分析条件設定</h3>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <FormControl sx={{ width: "100%" }}>
          <InputLabel id="overall-department-select-label">部署</InputLabel>
          <Select
            labelId="overall-department-select-label"
            id="overall-department-select"
            value={selectedDepartmentId}
            label="部署"
            onChange={handleDepartmentChange}
          >
            <MenuItem value="">すべての部署</MenuItem>
            {departments.map((department) => (
              <MenuItem key={department.departmentId} value={department.departmentId}>
                {department.name}
              </MenuItem>
            ))}
            <MenuItem value="__UNASSIGNED__">部門未設定</MenuItem>
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
