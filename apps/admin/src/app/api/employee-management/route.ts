import { NextResponse } from "next/server";
import {
  createEmployeeInDynamoMock,
  deleteEmployeeInDynamoMock,
  getEmployeeManagementSummaryFromDynamoMock,
  updateEmployeeInDynamoMock,
} from "@admin/features/employee-management/api/server.mock";
import type {
  CreateEmployeeInput,
  DeleteEmployeeInput,
  UpdateEmployeeInput,
} from "@admin/features/employee-management/model/types";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  const adminUserId = searchParams.get("adminUserId") ?? undefined;

  if (!companyId) {
    return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  }

  try {
    const summary = await getEmployeeManagementSummaryFromDynamoMock(companyId, adminUserId);
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
    const employee = await createEmployeeInDynamoMock(body.companyId, body);
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
    const employee = await updateEmployeeInDynamoMock(body.companyId, body);
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
    await deleteEmployeeInDynamoMock(body.companyId, body);
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
