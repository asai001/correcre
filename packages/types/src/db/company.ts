import type { AnalysisThresholds } from "../analysis";

type CompanyItemStatus = "ACTIVE" | "INACTIVE" | "TRIAL";
type CompanyPlan = "TRIAL" | "STANDARD" | "ENTERPRISE";

export type CompanyMonthlyBillingSnapshot = {
  month: string; // YYYY-MM
  status: CompanyItemStatus;
  activeEmployees: number;
  // 月額基本料（円）。この項目が追加される前のスナップショットには存在しない（＝基本料なし）。
  monthlyBaseFee?: number;
  perEmployeeMonthlyFee: number;
  // 月額利用料（円）＝ 月額基本料 + 利用人数 × 月額単価。無効の月は 0。
  monthlyIncomeYen: number;
  capturedAt: string;
};

export type CompanyPhilosophyValue = {
  title: string;
  description?: string;
};

export type CompanyPhilosophyEntry = {
  label: string;
  content: string;
  displayOnDashboard: boolean;
  order: number;
};

export type CompanyPhilosophy = {
  entries?: Record<string, CompanyPhilosophyEntry>;

  // Legacy fields kept for backward compatibility with older dashboard renderers.
  corporatePhilosophy?: string;
  purpose?: string;
  mission?: string;
  vision?: string;
  values?: CompanyPhilosophyValue[];
  creed?: string[];
  updatedAt?: string;
};

export type Company = {
  companyId: string;
  name: string;
  shortName?: string;
  kanaName?: string;

  // Contract and operating status.
  status: CompanyItemStatus;
  plan: CompanyPlan;
  trialEndsAt?: string; // ISO or YYYY-MM-DD
  contractStartsAt?: string;
  contractEndsAt?: string;
  // 月額基本料（円）。利用人数に関係なく毎月かかるシステム利用料。未設定は 0 円。
  monthlyBaseFee?: number;
  // 従業員 1 人あたりの月額単価（ID 料金, 円）。ミッション報酬ポイントの算出にも使う。
  perEmployeeMonthlyFee: number;

  // Contact information.
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  billingEmail?: string;

  // Company address and representative information.
  address?: string;
  representativeName?: string;
  representativePhone?: string;
  representativeEmail?: string;

  // Company point balance.
  companyPointBalance: number;

  // Employee counts.
  totalEmployees?: number;
  activeEmployees: number;
  monthlyBillingSnapshots?: Record<string, CompanyMonthlyBillingSnapshot>;

  // Settings and presentation.
  pointExpirationMonths?: number;
  pointConversionRate?: number;
  pointUnitLabel?: string;
  timezone?: string;
  locale?: string;
  logoImageUrl?: string;
  primaryColor?: string;
  allowedEmailDomains?: string[];
  showPointExchangeLink?: boolean;
  philosophy?: CompanyPhilosophy;
  // 項目分析の閾値の企業既定値。未設定ならシステム既定値（80% / 40%）を使う。
  // ミッション側に設定があればそちらが優先される。
  analysisThresholds?: AnalysisThresholds;

  createdAt: string;
  updatedAt: string;
};
