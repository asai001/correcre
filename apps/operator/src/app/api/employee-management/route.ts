import { NextResponse } from "next/server";
import {
  createEmployeeInDynamo,
  deleteEmployeeInDynamo,
  getEmployeeManagementSummaryFromDynamo,
  updateEmployeeInDynamo,
} from "@operator/features/user-registration/api/server";
import type {
  CreateEmployeeInput,
  DeleteEmployeeInput,
  UpdateEmployeeInput,
} from "@operator/features/user-registration/model/types";
import { getOperatorAccessStatus } from "@operator/lib/auth/operator";

async function authorizeOperator() {
  const access = await getOperatorAccessStatus();

  if (access.allowed) {
    return null;
  }

  const status = access.reason === "unauthenticated" ? 401 : 403;
  const error = access.reason === "unauthenticated" ? "unauthorized" : "operator_only";

  return NextResponse.json({ error }, { status });
}

export async function GET(req: Request) {
  const unauthorized = await authorizeOperator();
  if (unauthorized) {
    return unauthorized;
  }

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  const adminUserId = searchParams.get("adminUserId") ?? undefined;

  if (!companyId) {
    return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  }

  try {
    const summary = await getEmployeeManagementSummaryFromDynamo(companyId, adminUserId);
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

type DeleteEmployeeRequest = DeleteEmployeeInput & {
  companyId?: string;
};

export async function POST(req: Request) {
  const unauthorized = await authorizeOperator();
  if (unauthorized) {
    return unauthorized;
  }

  let body: CreateEmployeeRequest | null = null;

  try {
    body = (await req.json()) as CreateEmployeeRequest;
  } catch (err) {
    console.error("POST /api/employee-management invalid json", err);
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body?.companyId) {
    return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  }

  try {
    const employee = await createEmployeeInDynamo(body.companyId, body);
    return NextResponse.json(employee, { status: 201 });
  } catch (err) {
    console.error("POST /api/employee-management error", err);

    if (err instanceof Error) {
      const status = err.message === "Company not found" ? 404 : 400;
      return NextResponse.json({ error: err.message }, { status });
    }

    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const unauthorized = await authorizeOperator();
  if (unauthorized) {
    return unauthorized;
  }

  let body: UpdateEmployeeRequest | null = null;

  try {
    body = (await req.json()) as UpdateEmployeeRequest;
  } catch (err) {
    console.error("PATCH /api/employee-management invalid json", err);
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body?.companyId) {
    return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  }

  try {
    const employee = await updateEmployeeInDynamo(body.companyId, body);
    return NextResponse.json(employee);
  } catch (err) {
    console.error("PATCH /api/employee-management error", err);

    if (err instanceof Error) {
      const status = err.message === "Company not found" || err.message === "Employee not found" ? 404 : 400;
      return NextResponse.json({ error: err.message }, { status });
    }

    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const unauthorized = await authorizeOperator();
  if (unauthorized) {
    return unauthorized;
  }

  let body: DeleteEmployeeRequest | null = null;

  try {
    body = (await req.json()) as DeleteEmployeeRequest;
  } catch (err) {
    console.error("DELETE /api/employee-management invalid json", err);
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body?.companyId) {
    return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  }

  try {
    await deleteEmployeeInDynamo(body.companyId, body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/employee-management error", err);

    if (err instanceof Error) {
      const status = err.message === "Company not found" || err.message === "Employee not found" ? 404 : 400;
      return NextResponse.json({ error: err.message }, { status });
    }

    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

