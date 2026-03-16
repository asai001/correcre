"use client";

type MissionItem = {
  name: string;
  percentage: number;
};

type MissionAnalysisSectionProps = {
  goodMissions: MissionItem[];
  improvementMissions: MissionItem[];
};

export default function MissionAnalysisSection({ goodMissions, improvementMissions }: MissionAnalysisSectionProps) {
  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-bold">{"\u9805\u76ee\u5206\u6790"}</h3>
      <div className="space-y-6">
        <div>
          <h4 className="mb-3 text-base font-bold" style={{ color: "#10b981" }}>
            {"\u9054\u6210\u7387\u304c\u9ad8\u3044\u9805\u76ee"}
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
            {"\u6539\u5584\u4f59\u5730\u304c\u3042\u308b\u9805\u76ee"}
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
