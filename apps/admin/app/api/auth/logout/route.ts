import { NextResponse } from "next/server";
import { sessionCookieName } from "@/shared/lib/auth/session";

export async function POST(request: Request) {
  const res = NextResponse.redirect(new URL("/login", request.url));
  res.cookies.set(sessionCookieName(), "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return res;
}
