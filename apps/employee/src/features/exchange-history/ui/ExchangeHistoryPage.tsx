"use client";

import { faReceipt } from "@fortawesome/free-solid-svg-icons";

import EmployeePageHeader from "@employee/components/EmployeePageHeader";

import ExchangeHistory from "./ExchangeHistory";

type Props = {
  companyId: string;
  userId: string;
  userName: string;
  currentPointBalance: number;
};

function formatPoint(value: number) {
  return `${value.toLocaleString("ja-JP")}pt`;
}

export default function ExchangeHistoryPage({ companyId, userId, userName, currentPointBalance }: Props) {
  return (
    <div className="-mt-px pb-12">
      <EmployeePageHeader
        title="ポイント交換履歴"
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

      <div className="container mx-auto px-6 pt-8">
        <ExchangeHistory icon={faReceipt} iconColor="#48bb78" companyId={companyId} userId={userId} />
      </div>
    </div>
  );
}
