import axios from "axios";
import { api } from "@/shared/lib/axios";
import type {
  CouponsListResponse,
  CreateCouponsInput,
  IssueCouponInput,
  PolarCoupon,
} from "./types";

function rethrow(err: unknown): never {
  if (axios.isAxiosError(err)) {
    const msg = (err.response?.data as { error?: string } | undefined)?.error;
    if (msg) throw new Error(msg);
  }
  throw err;
}

export async function fetchCoupons(): Promise<CouponsListResponse> {
  try {
    const { data } = await api.get<CouponsListResponse>("/coupons");
    return data;
  } catch (err) {
    rethrow(err);
  }
}

export async function createCoupons(
  body: CreateCouponsInput,
): Promise<PolarCoupon[]> {
  try {
    const { data } = await api.post<PolarCoupon[]>("/coupons", body);
    return data;
  } catch (err) {
    rethrow(err);
  }
}

export async function issueCoupon(
  body: IssueCouponInput = {},
): Promise<PolarCoupon> {
  try {
    const { data } = await api.post<PolarCoupon>("/coupons/issue", body);
    return data;
  } catch (err) {
    rethrow(err);
  }
}

export async function disableCoupon(id: string): Promise<PolarCoupon> {
  try {
    const { data } = await api.patch<PolarCoupon>(`/coupons/${id}`, {
      action: "disable",
    });
    return data;
  } catch (err) {
    rethrow(err);
  }
}
