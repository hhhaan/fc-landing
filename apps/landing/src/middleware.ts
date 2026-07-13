import { defineMiddleware } from "astro:middleware";

/** Auth-aware pages must not be cached at the edge without cookies. */
export const onRequest = defineMiddleware(async (_context, next) => {
  const response = await next();
  const type = response.headers.get("content-type") ?? "";

  if (type.includes("text/html")) {
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
  }

  return response;
});