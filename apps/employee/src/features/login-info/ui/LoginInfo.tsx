"use client";

import { SkeletonBlock } from "@employee/components/LoadingSkeleton";

import { useLoginInfo } from "../hooks/useLoginInfo";
import LoginInfoView from "./LoginInfoView";

type LoginInfoProps = {
  companyId: string;
  userId: string;
};

export default function LoginInfo({ companyId, userId }: LoginInfoProps) {
  const { data, loading, error } = useLoginInfo(companyId, userId);

  if (loading || (!data && !error)) {
    return <SkeletonBlock className="h-24 rounded-2xl" />;
  }

  if (error || !data) {
    return null;
  }

  return <LoginInfoView data={data} />;
}
