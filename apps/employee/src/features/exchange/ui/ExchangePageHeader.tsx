"use client";

import EmployeePageHeader from "@employee/components/EmployeePageHeader";

type Props = {
  currentPointBalance: number;
  userName: string;
};

function formatPoint(value: number) {
  return `${value.toLocaleString("ja-JP")}pt`;
}

export default function ExchangePageHeader({ currentPointBalance, userName }: Props) {
  return (
    <EmployeePageHeader
      title="商品・サービス交換"
      showPointExchangeLink
      right={
        <>
          <p className="text-sm font-semibold text-slate-200 sm:text-base">
            <span className="mr-1 text-xs text-slate-300 sm:text-sm">保有ポイント：</span>
            {formatPoint(currentPointBalance)}
          </p>
          {userName ? <p className="mt-1 truncate text-xl font-bold tracking-tight sm:text-2xl">{userName}</p> : null}
        </>
      }
    />
  );
}
