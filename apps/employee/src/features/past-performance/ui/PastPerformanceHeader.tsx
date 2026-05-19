"use client";

import EmployeePageHeader from "@employee/components/EmployeePageHeader";

type PastPerformanceHeaderProps = {
  employeeName: string;
  departmentName?: string;
};

export default function PastPerformanceHeader({ employeeName, departmentName }: PastPerformanceHeaderProps) {
  return (
    <EmployeePageHeader
      title="過去の実績"
      right={
        <>
          <p className="text-sm font-semibold text-slate-200 sm:text-base">
            <span className="mr-1 text-xs text-slate-300 sm:text-sm">所属：</span>
            {departmentName || "従業員"}
          </p>
          {employeeName ? <p className="mt-1 truncate text-xl font-bold tracking-tight sm:text-2xl">{employeeName}</p> : null}
        </>
      }
    />
  );
}
