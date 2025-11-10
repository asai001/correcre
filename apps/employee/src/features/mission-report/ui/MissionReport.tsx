"use client";

import { useEffect, useMemo, useState } from "react";

import MissionReportDialog from "./MissionReportDialog";
import { fetchMissionFormConfig, fetchMissionPlan, fetchMissionProgress } from "../api/client";
import type { MissionPlan, MissionProgress, SubmitPayload } from "../model/types";
import { nowYYYYMM } from "@correcre/lib";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTasks } from "@fortawesome/free-solid-svg-icons";

export default function MissionReport() {
  const companyId = "em-inc"; // ← 後で SSO/JWT から取得
  const userId = "user-001"; // ← 後で実ユーザーIDに
  const yearMonth = nowYYYYMM();

  const [missionPlan, setMissionPlan] = useState<MissionPlan | null>(null);
  const [missionProgressById, setMissionProgressById] = useState<Record<string, MissionProgress>>({});
  const [open, setOpen] = useState(false);
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);

  // 初期ロード：カード定義とユーザー進捗
  useEffect(() => {
    (async () => {
      const [c, p] = await Promise.all([fetchMissionPlan(companyId), fetchMissionProgress(companyId, userId, yearMonth)]);
      setMissionPlan(c);
      setMissionProgressById(Object.fromEntries(p.map((x) => [x.missionId, x])));
    })();
  }, [companyId, userId, yearMonth]);

  const orderedMissionItems = useMemo(() => {
    const missionItems = missionPlan?.items ?? [];
    return missionItems.filter((i) => i.enabled !== false).sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
  }, [missionPlan]);

  const handleOpen = (missionId: string) => {
    setSelectedMissionId(missionId);
    setOpen(true);
  };
  const handleClose = () => setOpen(false);

  const handleSubmit = async (payload: SubmitPayload) => {
    // 後でAPIにPOST
    console.log("MissionReport submit", { ...payload, period: yearMonth });
  };

  return (
    <section aria-labelledby="mission-heading" className="bg-white mt-6 p-6 rounded-2xl shadow-lg">
      <div className="flex items-center gap-2 mb-3">
        <FontAwesomeIcon icon={faTasks} className="text-xl lg:text-2xl mr-3" style={{ color: "#2563EB" }} />
        <div className="text-lg lg:text-2xl font-bold">ミッション報告</div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 items-stretch">
        {orderedMissionItems.map((item) => (
          <MissionCard
            key={item.missionId}
            title={item.title}
            desc={item.desc}
            maxScore={item.maxScore}
            progress={missionProgressById[item.missionId]}
            onClick={() => handleOpen(item.missionId)}
          />
        ))}
        <InfoCard />
      </div>

      {/* MissionReportDialog でダイアログの表示をキャッシュしたいため、ここではアンマウントせずに open 引数で表示/非表示を制御 */}
      <MissionReportDialog
        open={open}
        companyId={companyId}
        missionId={selectedMissionId ?? undefined}
        onClose={handleClose}
        onSubmit={handleSubmit}
        loader={fetchMissionFormConfig}
      />
    </section>
  );
}

function MissionCard({
  title,
  desc,
  maxScore,
  progress,
  onClick,
}: {
  title: string;
  desc: string;
  maxScore: number;
  progress?: MissionProgress;
  onClick: () => void;
}) {
  const current = progress?.current ?? 0;
  const clamped = Math.max(0, Math.min(current, maxScore));
  const ratio = maxScore > 0 ? clamped / maxScore : 0;
  // maxScore が 0 のときでもボタンが無効（完了扱い）になってしまうので、ガードを入れておく
  //   const done = current >= maxScore;
  const done = maxScore > 0 && current >= maxScore;

  const progressClass = ratio >= 0.7 ? "text-emerald-500" : ratio >= 0.3 ? "text-amber-500" : "text-rose-500";
  const btnClass =
    ratio >= 0.7 ? "bg-green-300 hover:bg-green-400" : ratio >= 0.3 ? "bg-amber-300 hover:bg-amber-400" : "bg-rose-300 hover:bg-rose-400";

  return (
    <div className="relative bg-white rounded-2xl shadow-lg p-5 flex flex-col justify-between h-full min-w-0">
      <div className="font-bold text-gray-800 mb-2 flex justify-between items-center">
        <span>{title}</span>
        <span className={progressClass}>
          ({current}/{maxScore})
        </span>
      </div>

      <p className="text-sm text-gray-600 mb-4">{desc}</p>

      <button
        disabled={done}
        onClick={onClick}
        className={`mt-4 h-10 rounded-md text-sm font-medium w-full transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:shadow-lg ${
          done ? "bg-gray-200 text-gray-400 cursor-not-allowed" : btnClass
        }`}
      >
        {done ? "完了" : "報告する"}
      </button>
    </div>
  );
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
