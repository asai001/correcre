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
        <TextField
          label={"開始日"}
          type="date"
          value={selectedStartDate}
          onChange={(event) => onStartDateChange(event.target.value)}
          fullWidth
          slotProps={{ inputLabel: { shrink: true } }}
          inputProps={{ max: selectedEndDate || undefined }}
        />
        <TextField
          label={"終了日"}
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
