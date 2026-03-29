export type AnalysisDateRange = {
  startDate: string;
  endDate: string;
};

function formatLocalDate(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export function getDefaultAnalysisDateRange(now: Date = new Date()): AnalysisDateRange {
  return {
    startDate: formatLocalDate(new Date(now.getFullYear(), now.getMonth() - 6, 1)),
    endDate: formatLocalDate(now),
  };
}
