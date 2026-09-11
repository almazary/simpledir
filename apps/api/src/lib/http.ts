import { NextResponse } from "next/server";
import { getCorsOrigin } from "./env";

export function corsHeaders(origin?: string | null): HeadersInit {
  const allowed = getCorsOrigin();
  const value =
    allowed === "*"
      ? "*"
      : origin && allowed.split(",").map((s) => s.trim()).includes(origin)
        ? origin
        : allowed.split(",")[0]?.trim() ?? "*";

  return {
    "Access-Control-Allow-Origin": value,
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

export function json<T>(
  data: T,
  init?: { status?: number; origin?: string | null },
) {
  return NextResponse.json(data, {
    status: init?.status ?? 200,
    headers: corsHeaders(init?.origin),
  });
}

export function error(
  message: string,
  status = 400,
  origin?: string | null,
  extra?: Record<string, unknown>,
) {
  return json({ error: message, ...extra }, { status, origin });
}

export function optionsResponse(origin?: string | null) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
}

export async function readJson<T>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}
