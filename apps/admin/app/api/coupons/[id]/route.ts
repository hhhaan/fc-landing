import { NextResponse } from "next/server";
import { disableCoupon } from "@/shared/api/coupons/server";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const body = (await req.json().catch(() => ({}))) as { action?: string };
    if (body.action !== "disable") {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
    const coupon = await disableCoupon(id);
    return NextResponse.json(coupon);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[api/coupons/[id] PATCH]", message, err);
    const status =
      message.includes("not found") ||
      message.includes("Cannot disable") ||
      message.includes("redeemed")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
