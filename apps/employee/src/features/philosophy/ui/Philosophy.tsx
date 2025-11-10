"use client";

import { useState, useEffect } from "react";

import type { PhilosophyPayload } from "../model/types";
import { fetchPhilosophy } from "../api/client";

type PhilosophyProp = {
  companyId: string;
  missionId: string;
};

export default function Philosophy({ companyId, missionId }: PhilosophyProp) {
  const [data, setData] = useState<PhilosophyPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();

    (async () => {
      try {
        const res = await fetchPhilosophy(companyId, missionId, { signal: ac.signal });
        setData(res);
      } catch {
        if (!ac.signal.aborted) {
          setError("データの取得に失敗しました。時間をおいて再度お試しください。");
        }
      }
    })();

    return () => ac.abort();
  }, [companyId, missionId]);

  if (error) {
    // @TODO 将来的にログをどこかに送信する
    return null;
  }

  if (!data) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4 lg:space-y-6">
      {data.corporatePhilosophy && (
        <div className="flex flex-col justify-center items-center text-center">
          <div className="text-md lg:text-lg text-gray-600">経営理念</div>
          <div className="text-md font-bold text-gray-800 lg:text-xl mt-1">{data.corporatePhilosophy}</div>
        </div>
      )}

      {data.purpose && (
        <div className="flex flex-col justify-center items-center text-center">
          <div className="text-md lg:text-lg text-gray-600">PURPOSE</div>
          <div className="text-md font-bold text-gray-800 lg:text-xl mt-1">{data.purpose}</div>
        </div>
      )}
    </div>
  );
}
