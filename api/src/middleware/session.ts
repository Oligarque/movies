import { PrismaClient } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import { sendApiError } from "../lib/api-errors.js";
import { getSessionExpiry, isSessionExpired, SESSION_DURATION_MS } from "../utils/session.js";

const prisma = new PrismaClient();

const cookieDomain = process.env.COOKIE_DOMAIN?.trim();

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  // Lax is enough for same-site subdomains and avoids strict-cookie edge cases.
  sameSite: "lax" as const,
  maxAge: SESSION_DURATION_MS,
  // Must match auth controller cookie path for clearCookie/refresh to work reliably.
  path: "/",
  ...(cookieDomain ? { domain: cookieDomain } : {}),
};

export async function sessionLoader(req: Request, res: Response, next: NextFunction) {
  const sessionId = req.cookies?.sessionId;

  if (!sessionId) {
    next();
    return;
  }

  try {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      res.clearCookie("sessionId", cookieOptions);
      next();
      return;
    }

    if (isSessionExpired(session.expiresAt)) {
      await prisma.session.delete({ where: { id: sessionId } });
      res.clearCookie("sessionId", cookieOptions);
      next();
      return;
    }

    const refreshedSession = await prisma.session.update({
      where: { id: sessionId },
      data: {
        expiresAt: getSessionExpiry(),
        lastActivityAt: new Date(),
      },
    });

    req.session = refreshedSession;
    res.cookie("sessionId", sessionId, cookieOptions);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Session loader error:", error);
  }

  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session) {
    sendApiError(res, 401, { code: "NOT_AUTHENTICATED", message: "Not authenticated" });
    return;
  }

  next();
}
