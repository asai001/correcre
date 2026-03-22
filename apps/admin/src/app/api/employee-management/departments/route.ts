import { NextResponse } from "next/server";
import {
  createDepartmentInDynamoMock,
  deleteDepartmentInDynamoMock,
  renameDepartmentInDynamoMock,
} from "@admin/features/employee-management/api/server.mock";
import type { CreateDepartmentInput, RenameDepartmentInput } from "@admin/features/employee-management/model/types";

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
    body = (await req.json()) as CreateDepartmentRequest;
  } catch (err) {
    console.error("POST /api/employee-management/departments invalid json", err);
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body?.companyId) {
    return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  }

  try {
    await createDepartmentInDynamoMock(body.companyId, { name: body.name });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
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
    body = (await req.json()) as RenameDepartmentRequest;
  } catch (err) {
    console.error("PATCH /api/employee-management/departments invalid json", err);
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body?.companyId) {
    return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  }

  try {
    await renameDepartmentInDynamoMock(body.companyId, {
      currentName: body.currentName,
      nextName: body.nextName,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
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
    body = (await req.json()) as DeleteDepartmentRequest;
  } catch (err) {
    console.error("DELETE /api/employee-management/departments invalid json", err);
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body?.companyId) {
    return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  }

  if (!body.name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  try {
    await deleteDepartmentInDynamoMock(body.companyId, body.name);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/employee-management/departments error", err);

    if (err instanceof Error) {
      const status = err.message === "Company not found" ? 404 : 400;
      return NextResponse.json({ error: err.message }, { status });
    }

    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
