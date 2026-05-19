import { NextResponse } from "next/server";

import {
  createCompanyInDynamo,
  listOperatorCompaniesFromDynamo,
  updateCompanyInDynamo,
} from "@correcre/lib/company-management-server";
import type { CreateCompanyInput, UpdateCompanyInput } from "@correcre/lib/company-management-types";
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

export async function GET() {
  const unauthorized = await authorizeOperator();
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const companies = await listOperatorCompaniesFromDynamo();
    return NextResponse.json(companies);
  } catch (err) {
    console.error("GET /api/companies error", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const unauthorized = await authorizeOperator();
  if (unauthorized) {
    return unauthorized;
  }

  let body: CreateCompanyInput | null = null;

  try {
    body = (await req.json()) as CreateCompanyInput;
  } catch (err) {
    console.error("POST /api/companies invalid json", err);
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  try {
    const company = await createCompanyInDynamo(body);
    return NextResponse.json(company, { status: 201 });
  } catch (err) {
    console.error("POST /api/companies error", err);

    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const unauthorized = await authorizeOperator();
  if (unauthorized) {
    return unauthorized;
  }

  let body: UpdateCompanyInput | null = null;

  try {
    body = (await req.json()) as UpdateCompanyInput;
  } catch (err) {
    console.error("PATCH /api/companies invalid json", err);
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body?.companyId) {
    return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  }

  try {
    const company = await updateCompanyInDynamo(body.companyId, body);
    return NextResponse.json(company);
  } catch (err) {
    console.error("PATCH /api/companies error", err);

    if (err instanceof Error) {
      const status = err.message === "Company not found" ? 404 : 400;
      return NextResponse.json({ error: err.message }, { status });
    }

    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
