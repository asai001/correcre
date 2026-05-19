import { NextResponse } from "next/server";

import { isAwsCredentialError } from "@correcre/lib/aws/credentials";

import { createMerchandiseImageViewUrlForMerchant, getMerchandiseForMerchant } from "@merchant/features/merchandise/api/server";
import { requireCurrentMerchantUser } from "@merchant/lib/auth/merchant";

export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{ merchandiseId: string }>;
};

export async function GET(req: Request, { params }: RouteParams) {
  try {
    const user = await requireCurrentMerchantUser();
    const { merchandiseId } = await params;
    const url = new URL(req.url);
    const target = (url.searchParams.get("target") ?? "card").toLowerCase();

    if (target !== "card" && target !== "detail") {
      return NextResponse.json({ error: "target は card か detail を指定してください" }, { status: 400 });
    }

    const merchandise = await getMerchandiseForMerchant(user.merchantId, merchandiseId);
    if (!merchandise) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const imageRef = target === "card" ? merchandise.cardImage : merchandise.detailImage;
    if (!imageRef) {
      return NextResponse.json({ error: "image_not_set" }, { status: 404 });
    }

    const result = await createMerchandiseImageViewUrlForMerchant(user.merchantId, imageRef.s3Key);
    return NextResponse.json(result);
  } catch (err) {
    console.error("GET /api/merchandise/[merchandiseId]/image-view-url error", err);
    if (isAwsCredentialError(err)) {
      return NextResponse.json({ error: "internal_error" }, { status: 500 });
    }
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
