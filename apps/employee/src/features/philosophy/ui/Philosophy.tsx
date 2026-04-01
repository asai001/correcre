"use client";

import { SkeletonBlock } from "@employee/components/LoadingSkeleton";

import { usePhilosophyForDashboard } from "../hooks/usePhilosophyForDashboard";
import PhilosophyInfo from "./PhilosophyInfo";

type PhilosophyProps = {
  companyId: string;
};

export default function Philosophy({ companyId }: PhilosophyProps) {
  const { data, loading, error } = usePhilosophyForDashboard(companyId);

  if (loading || (!data && !error)) {
    return <SkeletonBlock className="h-40 rounded-2xl" />;
  }

  if (error || !data) {
    return null;
  }

  return <PhilosophyInfo philosophy={data} />;
}
