import { NextResponse } from "next/server";
import {
  checkPassword,
  sessionCookieName,
  signSessionToken,
} from "@/shared/lib/auth/session";

export async function POST(request: Request) {
  const form = await request.formData();
  const password = String(form.get("password") ?? "");
  const next = String(form.get("next") ?? "/");

  if (!checkPassword(password)) {
    const url = new URL("/login", request.url);
    url.searchParams.set("error", "1");
    if (next) url.searchParams.set("next", next);
    return NextResponse.redirect(url);
  }

  const res = NextResponse.redirect(new URL(next || "/", request.url));
  res.cookies.set(sessionCookieName(), signSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
  return res;
}
