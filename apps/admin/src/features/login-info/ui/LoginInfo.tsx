"use client";

import { useLoginInfo } from "../hooks/useUser";
import LoginInfoView from "./LoginInfoView";

type UserProps = {
  companyId: string;
  userId: string;
};

export default function LoginInfo({ companyId, userId }: UserProps) {
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

  return <LoginInfoView data={data} />;
}
