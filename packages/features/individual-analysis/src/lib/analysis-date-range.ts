export type AnalysisDateRange = {
  startDate: string;
  endDate: string;
};

export type AnalysisMonthOption = {
  value: string;
  label: string;
};

const DEFAULT_MONTH_OPTION_COUNT = 120;
const YEAR_MONTH_PATTERN = /^\d{4}-\d{2}$/;

function formatLocalDate(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function formatYearMonth(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function formatMonthLabel(yearMonth: string) {
  const [year, month] = yearMonth.split("-");
  return `${year}年${Number(month)}月`;
}

function isValidYearMonth(yearMonth: string | undefined): yearMonth is string {
  return Boolean(yearMonth && YEAR_MONTH_PATTERN.test(yearMonth));
}

export function getDefaultAnalysisDateRange(now: Date = new Date()): AnalysisDateRange {
  return {
    startDate: formatLocalDate(new Date(now.getFullYear(), now.getMonth() - 6, 1)),
    endDate: formatLocalDate(now),
  };
}

export function getDefaultAnalysisMonthDateRange(now: Date = new Date(), startYearMonth?: string): AnalysisDateRange {
  const defaultStartDate = formatLocalDate(new Date(now.getFullYear(), now.getMonth() - 6, 1));
  const startDate =
    isValidYearMonth(startYearMonth) && startYearMonth > toAnalysisYearMonth(defaultStartDate)
      ? getAnalysisMonthStartDate(startYearMonth)
      : defaultStartDate;

  return {
    startDate,
    endDate: formatLocalDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
}

export function toAnalysisYearMonth(date: string) {
  return date.slice(0, 7);
}

export function getAnalysisMonthStartDate(yearMonth: string) {
  return `${yearMonth}-01`;
}

export function getAnalysisMonthEndDate(yearMonth: string) {
  const [year, month] = yearMonth.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return `${yearMonth}-${String(lastDay).padStart(2, "0")}`;
}

export function getAnalysisMonthSelectOptions({
  now = new Date(),
  includeYearMonths = [],
  startYearMonth,
  monthCount = DEFAULT_MONTH_OPTION_COUNT,
}: {
  now?: Date;
  includeYearMonths?: string[];
  startYearMonth?: string;
  monthCount?: number;
} = {}): AnalysisMonthOption[] {
  const safeMonthCount = Number.isFinite(monthCount) && monthCount > 0 ? Math.floor(monthCount) : DEFAULT_MONTH_OPTION_COUNT;
  const currentYearMonth = formatYearMonth(new Date(now.getFullYear(), now.getMonth(), 1));
  const earliestYearMonth = isValidYearMonth(startYearMonth) ? startYearMonth : undefined;
  const yearMonths = new Set<string>();

  for (let index = 0; earliestYearMonth ? true : index < safeMonthCount; index += 1) {
    const yearMonth = formatYearMonth(new Date(now.getFullYear(), now.getMonth() - index, 1));
    if (earliestYearMonth && yearMonth < earliestYearMonth) {
      break;
    }

    yearMonths.add(yearMonth);
  }

  for (const yearMonth of includeYearMonths) {
    if (isValidYearMonth(yearMonth) && yearMonth <= currentYearMonth && (!earliestYearMonth || yearMonth >= earliestYearMonth)) {
      yearMonths.add(yearMonth);
    }
  }

  return [...yearMonths]
    .sort((a, b) => b.localeCompare(a))
    .map((value) => ({
      value,
      label: formatMonthLabel(value),
    }));
}
