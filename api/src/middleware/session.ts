import { PrismaClient } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import { getSessionExpiry, isSessionExpired, SESSION_DURATION_MS } from "../utils/session.js";

const prisma = new PrismaClient();

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge: SESSION_DURATION_MS,
  path: "/api",
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
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  next();
}
