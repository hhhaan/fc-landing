import "server-only";
import { randomBytes } from "crypto";

export type PolarDiscountDuration = "once" | "forever" | "repeating";
export type PolarDiscountType = "percentage" | "fixed";

export type PolarDiscount = {
  id: string;
  name: string;
  code: string | null;
  type: PolarDiscountType;
  duration: PolarDiscountDuration;
  duration_in_months?: number | null;
  basis_points?: number;
  amounts?: Record<string, number>;
  max_redemptions: number | null;
  redemptions_count: number;
};

export type CreatePolarDiscountInput = {
  name: string;
  code: string;
  type: PolarDiscountType;
  duration: PolarDiscountDuration;
  duration_in_months?: number;
  basis_points?: number;
  amount_cents?: number;
  currency?: string;
  max_redemptions?: number;
};

function polarBaseUrl(): string {
  return process.env.POLAR_API_BASE?.replace(/\/$/, "") || "https://api.polar.sh";
}

function polarToken(): string {
  const token = process.env.POLAR_ACCESS_TOKEN;
  if (!token) throw new Error("Missing POLAR_ACCESS_TOKEN");
  return token;
}

async function polarFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${polarBaseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${polarToken()}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Polar ${init?.method ?? "GET"} ${path}: ${res.status} ${body}`);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Alphanumeric only (Polar requirement), 12 chars. */
export function generateCouponCode(length = 12): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[bytes[i]! % alphabet.length];
  }
  return out;
}

export async function createPolarDiscount(
  input: CreatePolarDiscountInput,
): Promise<PolarDiscount> {
  const body: Record<string, unknown> = {
    name: input.name,
    code: input.code,
    type: input.type,
    duration: input.duration,
    max_redemptions: input.max_redemptions ?? 1,
  };

  if (input.duration === "repeating") {
    if (!input.duration_in_months) {
      throw new Error("duration_in_months required when duration is repeating");
    }
    body.duration_in_months = input.duration_in_months;
  }

  if (input.type === "percentage") {
    if (input.basis_points == null) {
      throw new Error("basis_points required for percentage discount");
    }
    body.basis_points = input.basis_points;
  } else {
    if (input.amount_cents == null) {
      throw new Error("amount_cents required for fixed discount");
    }
    const currency = (input.currency ?? "usd").toLowerCase();
    body.amounts = { [currency]: input.amount_cents };
  }

  return polarFetch<PolarDiscount>("/v1/discounts/", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getPolarDiscount(id: string): Promise<PolarDiscount> {
  return polarFetch<PolarDiscount>(`/v1/discounts/${id}`);
}

export async function deletePolarDiscount(id: string): Promise<void> {
  await polarFetch<void>(`/v1/discounts/${id}`, { method: "DELETE" });
}
