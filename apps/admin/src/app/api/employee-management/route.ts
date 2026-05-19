import { NextResponse } from "next/server";
import { isAwsCredentialError } from "@correcre/lib/aws/credentials";
import { listDepartmentsByCompany } from "@correcre/lib/dynamodb/department";
import { readRequiredServerEnv } from "@correcre/lib/env/server";

import {
  createDepartmentInDynamo,
  createEmployeeInDynamo,
  getEmployeeManagementSummaryFromDynamo,
  updateEmployeeInDynamo,
} from "@admin/features/employee-management/api/server";
import type {
  CreateEmployeeInput,
  UpdateEmployeeInput,
} from "@admin/features/employee-management/model/types";
import { authorizeEmployeeManagementRequest } from "./authorize";

const USER_REGISTRATION_FAILED_MESSAGE = "ユーザー登録に失敗しました。時間をおいて再度お試しください。";

async function ensureDepartmentExists(companyId: string, departmentName?: string) {
  const normalizedDepartmentName = departmentName?.trim();

  if (!normalizedDepartmentName) {
    return;
  }

  const departments = await listDepartmentsByCompany(
    {
      region: readRequiredServerEnv("AWS_REGION"),
      tableName: readRequiredServerEnv("DDB_DEPARTMENT_TABLE_NAME"),
    },
    companyId,
  );

  const existingDepartment = departments.find((department) => department.name === normalizedDepartmentName);

  if (!existingDepartment) {
    await createDepartmentInDynamo(companyId, { name: normalizedDepartmentName });
    return;
  }

  if (existingDepartment.status === "INACTIVE") {
    throw new Error("現在の所属部署が無効化されています。部署管理を確認してください");
  }
}

export async function GET() {
  try {
    const { unauthorized, currentAdminUser } = await authorizeEmployeeManagementRequest();
    if (unauthorized || !currentAdminUser) {
      return unauthorized;
    }

    const summary = await getEmployeeManagementSummaryFromDynamo(
      currentAdminUser.companyId,
      currentAdminUser.userId,
    );
    return NextResponse.json(summary);
  } catch (err) {
    console.error("GET /api/employee-management error", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

type CreateEmployeeRequest = CreateEmployeeInput & {
  companyId?: string;
};

type UpdateEmployeeRequest = UpdateEmployeeInput & {
  companyId?: string;
};

export async function POST(req: Request) {
  let body: CreateEmployeeRequest | null = null;

  try {
    const { unauthorized, currentAdminUser } = await authorizeEmployeeManagementRequest();
    if (unauthorized || !currentAdminUser) {
      return unauthorized;
    }

    body = (await req.json()) as CreateEmployeeRequest;
    await ensureDepartmentExists(currentAdminUser.companyId, body.departmentName);
    const employee = await createEmployeeInDynamo(currentAdminUser.companyId, body);
    return NextResponse.json(employee, { status: 201 });
  } catch (err) {
    if (err instanceof SyntaxError) {
      console.error("POST /api/employee-management invalid json", err);
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    console.error("POST /api/employee-management error", err);

    if (isAwsCredentialError(err)) {
      return NextResponse.json({ error: USER_REGISTRATION_FAILED_MESSAGE }, { status: 500 });
    }

    if (err instanceof Error) {
      const status = err.message === "Company not found" ? 404 : 400;
      return NextResponse.json({ error: err.message }, { status });
    }

    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  let body: UpdateEmployeeRequest | null = null;

  try {
    const { unauthorized, currentAdminUser } = await authorizeEmployeeManagementRequest();
    if (unauthorized || !currentAdminUser) {
      return unauthorized;
    }

    body = (await req.json()) as UpdateEmployeeRequest;
    await ensureDepartmentExists(currentAdminUser.companyId, body.departmentName);
    const employee = await updateEmployeeInDynamo(currentAdminUser.companyId, body);
    return NextResponse.json(employee);
  } catch (err) {
    if (err instanceof SyntaxError) {
      console.error("PATCH /api/employee-management invalid json", err);
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    console.error("PATCH /api/employee-management error", err);

    if (isAwsCredentialError(err)) {
      return NextResponse.json({ error: USER_REGISTRATION_FAILED_MESSAGE }, { status: 500 });
    }

    if (err instanceof Error) {
      const status = err.message === "Company not found" || err.message === "Employee not found" ? 404 : 400;
      return NextResponse.json({ error: err.message }, { status });
    }

    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const { unauthorized } = await authorizeEmployeeManagementRequest();
    if (unauthorized) {
      return unauthorized;
    }
  } catch (err) {
    console.error("DELETE /api/employee-management error", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }

  return NextResponse.json({ error: "operator_only" }, { status: 403 });
}
