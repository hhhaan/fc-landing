import { NextResponse } from "next/server";
import { jsonOk } from "@/shared/lib/api-handler";
import {
  createCouponBatch,
  listCoupons,
} from "@/shared/api/coupons/server";
import type { CreateCouponsInput } from "@/shared/api/coupons/types";

export async function GET() {
  return jsonOk(() => listCoupons());
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CreateCouponsInput;
    const created = await createCouponBatch(body);
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[api/coupons POST]", message, err);
    const status =
      message.includes("must be") ||
      message.includes("required") ||
      message.includes("invalid")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
