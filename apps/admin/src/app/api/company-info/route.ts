import { NextResponse } from "next/server";
import { isAwsCredentialError } from "@correcre/lib/aws/credentials";
import { updateCompanyInDynamo } from "@correcre/lib/company-management-server";
import type { UpdateCompanyInput } from "@correcre/lib/company-management-types";
import { getCompanyById, putCompany } from "@correcre/lib/dynamodb/company";
import { readRequiredServerEnv } from "@correcre/lib/env/server";
import type { Company } from "@correcre/types";

import type { UpdateAdminCompanyInfoInput } from "@admin/features/info/model/types";
import { authorizeEmployeeManagementRequest } from "../employee-management/authorize";

const COMPANY_INFO_UPDATE_FAILED_MESSAGE = "各種情報の更新に失敗しました。時間をおいて再度お試しください。";

function normalizeOptionalText(value?: string) {
  const normalizedValue = value?.trim();
  return normalizedValue ? normalizedValue : undefined;
}

function normalizePointConversionRate(value?: number | null) {
  if (value == null) {
    return undefined;
  }

  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("ポイント換算レートは 0 より大きい数値で入力してください");
  }

  return value;
}

export async function PATCH(req: Request) {
  try {
    const { unauthorized, currentAdminUser } = await authorizeEmployeeManagementRequest();
    if (unauthorized || !currentAdminUser) {
      return unauthorized;
    }

    const body = (await req.json()) as UpdateAdminCompanyInfoInput;
    const region = readRequiredServerEnv("AWS_REGION");
    const tableName = readRequiredServerEnv("DDB_COMPANY_TABLE_NAME");
    const companyId = currentAdminUser.companyId;
    const baseCompanyInput: UpdateCompanyInput = {
      companyId,
      name: body.name,
      status: body.status,
      plan: body.plan,
      perEmployeeMonthlyFee: body.perEmployeeMonthlyFee,
      companyPointBalance: body.companyPointBalance,
      pointUnitLabel: body.pointUnitLabel,
      philosophyItems: body.philosophyItems,
    };

    await updateCompanyInDynamo(companyId, baseCompanyInput);

    const company = await getCompanyById({ region, tableName }, companyId);

    if (!company) {
      throw new Error("Company not found");
    }

    const updatedAt = new Date().toISOString();
    const updatedCompany: Company = {
      ...company,
      shortName: normalizeOptionalText(body.shortName),
      contactName: normalizeOptionalText(body.contactName),
      contactEmail: normalizeOptionalText(body.contactEmail),
      contactPhone: normalizeOptionalText(body.contactPhone),
      billingEmail: normalizeOptionalText(body.billingEmail),
      logoImageUrl: normalizeOptionalText(body.logoImageUrl),
      primaryColor: normalizeOptionalText(body.primaryColor),
      pointConversionRate: normalizePointConversionRate(body.pointConversionRate),
      address: normalizeOptionalText(body.address),
      representativeName: normalizeOptionalText(body.representativeName),
      representativePhone: normalizeOptionalText(body.representativePhone),
      representativeEmail: normalizeOptionalText(body.representativeEmail),
      updatedAt,
    };

    await putCompany({ region, tableName }, updatedCompany);

    return NextResponse.json({ ok: true, updatedAt });
  } catch (err) {
    console.error("PATCH /api/company-info error", err);

    if (isAwsCredentialError(err)) {
      return NextResponse.json({ error: COMPANY_INFO_UPDATE_FAILED_MESSAGE }, { status: 500 });
    }

    if (err instanceof SyntaxError) {
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: err.message === "Company not found" ? 404 : 400 });
    }

    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
