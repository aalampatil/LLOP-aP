import type { Request } from "express";
import { HttpError } from "../../lib/http";

const anonymousSubmitAttempts = new Map<string, number[]>();

export function stringParam(value: string | string[] | undefined, name: string) {
  if (Array.isArray(value)) return value[0] ?? "";
  if (value) return value;
  throw new HttpError(400, `${name} is required`);
}

export function csvCell(value: unknown) {
  const text =
    value instanceof Date
      ? value.toISOString()
      : value === null || value === undefined
        ? ""
        : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function getClientIp(req: Request) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0]?.trim() || req.ip;
  return req.ip;
}

export function assertAnonymousRateLimit(req: Request, pollId: string) {
  const key = `${pollId}:${getClientIp(req)}`;
  const now = Date.now();
  const windowMs = 60_000;
  const maxAttempts = 5;
  const attempts = (anonymousSubmitAttempts.get(key) ?? []).filter(
    (timestamp) => now - timestamp < windowMs,
  );

  if (attempts.length >= maxAttempts) {
    throw new HttpError(429, "Too many submissions. Please try again in a minute.");
  }

  attempts.push(now);
  anonymousSubmitAttempts.set(key, attempts);
}
