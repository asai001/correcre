type CompanyItemStatus = "ACTIVE" | "INACTIVE" | "TRIAL";
type CompanyPlan = "TRIAL" | "STANDARD" | "ENTERPRISE";

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

  // Settings and presentation.
  pointExpirationMonths?: number;
  pointConversionRate?: number;
  pointUnitLabel?: string;
  timezone?: string;
  locale?: string;
  logoImageUrl?: string;
  primaryColor?: string;
  allowedEmailDomains?: string[];
  philosophy?: CompanyPhilosophy;

  createdAt: string;
  updatedAt: string;
};
