"use client";

import { FormControl, InputLabel, MenuItem, Select, SelectChangeEvent, TextField } from "@mui/material";
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

  return (
    <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-2xl font-bold">{"\u793e\u54e1\u9078\u629e"}</h3>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <FormControl sx={{ width: "100%" }}>
          <InputLabel id="employee-select-label">{"\u793e\u54e1\u3092\u9078\u629e"}</InputLabel>
          <Select
            labelId="employee-select-label"
            id="employee-select"
            value={selectedUserId}
            label={"\u793e\u54e1\u3092\u9078\u629e"}
            onChange={handleUserChange}
          >
            {employees.map((emp) => (
              <MenuItem key={emp.userId} value={emp.userId}>
                {emp.name} ({emp.department})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          label={"\u958b\u59cb\u65e5"}
          type="date"
          value={selectedStartDate}
          onChange={(event) => onStartDateChange(event.target.value)}
          fullWidth
          slotProps={{ inputLabel: { shrink: true } }}
          inputProps={{ max: selectedEndDate || undefined }}
        />
        <TextField
          label={"\u7d42\u4e86\u65e5"}
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
