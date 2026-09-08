import {
  DEFAULT_ANALYSIS_THRESHOLDS,
  classifyAchievementRate,
  resolveAnalysisThresholds,
  validateAnalysisThresholds,
} from "../analysis-thresholds";

describe("resolveAnalysisThresholds", () => {
  it("ミッション・企業ともに未設定ならシステム既定値(80/40)を返す", () => {
    expect(resolveAnalysisThresholds(null, null)).toEqual(DEFAULT_ANALYSIS_THRESHOLDS);
    expect(resolveAnalysisThresholds(undefined, undefined)).toEqual({ goodRate: 80, improvementRate: 40 });
  });

  it("企業既定のみ設定されていれば企業既定を返す", () => {
    expect(resolveAnalysisThresholds(null, { goodRate: 70, improvementRate: 30 })).toEqual({
      goodRate: 70,
      improvementRate: 30,
    });
  });

  it("ミッション個別設定は企業既定より優先される", () => {
    expect(
      resolveAnalysisThresholds({ goodRate: 90, improvementRate: 20 }, { goodRate: 70, improvementRate: 30 }),
    ).toEqual({ goodRate: 90, improvementRate: 20 });
  });

  it("不正な値は未設定として扱い、上位のフォールバックに委ねる", () => {
    // goodRate <= improvementRate は不整合なので採用しない。
    expect(resolveAnalysisThresholds({ goodRate: 30, improvementRate: 50 }, { goodRate: 70, improvementRate: 30 })).toEqual(
      { goodRate: 70, improvementRate: 30 },
    );
    // 範囲外・非整数も同様。
    expect(resolveAnalysisThresholds({ goodRate: 120, improvementRate: 10 }, null)).toEqual(
      DEFAULT_ANALYSIS_THRESHOLDS,
    );
    expect(resolveAnalysisThresholds({ goodRate: 80.5, improvementRate: 40 }, null)).toEqual(
      DEFAULT_ANALYSIS_THRESHOLDS,
    );
  });
});

describe("validateAnalysisThresholds", () => {
  it("整合した値は null（エラー無し）を返す", () => {
    expect(validateAnalysisThresholds({ goodRate: 80, improvementRate: 40 })).toBeNull();
    expect(validateAnalysisThresholds({ goodRate: 100, improvementRate: 0 })).toBeNull();
  });

  it("範囲外・非整数はエラーメッセージを返す", () => {
    expect(validateAnalysisThresholds({ goodRate: 101, improvementRate: 40 })).not.toBeNull();
    expect(validateAnalysisThresholds({ goodRate: 80, improvementRate: -1 })).not.toBeNull();
    expect(validateAnalysisThresholds({ goodRate: 80.5, improvementRate: 40 })).not.toBeNull();
  });

  it("「達成率が高い」の閾値が「改善余地」以下ならエラーを返す", () => {
    expect(validateAnalysisThresholds({ goodRate: 40, improvementRate: 40 })).not.toBeNull();
    expect(validateAnalysisThresholds({ goodRate: 30, improvementRate: 40 })).not.toBeNull();
  });
});

describe("classifyAchievementRate", () => {
  const thresholds = { goodRate: 80, improvementRate: 40 };

  it("閾値は境界値を含む", () => {
    expect(classifyAchievementRate(80, thresholds)).toBe("good");
    expect(classifyAchievementRate(40, thresholds)).toBe("improvement");
  });

  it("どちらにも当てはまらない中間帯は neutral", () => {
    expect(classifyAchievementRate(41, thresholds)).toBe("neutral");
    expect(classifyAchievementRate(79, thresholds)).toBe("neutral");
  });
});
