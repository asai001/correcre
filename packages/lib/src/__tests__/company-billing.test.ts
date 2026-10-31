import {
  addMonths,
  buildCompanyBillingHistory,
  buildCompanyBillingRow,
  calculateCompanyBillingAmount,
  countCompanyEmployees,
  getDefaultUsageStartDate,
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
        billableEmployees: 3,
        monthlyBaseFee: 15000,
        perEmployeeMonthlyFee: 1000,
      }),
    ).toEqual({
      billableEmployees: 3,
      monthlyBaseFee: 15000,
      perEmployeeMonthlyFee: 1000,
      employeeFeeYen: 3000,
      amountYen: 18000,
      billable: true,
    });
  });

  it("基本料が未設定なら 0 円として扱う", () => {
    expect(
      calculateCompanyBillingAmount({ status: "TRIAL", billableEmployees: 5, perEmployeeMonthlyFee: 3000 }).amountYen,
    ).toBe(15000);
  });

  it("無効の企業には請求しない", () => {
    const result = calculateCompanyBillingAmount({
      status: "INACTIVE",
      billableEmployees: 3,
      monthlyBaseFee: 15000,
      perEmployeeMonthlyFee: 1000,
    });
    expect(result.amountYen).toBe(0);
    expect(result.billable).toBe(false);
  });
});

describe("countCompanyEmployees", () => {
  it("従業員ロールを持つ有効・招待中のユーザーだけを請求対象として数える", () => {
    expect(
      countCompanyEmployees([
        { status: "ACTIVE", roles: ["EMPLOYEE"] },
        { status: "ACTIVE", roles: ["EMPLOYEE", "ADMIN"] },
        { status: "INVITED", roles: ["EMPLOYEE"] },
        { status: "INACTIVE", roles: ["EMPLOYEE"] },
        { status: "DELETED", roles: ["EMPLOYEE"] },
      ]),
    ).toEqual({ totalEmployees: 4, activeEmployees: 2, billableEmployees: 3 });
  });

  it("従業員ロールのない管理者・運用担当は請求対象に数えない", () => {
    expect(
      countCompanyEmployees([
        { status: "ACTIVE", roles: ["EMPLOYEE"] },
        { status: "ACTIVE", roles: ["ADMIN"] },
        { status: "INVITED", roles: ["OPERATOR"] },
      ]),
    ).toEqual({ totalEmployees: 3, activeEmployees: 2, billableEmployees: 1 });
  });

  it("ロール未設定の古いレコードは従業員として数える", () => {
    expect(countCompanyEmployees([{ status: "ACTIVE" }]).billableEmployees).toBe(1);
  });

  it("利用開始日を迎えていないユーザーはその日まで請求対象に数えない", () => {
    const users = [
      { status: "ACTIVE" as const, roles: ["EMPLOYEE" as const], joinedAt: "2026-10-01" },
      { status: "INVITED" as const, roles: ["EMPLOYEE" as const], joinedAt: "2026-11-01" },
    ];
    expect(countCompanyEmployees(users, "2026-10-31").billableEmployees).toBe(1);
    expect(countCompanyEmployees(users, "2026-11-01").billableEmployees).toBe(2);
  });
});

describe("getDefaultUsageStartDate", () => {
  it("月の途中なら翌月 1 日（年をまたぐ場合も含む）", () => {
    expect(getDefaultUsageStartDate("2026-10-30")).toBe("2026-11-01");
    expect(getDefaultUsageStartDate("2026-12-15")).toBe("2027-01-01");
  });

  it("今日が 1 日ならその日", () => {
    expect(getDefaultUsageStartDate("2026-11-01")).toBe("2026-11-01");
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

  it("当月は招待中を含む請求対象人数で見込み額を出す", () => {
    const row = buildCompanyBillingRow(createCompany({ billableEmployees: 5 }), "2026-10", "2026-10");
    expect(row).toMatchObject({ billableEmployees: 5, employeeFeeYen: 5000, amountYen: 20000 });
  });

  it("請求対象人数が未集計の会社は有効ユーザー数で代用する", () => {
    const row = buildCompanyBillingRow(createCompany({ activeEmployees: 3 }), "2026-10", "2026-10");
    expect(row).toMatchObject({ billableEmployees: 3, amountYen: 18000 });
  });

  it("スナップショットに請求対象人数があればそれを使う", () => {
    const company = createCompany({
      monthlyBillingSnapshots: {
        "2026-09": {
          month: "2026-09",
          status: "ACTIVE",
          activeEmployees: 2,
          billableEmployees: 4,
          monthlyBaseFee: 15000,
          perEmployeeMonthlyFee: 1000,
          monthlyIncomeYen: 19000,
          capturedAt: "2026-09-20T00:00:00.000Z",
        },
      },
    });
    expect(buildCompanyBillingRow(company, "2026-09", "2026-10")).toMatchObject({
      billableEmployees: 4,
      amountYen: 19000,
    });
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
    expect(row).toMatchObject({ amountYen: 17000, billableEmployees: 2, finalized: true, source: "snapshot" });
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
    expect(row).toMatchObject({ amountYen: 16000, billableEmployees: 1, source: "carried" });
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
