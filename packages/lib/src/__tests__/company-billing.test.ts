import {
  addMonths,
  buildCompanyBillingHistory,
  buildCompanyBillingRow,
  calculateCompanyBillingAmount,
  getBillingDate,
  getPaymentDueDate,
} from "../company-billing";

import type { Company } from "@correcre/types";

function createCompany(overrides: Partial<Company> = {}): Company {
  return {
    companyId: "company-1",
    name: "花の風ホールディングス",
    status: "ACTIVE",
    plan: "STANDARD",
    monthlyBaseFee: 15000,
    perEmployeeMonthlyFee: 1000,
    companyPointBalance: 0,
    activeEmployees: 3,
    createdAt: "2026-07-10T03:00:00.000Z",
    updatedAt: "2026-09-30T03:00:00.000Z",
    ...overrides,
  };
}

describe("calculateCompanyBillingAmount", () => {
  it("月額基本料 + 利用人数 × 月額単価 を返す", () => {
    expect(
      calculateCompanyBillingAmount({
        status: "ACTIVE",
        activeEmployees: 3,
        monthlyBaseFee: 15000,
        perEmployeeMonthlyFee: 1000,
      }),
    ).toEqual({
      activeEmployees: 3,
      monthlyBaseFee: 15000,
      perEmployeeMonthlyFee: 1000,
      employeeFeeYen: 3000,
      amountYen: 18000,
      billable: true,
    });
  });

  it("基本料が未設定なら 0 円として扱う", () => {
    expect(
      calculateCompanyBillingAmount({ status: "TRIAL", activeEmployees: 5, perEmployeeMonthlyFee: 3000 }).amountYen,
    ).toBe(15000);
  });

  it("無効の企業には請求しない", () => {
    const result = calculateCompanyBillingAmount({
      status: "INACTIVE",
      activeEmployees: 3,
      monthlyBaseFee: 15000,
      perEmployeeMonthlyFee: 1000,
    });
    expect(result.amountYen).toBe(0);
    expect(result.billable).toBe(false);
  });
});

describe("請求日・支払期限", () => {
  it("請求日は対象月の末日（月末締め）", () => {
    expect(getBillingDate("2026-10")).toBe("2026-10-31");
    expect(getBillingDate("2026-11")).toBe("2026-11-30");
    expect(getBillingDate("2028-02")).toBe("2028-02-29");
  });

  it("支払期限は翌月 15 日（年をまたぐ場合も含む）", () => {
    expect(getPaymentDueDate("2026-10")).toBe("2026-11-15");
    expect(getPaymentDueDate("2026-12")).toBe("2027-01-15");
  });

  it("addMonths は年をまたいで前後に移動できる", () => {
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-10", -24)).toBe("2024-10");
  });
});

describe("buildCompanyBillingRow", () => {
  it("当月は現在の設定・利用人数から見込み額を出す", () => {
    const row = buildCompanyBillingRow(createCompany(), "2026-10", "2026-10");
    expect(row).toMatchObject({ amountYen: 18000, finalized: false, source: "live" });
  });

  it("過去月はその月のスナップショットを使う", () => {
    const company = createCompany({
      monthlyBillingSnapshots: {
        "2026-08": {
          month: "2026-08",
          status: "ACTIVE",
          activeEmployees: 2,
          monthlyBaseFee: 15000,
          perEmployeeMonthlyFee: 1000,
          monthlyIncomeYen: 17000,
          capturedAt: "2026-08-20T00:00:00.000Z",
        },
      },
    });
    const row = buildCompanyBillingRow(company, "2026-08", "2026-10");
    expect(row).toMatchObject({ amountYen: 17000, activeEmployees: 2, finalized: true, source: "snapshot" });
  });

  it("スナップショットがない過去月は直前の月のスナップショットを引き継ぐ", () => {
    const company = createCompany({
      monthlyBillingSnapshots: {
        "2026-07": {
          month: "2026-07",
          status: "ACTIVE",
          activeEmployees: 1,
          monthlyBaseFee: 15000,
          perEmployeeMonthlyFee: 1000,
          monthlyIncomeYen: 16000,
          capturedAt: "2026-07-10T03:00:00.000Z",
        },
      },
    });
    const row = buildCompanyBillingRow(company, "2026-09", "2026-10");
    expect(row).toMatchObject({ amountYen: 16000, activeEmployees: 1, source: "carried" });
  });

  it("基本料の項目がない古いスナップショットは基本料 0 円として扱う", () => {
    const company = createCompany({
      monthlyBillingSnapshots: {
        "2026-08": {
          month: "2026-08",
          status: "ACTIVE",
          activeEmployees: 3,
          perEmployeeMonthlyFee: 1000,
          monthlyIncomeYen: 3000,
          capturedAt: "2026-08-20T00:00:00.000Z",
        },
      },
    });
    expect(buildCompanyBillingRow(company, "2026-08", "2026-10").amountYen).toBe(3000);
  });

  it("参照できる記録がない過去月は現在の設定値で補完する", () => {
    const row = buildCompanyBillingRow(createCompany(), "2026-08", "2026-10");
    expect(row).toMatchObject({ amountYen: 18000, source: "estimated" });
  });
});

describe("buildCompanyBillingHistory", () => {
  it("請求開始月から当月までを新しい順に返す", () => {
    const rows = buildCompanyBillingHistory(createCompany(), { currentMonth: "2026-10" });
    expect(rows.map((row) => row.month)).toEqual(["2026-10", "2026-09", "2026-08", "2026-07"]);
  });

  it("契約開始日があれば作成日より優先する", () => {
    const rows = buildCompanyBillingHistory(createCompany({ contractStartsAt: "2026-10-01" }), {
      currentMonth: "2026-10",
    });
    expect(rows.map((row) => row.month)).toEqual(["2026-10"]);
  });

  it("作成日時は日本時間の月で判定する（UTC では前月末でも JST で翌月なら翌月から）", () => {
    const rows = buildCompanyBillingHistory(createCompany({ createdAt: "2026-08-31T16:00:00.000Z" }), {
      currentMonth: "2026-10",
    });
    expect(rows.map((row) => row.month)).toEqual(["2026-10", "2026-09"]);
  });

  it("最大月数で打ち切る", () => {
    const rows = buildCompanyBillingHistory(createCompany({ createdAt: "2020-01-01T00:00:00.000Z" }), {
      currentMonth: "2026-10",
      maxMonths: 3,
    });
    expect(rows.map((row) => row.month)).toEqual(["2026-10", "2026-09", "2026-08"]);
  });
});
