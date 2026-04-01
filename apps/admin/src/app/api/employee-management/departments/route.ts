import { NextResponse } from "next/server";
import {
  createDepartmentInDynamo,
  deleteDepartmentInDynamo,
  renameDepartmentInDynamo,
} from "@admin/features/employee-management/api/server";
import type { CreateDepartmentInput, RenameDepartmentInput } from "@admin/features/employee-management/model/types";
import { authorizeEmployeeManagementRequest } from "../authorize";

type DepartmentRequestBase = {
  companyId?: string;
};

type CreateDepartmentRequest = DepartmentRequestBase & CreateDepartmentInput;
type RenameDepartmentRequest = DepartmentRequestBase & RenameDepartmentInput;
type DeleteDepartmentRequest = DepartmentRequestBase & {
  name?: string;
};

export async function POST(req: Request) {
  let body: CreateDepartmentRequest | null = null;

  try {
    const { unauthorized, currentAdminUser } = await authorizeEmployeeManagementRequest();
    if (unauthorized || !currentAdminUser) {
      return unauthorized;
    }

    body = (await req.json()) as CreateDepartmentRequest;
    await createDepartmentInDynamo(currentAdminUser.companyId, { name: body.name });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    if (err instanceof SyntaxError) {
      console.error("POST /api/employee-management/departments invalid json", err);
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    console.error("POST /api/employee-management/departments error", err);

    if (err instanceof Error) {
      const status = err.message === "Company not found" ? 404 : 400;
      return NextResponse.json({ error: err.message }, { status });
    }

    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  let body: RenameDepartmentRequest | null = null;

  try {
    const { unauthorized, currentAdminUser } = await authorizeEmployeeManagementRequest();
    if (unauthorized || !currentAdminUser) {
      return unauthorized;
    }

    body = (await req.json()) as RenameDepartmentRequest;
    await renameDepartmentInDynamo(currentAdminUser.companyId, {
      currentName: body.currentName,
      nextName: body.nextName,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof SyntaxError) {
      console.error("PATCH /api/employee-management/departments invalid json", err);
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    console.error("PATCH /api/employee-management/departments error", err);

    if (err instanceof Error) {
      const status = err.message === "Company not found" ? 404 : 400;
      return NextResponse.json({ error: err.message }, { status });
    }

    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  let body: DeleteDepartmentRequest | null = null;

  try {
    const { unauthorized, currentAdminUser } = await authorizeEmployeeManagementRequest();
    if (unauthorized || !currentAdminUser) {
      return unauthorized;
    }

    body = (await req.json()) as DeleteDepartmentRequest;
    if (!body.name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    await deleteDepartmentInDynamo(currentAdminUser.companyId, body.name);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof SyntaxError) {
      console.error("DELETE /api/employee-management/departments invalid json", err);
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    console.error("DELETE /api/employee-management/departments error", err);

    if (err instanceof Error) {
      const status = err.message === "Company not found" ? 404 : 400;
      return NextResponse.json({ error: err.message }, { status });
    }

    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
