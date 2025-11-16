// apps/employee/src/features/mission-report/ui/MissionReportCards.tsx
"use client";

import { useMemo } from "react";
import type { Mission, MissionReport } from "../model/types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTasks } from "@fortawesome/free-solid-svg-icons";

type MissionReportCardsProps = {
  missions: Mission[];
  missionReports: MissionReport[];
  onClickMission: (missionId: string) => void;
};

export default function MissionReportCards({ missions, missionReports, onClickMission }: MissionReportCardsProps) {
  // missionId ごとの「今月何回報告したか」を集計
  const reportsCountByMissionId = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of missionReports) {
      const key = (r as any).missionId as string | undefined;
      if (!key) continue;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [missionReports]);

  return (
    <section className="bg-white rounded-2xl shadow-lg p-5">
      <div className="flex items-center gap-2 mb-4">
        <FontAwesomeIcon icon={faTasks} className="h-5 text-gray-700" />
        <h2 className="text-base font-bold text-gray-800">ミッション報告</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {missions.map((m) => {
          const doneCount = reportsCountByMissionId.get(m.missionId) ?? 0;
          const targetCount = m.monthlyCount ?? 0;

          const { done, progressTextClass, buttonClass } = getMissionClasses(doneCount, targetCount);

          return (
            <MissionCard
              key={m.missionId}
              title={m.title}
              description={m.description}
              monthlyCount={targetCount}
              doneCount={doneCount}
              onClick={() => onClickMission(m.missionId)}
              done={done}
              progressTextClass={progressTextClass}
              buttonClass={buttonClass}
            />
          );
        })}

        {/* 右端の「各ミッション項目の詳細はこちら」 */}
        <InfoCard />
      </div>
    </section>
  );
}

type MissionCardProps = {
  title: string;
  description: string;
  monthlyCount: number;
  doneCount: number;
  done: boolean;
  progressTextClass: string;
  buttonClass: string;
  onClick: () => void;
};

function MissionCard({ title, description, monthlyCount, doneCount, done, progressTextClass, buttonClass, onClick }: MissionCardProps) {
  const target = monthlyCount;
  const hasTarget = target > 0;

  return (
    <div className="relative bg-white rounded-2xl shadow-lg p-5 flex flex-col justify-between min-w-0">
      <div>
        <div className="flex items-baseline justify-between gap-2">
          <div className="text-base font-semibold text-gray-800 truncate">{title}</div>
          {hasTarget && (
            <span className={`text-xs font-semibold whitespace-nowrap ${progressTextClass}`}>
              ({doneCount}/{target})
            </span>
          )}
        </div>

        <p className="mt-1 text-sm text-gray-500 line-clamp-2">{description}</p>

        {hasTarget && <p className="mt-1 text-xs text-gray-400">月 {target} 回</p>}
      </div>

      <button
        type="button"
        disabled={done}
        onClick={onClick}
        className={
          "mt-4 h-10 rounded-md text-sm font-medium w-full transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:shadow-lg " +
          (done ? "bg-gray-200 text-gray-400 cursor-not-allowed" : buttonClass)
        }
      >
        {done ? "完了" : "報告する"}
      </button>
    </div>
  );
}

/**
 * 進捗に応じて色を決める
 * - ratio >= 1.0        → グレー（完了）
 * - 0.8 <= ratio < 1.0  → 緑（あとちょっと）
 * - 0.3 <= ratio < 0.8  → 黄（そこそこ）
 * - ratio < 0.3         → 赤（要がんばり）
 */
function getMissionClasses(
  doneCount: number,
  targetCount: number
): {
  done: boolean;
  progressTextClass: string;
  buttonClass: string;
} {
  if (targetCount <= 0) {
    return {
      done: false,
      progressTextClass: "text-gray-400",
      buttonClass: "bg-gray-200 text-gray-600 hover:bg-gray-300",
    };
  }

  const ratio = doneCount / targetCount;
  const done = ratio >= 1;

  if (done) {
    return {
      done: true,
      progressTextClass: "text-emerald-500",
      buttonClass: "bg-gray-200 text-gray-400", // 実際の色は disabled 側で上書き
    };
  }

  if (ratio >= 0.8) {
    // グリーン
    return {
      done: false,
      progressTextClass: "text-green-500",
      buttonClass: "bg-green-300 hover:bg-green-400",
    };
  }

  if (ratio >= 0.3) {
    // オレンジ
    return {
      done: false,
      progressTextClass: "text-amber-500",
      buttonClass: "bg-amber-300 hover:bg-amber-400",
    };
  }

  // 赤
  return {
    done: false,
    progressTextClass: "text-rose-500",
    buttonClass: "bg-rose-300 hover:bg-rose-400",
  };
}

function InfoCard() {
  return (
    <div className="relative bg-white rounded-2xl shadow-lg p-5 flex flex-col justify-between h-full min-w-0">
      <div className="text-base font-bold text-gray-800">各ミッション項目の詳細はこちら</div>
      <p className="text-sm text-gray-500 mt-1">配点やルール、報告方法のガイドを確認できます</p>
      <button className="mt-4 h-10 rounded-md text-sm font-medium transition w-full bg-gray-200 hover:bg-gray-300 text-gray-700">
        詳細
      </button>
    </div>
  );
}
