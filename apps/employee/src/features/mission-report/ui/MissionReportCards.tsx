"use client";

import { useMemo } from "react";
import type { IconDefinition } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import type { Mission, MissionReport } from "../model/types";

type MissionReportCardsProps = {
  icon: IconDefinition;
  iconColor?: string;
  missions: Mission[];
  missionReports: MissionReport[];
  onClickMission: (missionId: string) => void;
  onOpenMissionList: () => void;
};

export default function MissionReportCards({
  icon,
  iconColor = "#2563EB",
  missions,
  missionReports,
  onClickMission,
  onOpenMissionList,
}: MissionReportCardsProps) {
  const reportsCountByMissionId = useMemo(() => {
    const map = new Map<string, number>();
    for (const report of missionReports) {
      if (!report.missionId) {
        continue;
      }

      map.set(report.missionId, (map.get(report.missionId) ?? 0) + 1);
    }
    return map;
  }, [missionReports]);

  return (
    <section className="rounded-2xl bg-white p-5 shadow-lg">
      <div className="mb-4 flex items-center gap-2">
        <FontAwesomeIcon icon={icon} className="mr-3 text-xl lg:text-2xl" style={{ color: iconColor }} />
        <div className="text-lg font-bold lg:text-2xl">ミッション報告</div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {missions.map((mission) => {
          const doneCount = reportsCountByMissionId.get(mission.missionId) ?? 0;
          const targetCount = mission.monthlyCount ?? 0;
          const { done, progressTextClass, buttonClass } = getMissionClasses(doneCount, targetCount);

          return (
            <MissionCard
              key={mission.missionId}
              title={mission.title}
              description={mission.description}
              monthlyCount={targetCount}
              doneCount={doneCount}
              onClick={() => onClickMission(mission.missionId)}
              done={done}
              progressTextClass={progressTextClass}
              buttonClass={buttonClass}
            />
          );
        })}

        <InfoCard onOpen={onOpenMissionList} />
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

function MissionCard({
  title,
  description,
  monthlyCount,
  doneCount,
  done,
  progressTextClass,
  buttonClass,
  onClick,
}: MissionCardProps) {
  const target = monthlyCount;
  const hasTarget = target > 0;

  return (
    <div className="relative flex min-w-0 flex-col justify-between rounded-2xl bg-white p-5 shadow-[0_5px_15px_rgba(0,0,0,0.10)]">
      <div>
        <div className="flex items-baseline justify-between gap-2">
          <div className="truncate text-base font-semibold text-gray-800">{title}</div>
          {hasTarget ? (
            <span className={`whitespace-nowrap text-sm font-semibold ${progressTextClass}`}>
              ({doneCount}/{target})
            </span>
          ) : null}
        </div>

        <p className="mt-1 line-clamp-2 text-sm text-gray-500">{description}</p>
      </div>

      <button
        type="button"
        disabled={done}
        onClick={onClick}
        className={
          "mt-4 h-10 w-full rounded-md text-sm font-medium transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:shadow-lg " +
          (done ? "cursor-not-allowed bg-gray-200 text-gray-400" : buttonClass)
        }
      >
        {done ? "達成済み" : "報告する"}
      </button>
    </div>
  );
}

function getMissionClasses(
  doneCount: number,
  targetCount: number,
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
      buttonClass: "bg-gray-200 text-gray-400",
    };
  }

  if (ratio >= 0.8) {
    return {
      done: false,
      progressTextClass: "text-green-500",
      buttonClass: "bg-green-300 hover:bg-green-400",
    };
  }

  if (ratio >= 0.3) {
    return {
      done: false,
      progressTextClass: "text-amber-500",
      buttonClass: "bg-amber-300 hover:bg-amber-400",
    };
  }

  return {
    done: false,
    progressTextClass: "text-rose-500",
    buttonClass: "bg-rose-300 hover:bg-rose-400",
  };
}

type InfoCardProps = {
  onOpen: () => void;
};

function InfoCard({ onOpen }: InfoCardProps) {
  return (
    <div className="relative flex h-full min-w-0 flex-col justify-between rounded-2xl bg-white p-5 shadow-lg">
      <div className="text-base font-bold text-gray-800">各ミッションの詳細はこちら</div>
      <p className="mt-1 text-sm text-gray-500">点数、回数、提出内容の目安を一覧で確認できます。</p>
      <button
        type="button"
        onClick={onOpen}
        className="mt-4 h-10 w-full rounded-md bg-gray-200 text-sm font-medium text-gray-700 transition hover:bg-gray-300"
      >
        ミッション一覧を見る
      </button>
    </div>
  );
}
