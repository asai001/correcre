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
    // 未指定のフィールドは updateCompanyInDynamo 側で既存値が維持される。
    // 保有ポイント（companyPointBalance）は管理者画面では管理しないため送らず、
    // 従業員へのポイント付与などの残高更新を巻き戻さないようにする。
    const baseCompanyInput: UpdateCompanyInput = {
      companyId,
      name: body.name,
      status: body.status,
      plan: body.plan,
      perEmployeeMonthlyFee: body.perEmployeeMonthlyFee,
      pointUnitLabel: body.pointUnitLabel,
      philosophyItems: body.philosophyItems,
    };

    await updateCompanyInDynamo(companyId, baseCompanyInput);

    // 詳細情報（連絡先・代表者・billing など）は、リクエストボディにキーが含まれるフィールドのみ更新し、
    // 含まれないフィールドは既存値を維持する。これにより、詳細情報を管理しないタブ（理念体系など）の
    // 保存で詳細情報が巻き戻る問題を防ぐ。
    const detailKeys = [
      "shortName",
      "contactName",
      "contactEmail",
      "contactPhone",
      "billingEmail",
      "logoImageUrl",
      "primaryColor",
      "pointConversionRate",
      "address",
      "representativeName",
      "representativePhone",
      "representativeEmail",
    ] as const;
    const hasDetailUpdate = detailKeys.some((key) => key in body);

    const updatedAt = new Date().toISOString();

    if (hasDetailUpdate) {
      const company = await getCompanyById({ region, tableName }, companyId);

      if (!company) {
        throw new Error("Company not found");
      }

      const updatedCompany: Company = {
        ...company,
        shortName: "shortName" in body ? normalizeOptionalText(body.shortName) : company.shortName,
        contactName: "contactName" in body ? normalizeOptionalText(body.contactName) : company.contactName,
        contactEmail: "contactEmail" in body ? normalizeOptionalText(body.contactEmail) : company.contactEmail,
        contactPhone: "contactPhone" in body ? normalizeOptionalText(body.contactPhone) : company.contactPhone,
        billingEmail: "billingEmail" in body ? normalizeOptionalText(body.billingEmail) : company.billingEmail,
        logoImageUrl: "logoImageUrl" in body ? normalizeOptionalText(body.logoImageUrl) : company.logoImageUrl,
        primaryColor: "primaryColor" in body ? normalizeOptionalText(body.primaryColor) : company.primaryColor,
        pointConversionRate:
          "pointConversionRate" in body
            ? normalizePointConversionRate(body.pointConversionRate)
            : company.pointConversionRate,
        address: "address" in body ? normalizeOptionalText(body.address) : company.address,
        representativeName:
          "representativeName" in body ? normalizeOptionalText(body.representativeName) : company.representativeName,
        representativePhone:
          "representativePhone" in body ? normalizeOptionalText(body.representativePhone) : company.representativePhone,
        representativeEmail:
          "representativeEmail" in body ? normalizeOptionalText(body.representativeEmail) : company.representativeEmail,
        updatedAt,
      };

      await putCompany({ region, tableName }, updatedCompany);
    }

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
