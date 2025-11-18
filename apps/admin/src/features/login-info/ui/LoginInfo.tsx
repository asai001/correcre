// 「取得済みのデータをどう表示するか」だけ知っている層
"use client";
import type { IconDefinition } from "@fortawesome/free-solid-svg-icons";

import { useLoginInfo } from "../hooks/useUser";
import LoginInfoView from "./LoginInfoView";

type UserProps = {
  icon: IconDefinition;
  iconColor?: string;
  companyId: string;
  userId: string;
};

export default function LoginInfo({ icon, iconColor = "#2563EB", companyId, userId }: UserProps) {
  // 本コンポーネントが再レンダされたら都度実行される（useEffect フックの中身は依存配列次第で走る）
  const { data, loading, error } = useLoginInfo(companyId, userId);

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

  return <LoginInfoView icon={icon} iconColor={iconColor} data={data} />;
}
