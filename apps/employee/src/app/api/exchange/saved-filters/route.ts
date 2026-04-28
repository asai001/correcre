import { NextResponse } from "next/server";

import { isAwsCredentialError } from "@correcre/lib/aws/credentials";

import {
  createSavedFilterForEmployee,
  normalizeSavedFilterCriteria,
} from "@employee/features/exchange-favorite/api/server";
import { requireCurrentEmployeeUser } from "@employee/lib/auth/current-user";

export const dynamic = "force-dynamic";

type PostBody = {
  name?: unknown;
  criteria?: unknown;
};

export async function POST(req: Request) {
  try {
    const user = await requireCurrentEmployeeUser();

    let body: PostBody | null = null;
    try {
      body = (await req.json()) as PostBody;
    } catch {
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "保存条件の名前を入力してください" }, { status: 400 });
    }

    const criteria = normalizeSavedFilterCriteria(body?.criteria);

    const result = await createSavedFilterForEmployee({
      companyId: user.companyId,
      userId: user.userId,
      name,
      criteria,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error("POST /api/exchange/saved-filters error", err);
    if (isAwsCredentialError(err)) {
      return NextResponse.json({ error: "internal_error" }, { status: 500 });
    }
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
