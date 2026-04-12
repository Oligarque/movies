import type { Request } from "express";

const FIVE_MINUTES_MS = 5 * 60 * 1000;
const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

type AttemptRecord = {
  windowStartAt: number;
  failedCount: number;
  blockedUntilAt: number;
};

const attemptsByKey = new Map<string, AttemptRecord>();

function getClientKey(req: Request): string {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.trim() !== "") {
    return forwardedFor.split(",")[0]?.trim() ?? req.ip ?? "unknown";
  }

  return req.ip ?? "unknown";
}

function getOrCreateRecord(key: string): AttemptRecord {
  const now = Date.now();
  const existing = attemptsByKey.get(key);

  if (!existing) {
    const created: AttemptRecord = {
      windowStartAt: now,
      failedCount: 0,
      blockedUntilAt: 0,
    };
    attemptsByKey.set(key, created);
    return created;
  }

  // Reset rolling failure window after 5 minutes when not blocked.
  if (existing.blockedUntilAt <= now && now - existing.windowStartAt > FIVE_MINUTES_MS) {
    existing.windowStartAt = now;
    existing.failedCount = 0;
  }

  return existing;
}

export function getLoginBlockStatus(req: Request): {
  blocked: boolean;
  retryAfterSeconds: number;
} {
  const key = getClientKey(req);
  const record = getOrCreateRecord(key);
  const now = Date.now();

  if (record.blockedUntilAt > now) {
    return {
      blocked: true,
      retryAfterSeconds: Math.ceil((record.blockedUntilAt - now) / 1000),
    };
  }

  return { blocked: false, retryAfterSeconds: 0 };
}

export function registerFailedLoginAttempt(req: Request): {
  blocked: boolean;
  retryAfterSeconds: number;
  remainingAttempts: number;
} {
  const key = getClientKey(req);
  const record = getOrCreateRecord(key);
  const now = Date.now();

  if (record.blockedUntilAt > now) {
    return {
      blocked: true,
      retryAfterSeconds: Math.ceil((record.blockedUntilAt - now) / 1000),
      remainingAttempts: 0,
    };
  }

  if (now - record.windowStartAt > FIVE_MINUTES_MS) {
    record.windowStartAt = now;
    record.failedCount = 0;
  }

  record.failedCount += 1;

  if (record.failedCount >= 5) {
    record.blockedUntilAt = now + TWELVE_HOURS_MS;
    return {
      blocked: true,
      retryAfterSeconds: Math.ceil(TWELVE_HOURS_MS / 1000),
      remainingAttempts: 0,
    };
  }

  return {
    blocked: false,
    retryAfterSeconds: 0,
    remainingAttempts: Math.max(0, 5 - record.failedCount),
  };
}

export function clearFailedLoginAttempts(req: Request): void {
  const key = getClientKey(req);
  attemptsByKey.delete(key);
}
