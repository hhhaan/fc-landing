import { NextResponse } from "next/server";
import { issueCoupon } from "@/shared/api/coupons/server";
import type { IssueCouponInput } from "@/shared/api/coupons/types";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as IssueCouponInput;
    const coupon = await issueCoupon(body.id);
    return NextResponse.json(coupon);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[api/coupons/issue]", message, err);
    const status =
      message.includes("No idle") ||
      message.includes("not found") ||
      message.includes("expected idle")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
