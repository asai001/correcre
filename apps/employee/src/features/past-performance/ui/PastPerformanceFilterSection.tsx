"use client";

import { TextField } from "@mui/material";

type PastPerformanceFilterSectionProps = {
  selectedStartDate: string;
  selectedEndDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
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

export default function PastPerformanceFilterSection({
  selectedStartDate,
  selectedEndDate,
  onStartDateChange,
  onEndDateChange,
}: PastPerformanceFilterSectionProps) {
  const handlePresetClick = (months: number) => {
    const end = new Date();
    const start = new Date(end);
    start.setMonth(start.getMonth() - months);

    onStartDateChange(formatDate(start));
    onEndDateChange(formatDate(end));
  };

  return (
    <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-2xl font-bold">表示期間</h3>
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
