"use client";

import { MouseEvent } from "react";
import Image from "next/image";

type Mission = {
  id: string;
  title: string;
  desc: string;
  current: number;
  total: number;
  cta?: string;
  variant?: "green" | "yellow" | "red" | "gray";
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
};

export default function MissionReport() {
  const missions: Mission[] = [
    { id: "greeting", title: "挨拶運動", desc: "朝礼に参加する", current: 18, total: 20, cta: "報告する", variant: "green" },
    { id: "health", title: "健康推進活動", desc: "健康維持向上のための活動", current: 7, total: 20, cta: "報告する", variant: "yellow" },
    {
      id: "growth",
      title: "自己研鑽・成長",
      desc: "新しいスキルや知識を習得する",
      current: 5,
      total: 5,
      cta: "報告する",
      variant: "green",
    },
    { id: "improve", title: "効率化・改善提案", desc: "業務プロセスの改善案を提案", current: 1, total: 5, cta: "報告する", variant: "red" },
    { id: "community", title: "地域活動", desc: "地域のイベントへの参加", current: 1, total: 1, cta: "報告する", variant: "green" },
  ];

  return (
    <section aria-labelledby="mission-heading" className="bg-white mt-6 p-6 rounded-2xl shadow-lg">
      <div className="flex items-center gap-2 mb-3">
        <Image src="/list.svg" alt="" width={24} height={24} className="w-5 h-5 lg:w-6 lg:h-6 " />
        <h2 id="mission-heading" className="text-xl font-semibold tracking-wide">
          ミッション報告
        </h2>
      </div>

      {/* スマホ：横スクロール / md以上：3列グリッド */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 items-stretch">
        {missions.map((m) => (
          <MissionCard key={m.id} {...m} />
        ))}

        {/* 詳細カード */}
        <InfoCard />
      </div>
    </section>
  );
}

function MissionCard({ title, desc, current, total, cta = "報告する", variant = "gray", onClick }: Mission) {
  // current を [0, total] の範囲に丸めた安全な値。
  // 進捗率計算で 0 未満や 100% 超を出さないためのガード。
  const clamped = Math.max(0, Math.min(current, total)); // total 超過時も 100% で扱う
  const ratio = total > 0 ? clamped / total : 0; // 0 除算ガード
  const done = current >= total;

  // 進捗テキストの色: 70% 以上=緑 / 30 〜 70% =オレンジ / 30% 未満=赤
  const progressClass = ratio >= 0.7 ? "text-emerald-500" : ratio >= 0.3 ? "text-amber-500" : "text-rose-500";

  const btnClass =
    variant === "green"
      ? "bg-green-300 hover:bg-green-400 text-gray-800 font-medium"
      : variant === "yellow"
      ? "bg-amber-300 hover:bg-amber-400 text-gray-800"
      : variant === "red"
      ? "bg-rose-300 hover:bg-rose-400 text-gray-800"
      : "bg-gray-200 hover:bg-gray-300 text-gray-800";

  return (
    <div className="relative bg-white rounded-2xl shadow-lg p-5 flex flex-col justify-between h-full min-w-0">
      <div className="font-bold text-gray-800 mb-2 flex justify-between items-center">
        <span>{title}</span>
        <span className={progressClass}>
          ({current}/{total})
        </span>
      </div>

      <p className="text-sm text-gray-600 mb-4">{desc}</p>

      <button
        disabled={done}
        onClick={onClick}
        className={[
          "mt-4 h-10 rounded-md text-sm font-medium w-full transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:shadow-lg",
          done ? "bg-gray-200 text-gray-400 cursor-not-allowed" : btnClass,
        ].join(" ")}
      >
        {done ? "完了" : cta}
      </button>
    </div>
  );
}

function InfoCard() {
  return (
    <div className="relative bg-white rounded-2xl shadow-lg p-5 flex flex-col justify-between h-full min-w-0">
      <div className="text-base font-bold text-gray-800">各ミッション項目の詳細はこちら</div>
      <p className="text-sm text-gray-500 mt-1">配点やルール、報告方法のガイドを確認できます</p>
      <button
        className="mt-4 h-10 rounded-md text-sm font-medium transition w-full bg-gray-200 hover:bg-gray-300 text-gray-700"
        onClick={() => {}}
      >
        詳細
      </button>
    </div>
  );
}
