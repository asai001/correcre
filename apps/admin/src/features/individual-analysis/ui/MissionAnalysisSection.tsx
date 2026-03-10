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
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <h3 className="text-lg font-bold mb-4">項目分析</h3>
      <div className="space-y-6">
        {/* 得意項目 */}
        <div>
          <h4 className="text-base font-bold mb-3" style={{ color: "#10b981" }}>
            得意項目
          </h4>
          <ul className="space-y-2">
            {goodMissions.map((mission, index) => (
              <li key={index} className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-gray-700">{mission.name}</span>
                <span className="font-semibold" style={{ color: "#10b981" }}>
                  {mission.percentage}%
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* 改善が必要な項目 */}
        <div>
          <h4 className="text-base font-bold mb-3" style={{ color: "#ef4444" }}>
            改善が必要な項目
          </h4>
          <ul className="space-y-2">
            {improvementMissions.map((mission, index) => (
              <li key={index} className="flex items-center justify-between py-2 border-b border-gray-100">
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
