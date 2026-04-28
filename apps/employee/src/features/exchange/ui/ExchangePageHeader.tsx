"use client";

type Props = {
  currentPointBalance: number;
};

function formatPoint(value: number) {
  return `${value.toLocaleString("ja-JP")}pt`;
}

export default function ExchangePageHeader({ currentPointBalance }: Props) {
  return (
    <div className="bg-[#0d2a3d] text-white">
      <div className="container mx-auto flex items-center justify-between gap-6 px-6 py-6">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">商品・サービス交換</h1>
          <p className="mt-1 text-xs text-slate-300 sm:text-sm">コレクレ管理システム</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs text-slate-300 sm:text-sm">保有ポイント</p>
          <p className="text-2xl font-bold tracking-tight sm:text-3xl">{formatPoint(currentPointBalance)}</p>
        </div>
      </div>
    </div>
  );
}
