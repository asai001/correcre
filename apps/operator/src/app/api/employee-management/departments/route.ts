import { NextResponse } from "next/server";
import { isAwsCredentialError } from "@correcre/lib/aws/credentials";
import {
  createDepartmentInDynamo,
  deleteDepartmentInDynamo,
  renameDepartmentInDynamo,
} from "@operator/features/user-registration/api/server";
import type { CreateDepartmentInput, RenameDepartmentInput } from "@operator/features/user-registration/model/types";
import { getOperatorAccessStatus } from "@operator/lib/auth/operator";

const DEPARTMENT_MUTATION_FAILED_MESSAGE = "部署の更新に失敗しました。時間をおいて再度お試しください。";

async function authorizeOperator() {
  const access = await getOperatorAccessStatus();

  if (access.allowed) {
    return null;
  }

  const status = access.reason === "unauthenticated" ? 401 : 403;
  const error = access.reason === "unauthenticated" ? "unauthorized" : "operator_only";

  return NextResponse.json({ error }, { status });
}

type DepartmentRequestBase = {
  companyId?: string;
};

type CreateDepartmentRequest = DepartmentRequestBase & CreateDepartmentInput;
type RenameDepartmentRequest = DepartmentRequestBase & RenameDepartmentInput;
type DeleteDepartmentRequest = DepartmentRequestBase & {
  name?: string;
};

export async function POST(req: Request) {
  const unauthorized = await authorizeOperator();
  if (unauthorized) {
    return unauthorized;
  }

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
    await createDepartmentInDynamo(body.companyId, { name: body.name });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error("POST /api/employee-management/departments error", err);

    if (isAwsCredentialError(err)) {
      return NextResponse.json({ error: DEPARTMENT_MUTATION_FAILED_MESSAGE }, { status: 500 });
    }

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
    await renameDepartmentInDynamo(body.companyId, {
      currentName: body.currentName,
      nextName: body.nextName,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/employee-management/departments error", err);

    if (isAwsCredentialError(err)) {
      return NextResponse.json({ error: DEPARTMENT_MUTATION_FAILED_MESSAGE }, { status: 500 });
    }

    if (err instanceof Error) {
      const status = err.message === "Company not found" ? 404 : 400;
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
    await deleteDepartmentInDynamo(body.companyId, body.name);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/employee-management/departments error", err);

    if (isAwsCredentialError(err)) {
      return NextResponse.json({ error: DEPARTMENT_MUTATION_FAILED_MESSAGE }, { status: 500 });
    }

    if (err instanceof Error) {
      const status = err.message === "Company not found" ? 404 : 400;
      return NextResponse.json({ error: err.message }, { status });
    }

    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
