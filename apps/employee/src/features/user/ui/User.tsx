// 「取得済みのデータをどう表示するか」だけ知っている層
"use client";
import { useCurrentUserForDashboard } from "../hooks/useCurrentUserForDashboard";
import UserInfo from "./UserInfo";

type UserProps = {
  companyId: string;
  userId: string;
};

export default function User({ companyId, userId }: UserProps) {
  // 本コンポーネントが再レンダされたら都度実行される（useEffect フックの中身は依存配列次第で走る）
  const { user, loading, error } = useCurrentUserForDashboard(companyId, userId);

  if (loading) {
    // とりあえず null。のちにスケルトンに差し替えやすい
    return null;
  }

  if (error) {
    // 将来的に別コンポーネントにしても良い
    return null;
  }

  if (!user) {
    return null;
  }

  return <UserInfo user={user} />;
}
