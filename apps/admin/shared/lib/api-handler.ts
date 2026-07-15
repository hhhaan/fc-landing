import { NextResponse } from "next/server";

export async function jsonOk<T>(fn: () => Promise<T>) {
  try {
    const data = await fn();
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[api]", message, err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
