import type { Company, CompanyPointReturnRecord } from "@correcre/types";

import { addMonths, getCompanyBillingStartMonth, type CompanyBillingRow } from "./company-billing";
import { calculateMissionRewardPoint, FULL_SCORE } from "./points";

// 従業員に付与されなかったポイントを、会社の保有ポイントとして還元する（2026-10-28 定例で合意）。
// 企業が払った ID 料金分は全額ポイントとして放出し、従業員が獲得しなかった残りを会社側へ戻す。
// 戻したポイントは、成果の高い従業員への追加還元やイベントなどに管理者が使える。
// サーバー・クライアントのどちらからも使えるよう、DB アクセスは持たない純粋関数のみを置く。

// 還元を始める月。2026 年 11 月利用分から適用する。
export const COMPANY_POINT_RETURN_START_MONTH = "2026-11";

export type CompanyPointReturn = {
  fullPointPerEmployee: number; // 1 人が満点（100 点）を取ったときのポイント ＝ ID 料金分
  releasedPoints: number; // 請求対象人数 × 満点ポイント
  earnedPoints: number; // その月に従業員が獲得したポイントの合計
  returnedPoints: number; // 会社へ還元するポイント（放出分 − 獲得分。マイナスにはしない）
};

// 対象月の請求行（確定済み）と、その月に従業員が獲得したポイントの合計から還元ポイントを求める。
// 獲得ポイントは月途中で削除・休止した人の分も含めて差し引く（会社へ多く戻しすぎないため）。
export function calculateCompanyPointReturn(params: {
  billing: Pick<CompanyBillingRow, "billable" | "billableEmployees" | "perEmployeeMonthlyFee">;
  earnedPoints: number;
}): CompanyPointReturn {
  const fullPointPerEmployee = calculateMissionRewardPoint({
    score: FULL_SCORE,
    perEmployeeMonthlyFee: params.billing.perEmployeeMonthlyFee,
  });
  const releasedPoints = params.billing.billable ? params.billing.billableEmployees * fullPointPerEmployee : 0;
  const earnedPoints = Math.max(0, Math.trunc(params.earnedPoints));

  return {
    fullPointPerEmployee,
    releasedPoints,
    earnedPoints,
    returnedPoints: Math.max(0, releasedPoints - earnedPoints),
  };
}

// 還元がまだの月を古い順に返す。還元の開始月・その会社の請求開始月より前は対象外で、
// 対象は前月まで（当月はまだ従業員がポイントを獲得できるため）。
export function listPendingPointReturnMonths(
  company: Pick<Company, "lastCompanyPointReturnMonth" | "contractStartsAt" | "createdAt">,
  currentMonth: string,
): string[] {
  const candidates = [
    COMPANY_POINT_RETURN_START_MONTH,
    company.lastCompanyPointReturnMonth ? addMonths(company.lastCompanyPointReturnMonth, 1) : "",
    getCompanyBillingStartMonth(company) ?? "",
  ];
  const months: string[] = [];
  // "YYYY-MM" は辞書順比較で前後を判定できる。最も遅い候補から始める。
  for (let month = candidates.reduce((latest, item) => (item > latest ? item : latest)); month < currentMonth; ) {
    months.push(month);
    month = addMonths(month, 1);
  }
  return months;
}

// 画面に出す月ごとの還元の状態。
// - not_applicable: 還元の開始月より前
// - pending: 開始月以降で、まだ還元していない（当月は月明けに確定。前月分は日次バッチの処理待ち）
// - returned: 還元済み。内訳を持つ
export type CompanyPointReturnView =
  | { status: "not_applicable" }
  | { status: "pending" }
  | { status: "returned"; record: CompanyPointReturnRecord };

export function getCompanyPointReturnView(
  company: Pick<Company, "companyPointReturns">,
  month: string,
): CompanyPointReturnView {
  const record = company.companyPointReturns?.[month];
  if (record) {
    return { status: "returned", record };
  }
  return month < COMPANY_POINT_RETURN_START_MONTH ? { status: "not_applicable" } : { status: "pending" };
}

export type CompanyBillingRowWithPointReturn = CompanyBillingRow & { pointReturn: CompanyPointReturnView };

// 請求履歴の各月に、その月の会社への還元を添える（請求情報・請求管理の表で同じ行に並べるため）。
export function attachCompanyPointReturns(
  company: Pick<Company, "companyPointReturns">,
  rows: CompanyBillingRow[],
): CompanyBillingRowWithPointReturn[] {
  return rows.map((row) => ({ ...row, pointReturn: getCompanyPointReturnView(company, row.month) }));
}
