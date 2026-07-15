import "server-only";
import { randomUUID } from "crypto";
import { getAdminClient } from "@/shared/lib/supabase/admin";
import {
  createPolarDiscount,
  deletePolarDiscount,
  generateCouponCode,
  getPolarDiscount,
} from "@/shared/lib/polar/discounts";
import type {
  CouponStatus,
  CouponsListResponse,
  CreateCouponsInput,
  PolarCoupon,
} from "./types";

type CouponRow = PolarCoupon;

function asCoupon(row: CouponRow): PolarCoupon {
  return {
    ...row,
    type: row.type as PolarCoupon["type"],
    duration: row.duration as PolarCoupon["duration"],
    status: row.status as CouponStatus,
  };
}

function emptyCounts(): Record<CouponStatus, number> {
  return { idle: 0, issued: 0, redeemed: 0, disabled: 0 };
}

export async function listCoupons(): Promise<CouponsListResponse> {
  const sb = getAdminClient();
  const { data, error } = await sb
    .from("polar_coupons")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) throw error;

  let coupons = (data ?? []).map((r) => asCoupon(r as CouponRow));

  // Sync redemptions for open codes (issued only — idle not distributed yet)
  const open = coupons.filter((c) => c.status === "issued");
  if (open.length > 0) {
    const now = new Date().toISOString();
    await Promise.all(
      open.slice(0, 30).map(async (c) => {
        try {
          const d = await getPolarDiscount(c.polar_discount_id);
          if (d.redemptions_count <= c.redemptions_count) return;
          const redeemed = d.redemptions_count >= 1;
          const patch = {
            redemptions_count: d.redemptions_count,
            status: redeemed ? ("redeemed" as const) : c.status,
            redeemed_at: redeemed ? (c.redeemed_at ?? now) : c.redeemed_at,
            updated_at: now,
          };
          await sb.from("polar_coupons").update(patch).eq("id", c.id);
          Object.assign(c, patch);
        } catch (err) {
          console.error("[coupons] sync redeem", c.id, err);
        }
      }),
    );
  }

  const counts = emptyCounts();
  for (const c of coupons) {
    counts[c.status] = (counts[c.status] ?? 0) + 1;
  }

  return { coupons, counts };
}

export async function createCouponBatch(
  input: CreateCouponsInput,
): Promise<PolarCoupon[]> {
  const count = Math.floor(input.count);
  if (!Number.isFinite(count) || count < 1 || count > 50) {
    throw new Error("count must be 1–50");
  }
  if (!input.name?.trim()) throw new Error("name is required");
  if (input.type === "percentage") {
    if (input.basis_points == null || input.basis_points < 1 || input.basis_points > 10000) {
      throw new Error("basis_points must be 1–10000");
    }
  } else if (input.type === "fixed") {
    if (input.amount_cents == null || input.amount_cents < 1) {
      throw new Error("amount_cents must be >= 1");
    }
  } else {
    throw new Error("type must be percentage or fixed");
  }
  if (!["once", "forever", "repeating"].includes(input.duration)) {
    throw new Error("invalid duration");
  }
  if (input.duration === "repeating") {
    if (!input.duration_in_months || input.duration_in_months < 1) {
      throw new Error("duration_in_months required for repeating");
    }
  }

  const sb = getAdminClient();
  const batchId = randomUUID();
  const created: PolarCoupon[] = [];

  for (let i = 0; i < count; i++) {
    let code = generateCouponCode();
    let polar;
    let attempts = 0;
    while (attempts < 5) {
      attempts++;
      try {
        polar = await createPolarDiscount({
          name: input.name.trim(),
          code,
          type: input.type,
          duration: input.duration,
          duration_in_months: input.duration_in_months,
          basis_points: input.basis_points,
          amount_cents: input.amount_cents,
          currency: input.currency ?? "usd",
          max_redemptions: 1,
        });
        break;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("409") || msg.toLowerCase().includes("already") || msg.includes("unique")) {
          code = generateCouponCode();
          continue;
        }
        throw err;
      }
    }
    if (!polar) throw new Error("Failed to create Polar discount after retries");

    const row = {
      code,
      polar_discount_id: polar.id,
      name: input.name.trim(),
      type: input.type,
      basis_points: input.type === "percentage" ? (input.basis_points ?? null) : null,
      amount_cents: input.type === "fixed" ? (input.amount_cents ?? null) : null,
      currency: input.currency ?? "usd",
      duration: input.duration,
      duration_in_months:
        input.duration === "repeating" ? (input.duration_in_months ?? null) : null,
      max_redemptions: 1,
      redemptions_count: 0,
      status: "idle" as const,
      batch_id: batchId,
      note: input.note?.trim() || null,
    };

    const { data, error } = await sb
      .from("polar_coupons")
      .insert(row)
      .select("*")
      .single();

    if (error) {
      // best-effort cleanup on Polar
      try {
        await deletePolarDiscount(polar.id);
      } catch {
        /* ignore */
      }
      throw error;
    }

    created.push(asCoupon(data as CouponRow));
  }

  return created;
}

export async function issueCoupon(id?: string): Promise<PolarCoupon> {
  const sb = getAdminClient();
  const now = new Date().toISOString();

  if (id) {
    const { data: existing, error: fetchErr } = await sb
      .from("polar_coupons")
      .select("*")
      .eq("id", id)
      .single();
    if (fetchErr) throw fetchErr;
    if (!existing) throw new Error("Coupon not found");
    if (existing.status !== "idle") {
      throw new Error(`Coupon is ${existing.status}, expected idle`);
    }
    const { data, error } = await sb
      .from("polar_coupons")
      .update({ status: "issued", issued_at: now, updated_at: now })
      .eq("id", id)
      .eq("status", "idle")
      .select("*")
      .single();
    if (error) throw error;
    return asCoupon(data as CouponRow);
  }

  // Oldest idle
  const { data: next, error: nextErr } = await sb
    .from("polar_coupons")
    .select("*")
    .eq("status", "idle")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (nextErr) throw nextErr;
  if (!next) throw new Error("No idle coupons available");

  const { data, error } = await sb
    .from("polar_coupons")
    .update({ status: "issued", issued_at: now, updated_at: now })
    .eq("id", next.id)
    .eq("status", "idle")
    .select("*")
    .single();

  if (error) throw error;
  return asCoupon(data as CouponRow);
}

export async function disableCoupon(id: string): Promise<PolarCoupon> {
  const sb = getAdminClient();
  const { data: existing, error: fetchErr } = await sb
    .from("polar_coupons")
    .select("*")
    .eq("id", id)
    .single();
  if (fetchErr) throw fetchErr;
  if (!existing) throw new Error("Coupon not found");
  if (existing.status === "disabled") {
    return asCoupon(existing as CouponRow);
  }
  if (existing.status === "redeemed") {
    throw new Error("Cannot disable a redeemed coupon");
  }

  try {
    await deletePolarDiscount(existing.polar_discount_id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // 404 already gone — ok
    if (!msg.includes("404")) throw err;
  }

  const now = new Date().toISOString();
  const { data, error } = await sb
    .from("polar_coupons")
    .update({ status: "disabled", disabled_at: now, updated_at: now })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return asCoupon(data as CouponRow);
}
