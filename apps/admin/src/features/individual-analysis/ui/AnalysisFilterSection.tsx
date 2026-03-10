"use client";

import { FormControl, InputLabel, Select, MenuItem, SelectChangeEvent } from "@mui/material";
import { EmployeeOption, MonthOption } from "../model/types";

type AnalysisFilterSectionProps = {
  employees: EmployeeOption[];
  months: MonthOption[];
  selectedUserId: string;
  selectedYearMonth: string;
  onUserChange: (userId: string) => void;
  onMonthChange: (yearMonth: string) => void;
};

export default function AnalysisFilterSection({
  employees,
  months,
  selectedUserId,
  selectedYearMonth,
  onUserChange,
  onMonthChange,
}: AnalysisFilterSectionProps) {
  const handleUserChange = (event: SelectChangeEvent) => {
    onUserChange(event.target.value);
  };

  const handleMonthChange = (event: SelectChangeEvent) => {
    onMonthChange(event.target.value);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
      <h3 className="text-lg font-bold mb-4">従業員選択</h3>
      <div className="flex flex-col md:flex-row gap-6">
        <FormControl sx={{ width: { xs: "100%", md: "50%" } }}>
          <InputLabel id="employee-select-label">従業員を選択</InputLabel>
          <Select
            labelId="employee-select-label"
            id="employee-select"
            value={selectedUserId}
            label="従業員を選択"
            onChange={handleUserChange}
          >
            {employees.map((emp) => (
              <MenuItem key={emp.userId} value={emp.userId}>
                {emp.name} ({emp.department})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl sx={{ width: { xs: "100%", md: "50%" } }}>
          <InputLabel id="month-select-label">分析月を選択</InputLabel>
          <Select
            labelId="month-select-label"
            id="month-select"
            value={selectedYearMonth}
            label="分析月を選択"
            onChange={handleMonthChange}
          >
            {months.map((month) => (
              <MenuItem key={month.value} value={month.value}>
                {month.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </div>
    </div>
  );
}
