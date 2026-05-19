"use client";

import { SkeletonBlock } from "@admin/components/LoadingSkeleton";

import { useLoginInfo } from "../hooks/useUser";
import LoginInfoView from "./LoginInfoView";

type UserProps = {
  companyId: string;
  userId: string;
};

export default function LoginInfo({ companyId, userId }: UserProps) {
  const { data, loading, error } = useLoginInfo(companyId, userId);

  if (loading || (!data && !error)) {
    return <SkeletonBlock className="h-24 rounded-2xl" />;
  }

  if (error || !data) {
    return null;
  }

  return <LoginInfoView data={data} />;
}
