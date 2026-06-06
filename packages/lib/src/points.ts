export const POINT_YEN_VALUE = 5;
export const FULL_SCORE = 100;

export function calculateMissionRewardPoint(input: {
  score: number;
  perEmployeeMonthlyFee: number;
}): number {
  if (!Number.isFinite(input.score) || input.score <= 0) {
    return 0;
  }

  if (!Number.isFinite(input.perEmployeeMonthlyFee) || input.perEmployeeMonthlyFee <= 0) {
    return 0;
  }

  return Math.round((input.score * input.perEmployeeMonthlyFee) / FULL_SCORE / POINT_YEN_VALUE);
}
