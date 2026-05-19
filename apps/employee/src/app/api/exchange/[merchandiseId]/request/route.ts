import { NextResponse } from "next/server";

import { isAwsCredentialError } from "@correcre/lib/aws/credentials";
import { InsufficientPointBalanceError } from "@correcre/lib/dynamodb/exchange-history";

import {
  MerchandiseUnavailableError,
  requestExchangeForEmployee,
} from "@employee/features/exchange/api/server";
import { requireCurrentEmployeeUser } from "@employee/lib/auth/current-user";

export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{ merchandiseId: string }>;
};

type RequestBody = {
  merchantId?: unknown;
};

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const user = await requireCurrentEmployeeUser();
    const { merchandiseId } = await params;

    let body: RequestBody | null = null;
    try {
      body = (await req.json()) as RequestBody;
    } catch (err) {
      console.error("POST /api/exchange/[merchandiseId]/request invalid json", err);
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    const merchantId = typeof body?.merchantId === "string" ? body.merchantId.trim() : "";
    if (!merchantId) {
      return NextResponse.json({ error: "merchantId は必須です" }, { status: 400 });
    }

    const result = await requestExchangeForEmployee({
      companyId: user.companyId,
      userId: user.userId,
      merchantId,
      merchandiseId,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof InsufficientPointBalanceError) {
      return NextResponse.json(
        { error: "insufficient_point_balance", message: err.message },
        { status: 400 },
      );
    }

    if (err instanceof MerchandiseUnavailableError) {
      return NextResponse.json(
        { error: "merchandise_unavailable", message: err.message },
        { status: 400 },
      );
    }

    console.error("POST /api/exchange/[merchandiseId]/request error", err);

    if (isAwsCredentialError(err)) {
      return NextResponse.json({ error: "internal_error" }, { status: 500 });
    }

    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
