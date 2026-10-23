import { buildCompanyBillingRow } from "../company-billing";
import {
  buildCompanyInvoice,
  buildCompanyInvoiceNumber,
  calculateIncludedConsumptionTax,
  canIssueCompanyInvoice,
  normalizeInvoiceIssuerInput,
} from "../company-invoice";

import type { Company } from "@correcre/types";

function createCompany(overrides: Partial<Company> = {}): Company {
  return {
    companyId: "c0a1b2c3-d4e5-f6a7-b8c9-d0e1f2a3b4c5",
    name: "花の風ホールディングス",
    status: "ACTIVE",
    plan: "STANDARD",
    monthlyBaseFee: 30000,
    perEmployeeMonthlyFee: 1000,
    companyPointBalance: 0,
    activeEmployees: 10,
    createdAt: "2026-07-10T03:00:00.000Z",
    updatedAt: "2026-09-30T03:00:00.000Z",
    ...overrides,
  };
}

describe("calculateIncludedConsumptionTax", () => {
  it("税込金額に含まれる 10% の消費税を切り捨てで返す", () => {
    expect(calculateIncludedConsumptionTax(40000)).toBe(3636);
    expect(calculateIncludedConsumptionTax(110)).toBe(10);
    expect(calculateIncludedConsumptionTax(0)).toBe(0);
  });
});

describe("buildCompanyInvoiceNumber", () => {
  it("対象月と企業 ID から毎回同じ番号を作る", () => {
    expect(buildCompanyInvoiceNumber("c0a1b2c3-d4e5", "2026-09")).toBe("202609-C0A1B2C3");
    expect(buildCompanyInvoiceNumber("c0a1b2c3-d4e5", "2026-09")).toBe(
      buildCompanyInvoiceNumber("c0a1b2c3-d4e5", "2026-09"),
    );
  });
});

describe("buildCompanyInvoice", () => {
  it("確定した月の請求行から、基本料と ID 料金の明細を作る", () => {
    const company = createCompany();
    const row = buildCompanyBillingRow(company, "2026-09", "2026-10");
    const invoice = buildCompanyInvoice(company.companyId, row);

    expect(invoice).not.toBeNull();
    expect(invoice?.lines).toEqual([
      { label: "月額基本料", quantity: 1, unit: "式", unitPriceYen: 30000, amountYen: 30000 },
      { label: "ID料金", quantity: 10, unit: "人", unitPriceYen: 1000, amountYen: 10000 },
    ]);
    expect(invoice?.totalYen).toBe(40000);
    expect(invoice?.consumptionTaxYen).toBe(3636);
    expect(invoice?.issueDate).toBe(row.billingDate);
    expect(invoice?.paymentDueDate).toBe(row.paymentDueDate);
  });

  it("基本料 0 円の企業は ID 料金だけの明細にする", () => {
    const company = createCompany({ monthlyBaseFee: 0 });
    const invoice = buildCompanyInvoice(company.companyId, buildCompanyBillingRow(company, "2026-09", "2026-10"));
    expect(invoice?.lines.map((line) => line.label)).toEqual(["ID料金"]);
  });

  it("当月（未確定）・無効の月・0 円の月は請求書を出さない", () => {
    const company = createCompany();
    const current = buildCompanyBillingRow(company, "2026-10", "2026-10");
    expect(canIssueCompanyInvoice(current)).toBe(false);
    expect(buildCompanyInvoice(company.companyId, current)).toBeNull();

    const inactive = createCompany({ status: "INACTIVE" });
    expect(buildCompanyInvoice(inactive.companyId, buildCompanyBillingRow(inactive, "2026-09", "2026-10"))).toBeNull();

    const free = createCompany({ monthlyBaseFee: 0, perEmployeeMonthlyFee: 0 });
    expect(buildCompanyInvoice(free.companyId, buildCompanyBillingRow(free, "2026-09", "2026-10"))).toBeNull();
  });
});

describe("normalizeInvoiceIssuerInput", () => {
  it("前後の空白を落とし、空欄は未設定にする", () => {
    expect(
      normalizeInvoiceIssuerInput({
        companyName: "  em株式会社 ",
        registrationNumber: "t1234567890123",
        postalCode: "",
        bankAccount: "○○銀行 本店\n普通 1234567",
      }),
    ).toEqual({
      ok: true,
      issuer: {
        companyName: "em株式会社",
        registrationNumber: "T1234567890123",
        postalCode: undefined,
        address: undefined,
        phone: undefined,
        email: undefined,
        bankAccount: "○○銀行 本店\n普通 1234567",
        note: undefined,
      },
    });
  });

  it("会社名は必須", () => {
    expect(normalizeInvoiceIssuerInput({ companyName: " " })).toEqual({ ok: false, error: "会社名を入力してください。" });
  });

  it("登録番号・郵便番号・メールアドレスの形式を検証する", () => {
    expect(normalizeInvoiceIssuerInput({ companyName: "em", registrationNumber: "1234567890123" }).ok).toBe(false);
    expect(normalizeInvoiceIssuerInput({ companyName: "em", postalCode: "12-34" }).ok).toBe(false);
    expect(normalizeInvoiceIssuerInput({ companyName: "em", email: "not-an-email" }).ok).toBe(false);
  });

  it("文字列以外や長すぎる値は弾く", () => {
    expect(normalizeInvoiceIssuerInput(null).ok).toBe(false);
    expect(normalizeInvoiceIssuerInput({ companyName: 1 }).ok).toBe(false);
    expect(normalizeInvoiceIssuerInput({ companyName: "a".repeat(101) }).ok).toBe(false);
  });
});
