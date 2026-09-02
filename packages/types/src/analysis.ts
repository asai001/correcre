// 分析・レポートの「項目分析」で、各ミッションを
// 「達成率が高い項目」/「改善余地がある項目」に振り分けるための閾値（%）。
//
// 企業単位（Company.analysisThresholds）とミッション単位（Mission.analysisThresholds）の
// 両方に持たせ、ミッション → 企業 → システム既定値（80% / 40%）の順に解決する。
// 解決処理は @correcre/lib の resolveAnalysisThresholds() を使う。
export type AnalysisThresholds = {
  // この値「以上」の達成率を「達成率が高い項目」とする（0〜100 の整数）
  goodRate: number;
  // この値「以下」の達成率を「改善余地がある項目」とする（0〜100 の整数）
  improvementRate: number;
};
