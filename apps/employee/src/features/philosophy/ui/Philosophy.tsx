// 「取得済みのデータをどう表示するか」だけ知っている層
"use client";
import { usePhilosophyForDashboard } from "../hooks/usePhilosophyForDashboard";
import PhilosophyInfo from "./PhilosophyInfo";

type PhilosophyProps = {
  companyId: string;
  userId: string;
};

export default function Philosophy({ companyId }: PhilosophyProps) {
  // 本コンポーネントが再レンダされたら都度実行される（useEffect フックの中身は依存配列次第で走る）
  const { data, loading, error } = usePhilosophyForDashboard(companyId);

  if (loading) {
    // とりあえず null。のちにスケルトンに差し替えやすい
    return null;
  }

  if (error) {
    // 将来的に別コンポーネントにしても良い
    return null;
  }

  if (!data) {
    return null;
  }

  return <PhilosophyInfo philosophy={data} />;
}
