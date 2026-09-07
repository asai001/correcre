import { NextResponse } from "next/server";

import { isAwsCredentialError } from "@correcre/lib/aws/credentials";
import { InvalidShipmentInputError } from "@correcre/lib/shipment/tracking";

import { updateShipmentForMerchant } from "@merchant/features/exchanges/api/server";
import type { UpdateShipmentRequest } from "@merchant/features/exchanges/model/types";
import { getMerchantAccessStatus } from "@merchant/lib/auth/merchant";

const FAILED_MESSAGE = "発送情報の更新に失敗しました。時間をおいて再度お試しください。";

async function authorize() {
  const access = await getMerchantAccessStatus();

  if (access.allowed) {
    return { user: access.user, error: null as null | NextResponse };
  }

  const status = access.reason === "unauthenticated" ? 401 : 403;
  const error = access.reason === "unauthenticated" ? "unauthorized" : "merchant_only";

  return { user: null, error: NextResponse.json({ error }, { status }) };
}

type RouteParams = {
  params: Promise<{ exchangeId: string }>;
};

export async function POST(req: Request, { params }: RouteParams) {
  const { user, error } = await authorize();
  if (error) return error;

  const { exchangeId } = await params;

  let body: UpdateShipmentRequest | null = null;

  try {
    body = (await req.json()) as UpdateShipmentRequest;
  } catch (err) {
    console.error(`POST /api/exchanges/${exchangeId}/shipment invalid json`, err);
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body || typeof body.shipment !== "object" || body.shipment === null) {
    return NextResponse.json({ error: "invalid_shipment" }, { status: 400 });
  }

  try {
    const detail = await updateShipmentForMerchant({
      merchantId: user!.merchantId,
      exchangeId,
      shipment: body.shipment,
    });

    return NextResponse.json(detail);
  } catch (err) {
    console.error(`POST /api/exchanges/${exchangeId}/shipment error`, err);

    // 入力エラーは文言をそのまま画面に出す（何を直せばよいか分かるように）。
    if (err instanceof InvalidShipmentInputError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    if (isAwsCredentialError(err)) {
      return NextResponse.json({ error: FAILED_MESSAGE }, { status: 500 });
    }

    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
