import {
  attachCompanyPointReturns,
  calculateCompanyPointReturn,
  getCompanyPointReturnView,
  listPendingPointReturnMonths,
} from "../company-point-return";
import type { CompanyBillingRow } from "../company-billing";

describe("calculateCompanyPointReturn", () => {
  it("ID 料金分のポイントから従業員の獲得分を引いた残りを会社へ還元する", () => {
    // ID 料金 1,000 円 → 満点 200pt。3 人分で 600pt、獲得 450pt なら 150pt を還元する。
    expect(
      calculateCompanyPointReturn({
        billing: { billable: true, billableEmployees: 3, perEmployeeMonthlyFee: 1000 },
        earnedPoints: 450,
      }),
    ).toEqual({ fullPointPerEmployee: 200, releasedPoints: 600, earnedPoints: 450, returnedPoints: 150 });
  });

  it("ID 料金 3,000 円なら 1 人あたり 600pt", () => {
    expect(
      calculateCompanyPointReturn({
        billing: { billable: true, billableEmployees: 2, perEmployeeMonthlyFee: 3000 },
        earnedPoints: 0,
      }).returnedPoints,
    ).toBe(1200);
  });

  it("獲得分が放出分を上回ってもマイナスにはしない", () => {
    expect(
      calculateCompanyPointReturn({
        billing: { billable: true, billableEmployees: 1, perEmployeeMonthlyFee: 1000 },
        earnedPoints: 300,
      }).returnedPoints,
    ).toBe(0);
  });

  it("請求しない月（無効）は還元しない", () => {
    expect(
      calculateCompanyPointReturn({
        billing: { billable: false, billableEmployees: 3, perEmployeeMonthlyFee: 1000 },
        earnedPoints: 0,
      }).returnedPoints,
    ).toBe(0);
  });
});

describe("listPendingPointReturnMonths", () => {
  const base = { createdAt: "2026-07-10T03:00:00.000Z" };

  it("2026-11 より前は還元しない", () => {
    expect(listPendingPointReturnMonths(base, "2026-11")).toEqual([]);
  });

  it("月が明けたら前月分を対象にする", () => {
    expect(listPendingPointReturnMonths(base, "2026-12")).toEqual(["2026-11"]);
  });

  it("処理済みの月の翌月から、取りこぼした月も順に返す", () => {
    expect(listPendingPointReturnMonths({ ...base, lastCompanyPointReturnMonth: "2026-11" }, "2027-02")).toEqual([
      "2026-12",
      "2027-01",
    ]);
    expect(listPendingPointReturnMonths({ ...base, lastCompanyPointReturnMonth: "2027-01" }, "2027-02")).toEqual([]);
  });

  it("請求開始月より前の月は対象にしない", () => {
    expect(listPendingPointReturnMonths({ ...base, contractStartsAt: "2027-01-01" }, "2027-03")).toEqual([
      "2027-01",
      "2027-02",
    ]);
  });
});

describe("getCompanyPointReturnView", () => {
  const record = {
    month: "2026-11",
    billableEmployees: 3,
    fullPointPerEmployee: 200,
    releasedPoints: 600,
    earnedPoints: 450,
    returnedPoints: 150,
    returnedAt: "2026-11-30T15:10:00.000Z",
  };

  it("還元済みの月は内訳を返す", () => {
    expect(getCompanyPointReturnView({ companyPointReturns: { "2026-11": record } }, "2026-11")).toEqual({
      status: "returned",
      record,
    });
  });

  it("開始月より前は対象外、開始月以降でまだなら処理待ち", () => {
    expect(getCompanyPointReturnView({}, "2026-10")).toEqual({ status: "not_applicable" });
    expect(getCompanyPointReturnView({}, "2026-11")).toEqual({ status: "pending" });
  });

  it("請求履歴の各行に還元の状態を添える", () => {
    const rows = [{ month: "2026-12" }, { month: "2026-11" }] as CompanyBillingRow[];
    expect(
      attachCompanyPointReturns({ companyPointReturns: { "2026-11": record } }, rows).map((row) => row.pointReturn.status),
    ).toEqual(["pending", "returned"]);
  });
});
