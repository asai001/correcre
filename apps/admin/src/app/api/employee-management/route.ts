import { NextResponse } from "next/server";
import {
  createEmployeeInDynamo,
  deleteEmployeeInDynamo,
  getEmployeeManagementSummaryFromDynamo,
  updateEmployeeInDynamo,
} from "@admin/features/employee-management/api/server";
import type {
  CreateEmployeeInput,
  DeleteEmployeeInput,
  UpdateEmployeeInput,
} from "@admin/features/employee-management/model/types";
import { authorizeEmployeeManagementRequest } from "./authorize";

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

type DeleteEmployeeRequest = DeleteEmployeeInput & {
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
    const employee = await createEmployeeInDynamo(currentAdminUser.companyId, body);
    return NextResponse.json(employee, { status: 201 });
  } catch (err) {
    if (err instanceof SyntaxError) {
      console.error("POST /api/employee-management invalid json", err);
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

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
    const { unauthorized, currentAdminUser } = await authorizeEmployeeManagementRequest();
    if (unauthorized || !currentAdminUser) {
      return unauthorized;
    }

    body = (await req.json()) as UpdateEmployeeRequest;
    const employee = await updateEmployeeInDynamo(currentAdminUser.companyId, body);
    return NextResponse.json(employee);
  } catch (err) {
    if (err instanceof SyntaxError) {
      console.error("PATCH /api/employee-management invalid json", err);
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

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
    const { unauthorized, currentAdminUser } = await authorizeEmployeeManagementRequest();
    if (unauthorized || !currentAdminUser) {
      return unauthorized;
    }

    body = (await req.json()) as DeleteEmployeeRequest;
    await deleteEmployeeInDynamo(currentAdminUser.companyId, body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof SyntaxError) {
      console.error("DELETE /api/employee-management invalid json", err);
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    console.error("DELETE /api/employee-management error", err);

    if (err instanceof Error) {
      const status = err.message === "Company not found" || err.message === "Employee not found" ? 404 : 400;
      return NextResponse.json({ error: err.message }, { status });
    }

    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
