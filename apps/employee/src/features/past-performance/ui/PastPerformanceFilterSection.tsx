"use client";

import { TextField } from "@mui/material";

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
  return (
    <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-2xl font-bold">表示期間</h3>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
