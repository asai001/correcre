"use client";

type MissionItem = {
  name: string;
  percentage: number;
};

type MissionAnalysisSectionProps = {
  goodMissions: MissionItem[];
  improvementMissions: MissionItem[];
  className?: string;
};

export default function MissionAnalysisSection({
  goodMissions,
  improvementMissions,
  className,
}: MissionAnalysisSectionProps) {
  return (
    <div className={`rounded-lg bg-white p-6 shadow-sm ${className ?? ""}`}>
      <h3 className="mb-4 text-2xl font-bold">{"項目分析"}</h3>
      <div className="space-y-6">
        <div>
          <h4 className="mb-3 text-base font-bold" style={{ color: "#10b981" }}>
            {"達成率が高い項目"}
          </h4>
          <ul className="space-y-2">
            {goodMissions.map((mission, index) => (
              <li key={index} className="flex items-center justify-between border-b border-gray-100 py-2">
                <span className="text-gray-700">{mission.name}</span>
                <span className="font-semibold" style={{ color: "#10b981" }}>
                  {mission.percentage}%
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-base font-bold" style={{ color: "#ef4444" }}>
            {"改善余地がある項目"}
          </h4>
          <ul className="space-y-2">
            {improvementMissions.map((mission, index) => (
              <li key={index} className="flex items-center justify-between border-b border-gray-100 py-2">
                <span className="text-gray-700">{mission.name}</span>
                <span className="font-semibold" style={{ color: "#ef4444" }}>
                  {mission.percentage}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
