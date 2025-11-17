// 「取得済みのデータをどう表示するか」だけ知っている層
"use client";
import type { IconDefinition } from "@fortawesome/free-solid-svg-icons";

import { useUser } from "../hooks/useUser";
import UserView from "./UserView";

type UserProps = {
  icon: IconDefinition;
  iconColor?: string;
  companyId: string;
  userId: string;
};

export default function User({ icon, iconColor = "#2563EB", companyId, userId }: UserProps) {
  // 本コンポーネントが再レンダされたら都度実行される（useEffect フックの中身は依存配列次第で走る）
  const { data, loading, error } = useUser(companyId, userId);

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

  return <UserView icon={icon} iconColor={iconColor} data={data} />;
}
